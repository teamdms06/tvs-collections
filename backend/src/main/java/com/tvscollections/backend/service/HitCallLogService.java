package com.tvscollections.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tvscollections.backend.dto.HitCallLogDto;
import com.tvscollections.backend.dto.HitCallLogRequestDto;
import com.tvscollections.backend.model.AgentCallLog;
import com.tvscollections.backend.model.HitCallLog;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.repository.AgentCallLogRepository;
import com.tvscollections.backend.repository.HitCallLogRepository;
import com.tvscollections.backend.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class HitCallLogService {
    private static final int MAX_LIMIT = 5000;
    private final HitCallLogRepository hitCallLogRepository;
    private final AgentCallLogRepository agentCallLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final AgentCallLogService agentCallLogService;

    public HitCallLogService(HitCallLogRepository hitCallLogRepository,
                             AgentCallLogRepository agentCallLogRepository,
                             UserRepository userRepository,
                             ObjectMapper objectMapper,
                             AgentCallLogService agentCallLogService) {
        this.hitCallLogRepository = hitCallLogRepository;
        this.agentCallLogRepository = agentCallLogRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.agentCallLogService = agentCallLogService;
    }

    public HitCallLogDto createLog(HitCallLogRequestDto request, User recordedBy) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing hit call details");
        }

        HitCallLog log = new HitCallLog();
        log.recordedBy = recordedBy;
        log.observedAt = parseObservedAt(request.observedAt);
        log.campaignId = trimToNull(request.campaignId);
        log.caller = trimToNull(request.caller);
        log.callId = trimToNull(request.callId);
        log.selectedAgentUser = trimToNull(request.selectedAgentUser);
        log.selectedAgentName = trimToNull(request.selectedAgentName);
        log.selectedAgentStatus = trimToNull(request.selectedAgentStatus);
        log.selectedAgentSessionId = trimToNull(request.selectedAgentSessionId);
        log.selectedAgentLeadId = trimToNull(request.selectedAgentLeadId);
        log.selectedAgentCallsToday = request.selectedAgentCallsToday;
        log.callPayloadJson = trimToNull(request.callPayloadJson);
        log.selectedAgentDetailJson = sanitizeSelectedAgentDetailJson(request.selectedAgentDetailJson);

        if (!StringUtils.hasText(log.selectedAgentDetailJson)) {
            log.selectedAgentStatus = null;
            log.selectedAgentSessionId = null;
            log.selectedAgentLeadId = null;
            log.selectedAgentCallsToday = null;
        }
        // Deduplication checks disabled to ensure every hit call is saved as a new record.


        if (StringUtils.hasText(log.selectedAgentUser)) {
            log.agent = userRepository.findByDialerUserIgnoreCase(log.selectedAgentUser.trim()).orElse(null);
        }

        return toDto(hitCallLogRepository.save(log));
    }

    public List<HitCallLogDto> getLogs(Integer limit) {
        int normalizedLimit = Math.min(Math.max(limit == null ? 200 : limit, 1), MAX_LIMIT);
        List<HitCallLog> logs = hitCallLogRepository.findAllByOrderByObservedAtDesc(PageRequest.of(0, normalizedLimit));
        Map<Long, AgentCallLog> agentCallsByHitId = latestAgentCallsByHitId(logs);

        return logs.stream()
                .map(log -> toDto(log, agentCallsByHitId.get(log.id)))
                .toList();
    }

    private java.time.LocalDateTime parseObservedAt(String observedAt) {
        if (!StringUtils.hasText(observedAt)) {
            return null;
        }

        String trimmed = observedAt.trim();
        try {
            return OffsetDateTime.parse(trimmed)
                    .atZoneSameInstant(ZoneId.systemDefault())
                    .toLocalDateTime();
        } catch (Exception e1) {
            try {
                return java.time.LocalDateTime.parse(trimmed.replace(" ", "T"));
            } catch (Exception e2) {
                try {
                    java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                    return java.time.LocalDateTime.parse(trimmed, formatter);
                } catch (Exception e3) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "observedAt must be a valid timestamp (ISO OffsetDateTime or yyyy-MM-dd HH:mm:ss)", e3);
                }
            }
        }
    }

    private HitCallLogDto toDto(HitCallLog log) {
        return toDto(log, null);
    }

    private HitCallLogDto toDto(HitCallLog log, AgentCallLog agentCallLog) {
        HitCallLogDto dto = new HitCallLogDto();
        dto.id = log.id;
        dto.observedAt = log.observedAt;
        dto.campaignId = log.campaignId;
        dto.caller = log.caller;
        dto.callId = log.callId;
        dto.selectedAgentUser = log.selectedAgentUser;
        dto.selectedAgentName = log.selectedAgentName;
        dto.selectedAgentStatus = log.selectedAgentStatus;
        dto.selectedAgentSessionId = log.selectedAgentSessionId;
        dto.selectedAgentLeadId = log.selectedAgentLeadId;
        dto.selectedAgentCallsToday = log.selectedAgentCallsToday;
        dto.callPayloadJson = log.callPayloadJson;
        dto.selectedAgentDetailJson = log.selectedAgentDetailJson;
        dto.createdAt = log.createdAt;

        if (log.agent != null) {
            dto.agentId = log.agent.id;
            dto.agentName = log.agent.name;
            dto.agentUsername = log.agent.username;
            dto.agentDialerUser = log.agent.dialerUser;
        }

        if (log.recordedBy != null) {
            dto.recordedByUserId = log.recordedBy.id;
            dto.recordedByName = log.recordedBy.name;
        }

        if (agentCallLog != null) {
            dto.agentCall = agentCallLogService.toDto(agentCallLog);
        }

        return dto;
    }

    private Map<Long, AgentCallLog> latestAgentCallsByHitId(List<HitCallLog> logs) {
        List<Long> ids = logs.stream()
                .map(log -> log.id)
                .filter(Objects::nonNull)
                .toList();
        Map<Long, AgentCallLog> byHitId = new LinkedHashMap<>();

        if (ids.isEmpty()) {
            return byHitId;
        }

        for (AgentCallLog agentCallLog : agentCallLogRepository.findByHitCallLogIdInOrderByObservedAtDesc(ids)) {
            if (agentCallLog.hitCallLog != null && agentCallLog.hitCallLog.id != null) {
                byHitId.putIfAbsent(agentCallLog.hitCallLog.id, agentCallLog);
            }
        }

        return byHitId;
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return value.trim();
    }

    private String sanitizeSelectedAgentDetailJson(String value) {
        String trimmedValue = trimToNull(value);
        if (!StringUtils.hasText(trimmedValue)) {
            return null;
        }

        try {
            JsonNode detail = objectMapper.readTree(trimmedValue);
            String status = detail.path("status").asText("").trim();
            String leadId = detail.path("lead_id").asText("").trim();
            boolean hasLead = StringUtils.hasText(leadId) && !"0".equals(leadId);
            boolean hasCallValue = StringUtils.hasText(detail.path("callerid").asText(""))
                    || StringUtils.hasText(detail.path("phone_number").asText(""))
                    || StringUtils.hasText(detail.path("vendor_lead_code").asText(""));

            if ("READY".equalsIgnoreCase(status) || (!hasLead && !hasCallValue)) {
                return null;
            }

            return trimmedValue;
        } catch (Exception error) {
            return null;
        }
    }
}
