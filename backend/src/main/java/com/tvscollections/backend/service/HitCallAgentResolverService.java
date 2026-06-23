package com.tvscollections.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tvscollections.backend.dto.AgentCallLogRequestDto;
import com.tvscollections.backend.dto.HitCallLogDto;
import com.tvscollections.backend.dto.HitCallLogRequestDto;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.repository.HitCallLogRepository;
import com.tvscollections.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class HitCallAgentResolverService {
    private final UserRepository userRepository;
    private final DialerProxyService dialerProxyService;
    private final AgentCallLogService agentCallLogService;
    private final HitCallLogRepository hitCallLogRepository;
    private final ObjectMapper objectMapper;
    private final int attempts;
    private final long retryDelayMs;

    public HitCallAgentResolverService(UserRepository userRepository,
                                       DialerProxyService dialerProxyService,
                                       AgentCallLogService agentCallLogService,
                                       HitCallLogRepository hitCallLogRepository,
                                       ObjectMapper objectMapper,
                                       @Value("${hit-call.agent-resolve-attempts:8}") int attempts,
                                       @Value("${hit-call.agent-resolve-delay-ms:1500}") long retryDelayMs) {
        this.userRepository = userRepository;
        this.dialerProxyService = dialerProxyService;
        this.agentCallLogService = agentCallLogService;
        this.hitCallLogRepository = hitCallLogRepository;
        this.objectMapper = objectMapper;
        this.attempts = Math.max(attempts, 1);
        this.retryDelayMs = Math.max(retryDelayMs, 250);
    }

    public void resolveAgentCallAsync(HitCallLogDto hitCallLog, HitCallLogRequestDto originalRequest) {
        if (hitCallLog == null || hitCallLog.id == null) {
            return;
        }

        String caller = firstText(hitCallLog.caller, originalRequest == null ? null : originalRequest.caller);
        if (!StringUtils.hasText(normalizePhone(caller))) {
            return;
        }

        CompletableFuture.runAsync(() -> resolveWithRetries(hitCallLog, caller));
    }

    private void resolveWithRetries(HitCallLogDto hitCallLog, String caller) {
        for (int attempt = 1; attempt <= attempts; attempt += 1) {
            if (tryResolve(hitCallLog, caller)) {
                return;
            }

            if (attempt < attempts) {
                sleepBeforeRetry();
            }
        }

        System.out.println("Hit call agent resolver did not find a matching picked call for hitCallLogId="
                + hitCallLog.id + ", campaign=" + hitCallLog.campaignId + ", caller=" + caller);
    }

    private boolean tryResolve(HitCallLogDto hitCallLog, String caller) {
        List<User> users = userRepository.findActiveNonAdminDialerUsers();
        String expectedPhone = normalizePhone(caller);

        if (users.isEmpty() || !StringUtils.hasText(expectedPhone)) {
            return false;
        }

        Map<User, String> statusResponses = fetchStatuses(users);

        for (Map.Entry<User, String> entry : statusResponses.entrySet()) {
            User user = entry.getKey();
            Map<String, String> agentStatus = parseAgentStatus(entry.getValue());

            if (!isPickedCallForCaller(agentStatus, expectedPhone)) {
                continue;
            }

            try {
                AgentCallLogRequestDto request = new AgentCallLogRequestDto();
                request.hitCallLogId = hitCallLog.id;
                request.observedAt = OffsetDateTime.now().toString();
                request.agentUser = firstText(agentStatus.get("agent_user"), user.dialerUser);
                request.agentName = firstText(agentStatus.get("full_name"), user.name);
                request.status = agentStatus.get("status");
                request.callerId = agentStatus.get("callerid");
                request.leadId = agentStatus.get("lead_id");
                request.campaignId = firstText(agentStatus.get("campaign_id"), hitCallLog.campaignId);
                request.callsToday = parseInteger(agentStatus.get("calls_today"));
                request.phoneNumber = agentStatus.get("phone_number");
                request.vendorLeadCode = agentStatus.get("vendor_lead_code");
                request.sessionId = agentStatus.get("session_id");
                request.agentDetailJson = objectMapper.writeValueAsString(agentStatus);

                agentCallLogService.createLog(request, user);
                updateHitCallLogWithAgent(hitCallLog.id, user, agentStatus);
                return true;
            } catch (Exception error) {
                System.out.println("Hit call agent resolver failed to save agent call for hitCallLogId="
                        + hitCallLog.id + ", agent=" + user.dialerUser + ": " + error.getMessage());
            }
        }

        return false;
    }

    private Map<User, String> fetchStatuses(List<User> users) {
        List<String> agentUsers = users.stream()
                .map(user -> user.dialerUser)
                .filter(StringUtils::hasText)
                .map(String::trim)
                .toList();
        Map<String, String> responsesByAgentUser;

        try {
            responsesByAgentUser = dialerProxyService.getAgentStatuses(agentUsers);
        } catch (Exception error) {
            System.out.println("Hit call agent resolver could not fetch agent statuses: " + error.getMessage());
            return Map.of();
        }

        Map<User, String> responsesByUser = new LinkedHashMap<>();
        for (User user : users) {
            responsesByUser.put(user, responsesByAgentUser.getOrDefault(user.dialerUser, ""));
        }

        return responsesByUser;
    }

    private boolean isPickedCallForCaller(Map<String, String> agentStatus, String expectedPhone) {
        if (agentStatus.isEmpty()) {
            return false;
        }

        String status = firstText(agentStatus.get("status"), "").toUpperCase();
        if (!StringUtils.hasText(status) || "READY".equals(status)) {
            return false;
        }

        String agentPhone = normalizePhone(agentStatus.get("phone_number"));
        if (!expectedPhone.equals(agentPhone)) {
            return false;
        }

        return StringUtils.hasText(agentStatus.get("callerid"))
                || StringUtils.hasText(agentStatus.get("lead_id"))
                || StringUtils.hasText(agentStatus.get("vendor_lead_code"));
    }

    private Map<String, String> parseAgentStatus(String csvText) {
        String[] lines = String.valueOf(csvText == null ? "" : csvText).split("\\R");
        String headerLine = null;
        String valueLine = null;

        for (String line : lines) {
            String trimmedLine = line.trim();
            if (!StringUtils.hasText(trimmedLine)) {
                continue;
            }

            if (headerLine == null) {
                headerLine = trimmedLine;
            } else {
                valueLine = trimmedLine;
                break;
            }
        }

        if (!StringUtils.hasText(headerLine) || !StringUtils.hasText(valueLine)) {
            return Map.of();
        }

        List<String> headers = splitCsvLine(headerLine);
        List<String> values = splitCsvLine(valueLine);
        Map<String, String> parsed = new LinkedHashMap<>();

        for (int index = 0; index < headers.size(); index += 1) {
            String key = headers.get(index).trim().toLowerCase();
            String value = index < values.size() ? values.get(index).trim() : "";
            if (StringUtils.hasText(key)) {
                parsed.put(key, value);
            }
        }

        return parsed;
    }

    private List<String> splitCsvLine(String line) {
        return java.util.Arrays.stream(String.valueOf(line).split(",", -1))
                .map(String::trim)
                .toList();
    }

    private String normalizePhone(String value) {
        String digits = String.valueOf(value == null ? "" : value).replaceAll("\\D", "");

        if (digits.length() > 10) {
            return digits.substring(digits.length() - 10);
        }

        return digits;
    }

    private Integer parseInteger(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException error) {
            return null;
        }
    }

    private String firstText(String first, String fallback) {
        return StringUtils.hasText(first) ? first.trim() : StringUtils.hasText(fallback) ? fallback.trim() : null;
    }

    private void sleepBeforeRetry() {
        try {
            Thread.sleep(retryDelayMs);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
        }
    }

    private void updateHitCallLogWithAgent(Long hitCallLogId, User user, Map<String, String> agentStatus) {
        try {
            hitCallLogRepository.findById(hitCallLogId).ifPresent(log -> {
                log.agent = user;
                log.selectedAgentUser = user.dialerUser;
                log.selectedAgentName = user.name;
                log.selectedAgentStatus = agentStatus.get("status");
                log.selectedAgentSessionId = agentStatus.get("session_id");
                log.selectedAgentLeadId = agentStatus.get("lead_id");
                log.selectedAgentCallsToday = parseInteger(agentStatus.get("calls_today"));
                try {
                    log.selectedAgentDetailJson = objectMapper.writeValueAsString(agentStatus);
                } catch (Exception jsonError) {
                    // ignore
                }
                hitCallLogRepository.save(log);
            });
        } catch (Exception error) {
            System.out.println("HitCallAgentResolverService failed to update HitCallLog with resolved agent details: " + error.getMessage());
        }
    }
}
