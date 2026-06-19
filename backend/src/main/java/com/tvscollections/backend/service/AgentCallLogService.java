package com.tvscollections.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tvscollections.backend.dto.AgentCallLogDto;
import com.tvscollections.backend.dto.AgentCallLogRequestDto;
import com.tvscollections.backend.model.AgentCallLog;
import com.tvscollections.backend.model.HitCallLog;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.repository.AgentCallLogRepository;
import com.tvscollections.backend.repository.HitCallLogRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.ZoneId;

@Service
public class AgentCallLogService {
    private final AgentCallLogRepository agentCallLogRepository;
    private final HitCallLogRepository hitCallLogRepository;
    private final ObjectMapper objectMapper;

    public AgentCallLogService(AgentCallLogRepository agentCallLogRepository,
                               HitCallLogRepository hitCallLogRepository,
                               ObjectMapper objectMapper) {
        this.agentCallLogRepository = agentCallLogRepository;
        this.hitCallLogRepository = hitCallLogRepository;
        this.objectMapper = objectMapper;
    }

    public AgentCallLogDto createLog(AgentCallLogRequestDto request, User agent) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing agent call details");
        }

        AgentCallLog existingLog = findExistingLog(request);
        if (existingLog != null) {
            return toDto(existingLog);
        }

        AgentCallLog log = new AgentCallLog();
        log.hitCallLog = findOrCreateHitCallLog(request);
        log.agent = agent;
        log.observedAt = parseObservedAt(request.observedAt);
        log.agentUser = firstText(request.agentUser, agent == null ? null : agent.dialerUser);
        log.agentName = firstText(request.agentName, agent == null ? null : agent.name);
        log.status = trimToNull(request.status);
        log.callerId = trimToNull(request.callerId);
        log.leadId = trimToNull(request.leadId);
        log.campaignId = trimToNull(request.campaignId);
        log.callsToday = request.callsToday;
        log.phoneNumber = trimToNull(request.phoneNumber);
        log.vendorLeadCode = trimToNull(request.vendorLeadCode);
        log.sessionId = trimToNull(request.sessionId);
        log.agentDetailJson = sanitizeAgentDetailJson(request.agentDetailJson);

        if (!hasRealCallData(log)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent call detail is not a picked call");
        }

        return toDto(agentCallLogRepository.save(log));
    }

    public AgentCallLogDto toDto(AgentCallLog log) {
        AgentCallLogDto dto = new AgentCallLogDto();
        dto.id = log.id;
        dto.hitCallLogId = log.hitCallLog == null ? null : log.hitCallLog.id;
        dto.observedAt = log.observedAt;
        dto.agentUser = log.agentUser;
        dto.agentName = log.agentName;
        dto.status = log.status;
        dto.callerId = log.callerId;
        dto.leadId = log.leadId;
        dto.campaignId = log.campaignId;
        dto.callsToday = log.callsToday;
        dto.phoneNumber = log.phoneNumber;
        dto.vendorLeadCode = log.vendorLeadCode;
        dto.sessionId = log.sessionId;
        dto.agentDetailJson = log.agentDetailJson;
        dto.createdAt = log.createdAt;

        if (log.agent != null) {
            dto.agentId = log.agent.id;
            dto.appAgentName = log.agent.name;
        }

        return dto;
    }

    private AgentCallLog existingBySession(String sessionId) {
        if (!StringUtils.hasText(sessionId)) {
            return null;
        }

        return agentCallLogRepository.findTopBySessionIdOrderByObservedAtDesc(sessionId.trim()).orElse(null);
    }

    private AgentCallLog findExistingLog(AgentCallLogRequestDto request) {
        AgentCallLog bySession = existingBySession(request.sessionId);
        if (bySession != null) {
            return bySession;
        }

        if (request.hitCallLogId == null) {
            return null;
        }

        return agentCallLogRepository.findTopByHitCallLogIdOrderByObservedAtDesc(request.hitCallLogId).orElse(null);
    }

    private HitCallLog findHitCallLog(Long hitCallLogId) {
        if (hitCallLogId == null) {
            return null;
        }

        return hitCallLogRepository.findById(hitCallLogId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hit call log not found"));
    }

    private HitCallLog findOrCreateHitCallLog(AgentCallLogRequestDto request) {
        HitCallLog hitCallLog = findHitCallLog(request.hitCallLogId);
        if (hitCallLog != null) {
            return hitCallLog;
        }

        String campaignId = trimToNull(request.campaignId);
        String caller = trimToNull(request.phoneNumber);
        java.time.LocalDateTime observedAt = parseObservedAt(request.observedAt);

        if (StringUtils.hasText(campaignId) && StringUtils.hasText(caller) && observedAt != null) {
            var existingHitCall = hitCallLogRepository
                    .findTopByCampaignIdAndCallerAndObservedAtOrderByIdAsc(campaignId, caller, observedAt);

            if (existingHitCall.isPresent()) {
                return existingHitCall.get();
            }
        }

        if (!StringUtils.hasText(campaignId) || !StringUtils.hasText(caller)) {
            return null;
        }

        HitCallLog fallbackHitCall = new HitCallLog();
        fallbackHitCall.observedAt = observedAt;
        fallbackHitCall.campaignId = campaignId;
        fallbackHitCall.caller = caller;
        fallbackHitCall.callId = trimToNull(request.leadId);
        fallbackHitCall.callPayloadJson = buildFallbackHitCallPayload(request);

        return hitCallLogRepository.save(fallbackHitCall);
    }

    private boolean hasRealCallData(AgentCallLog log) {
        String status = String.valueOf(log.status == null ? "" : log.status).trim();
        boolean hasLead = StringUtils.hasText(log.leadId) && !"0".equals(log.leadId);
        boolean hasCallValue = StringUtils.hasText(log.callerId)
                || StringUtils.hasText(log.phoneNumber)
                || StringUtils.hasText(log.vendorLeadCode);

        return !"READY".equalsIgnoreCase(status) && (hasLead || hasCallValue);
    }

    private java.time.LocalDateTime parseObservedAt(String observedAt) {
        if (!StringUtils.hasText(observedAt)) {
            return null;
        }

        try {
            return OffsetDateTime.parse(observedAt.trim())
                    .atZoneSameInstant(ZoneId.systemDefault())
                    .toLocalDateTime();
        } catch (Exception error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "observedAt must be an ISO timestamp", error);
        }
    }

    private String sanitizeAgentDetailJson(String value) {
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

    private String buildFallbackHitCallPayload(AgentCallLogRequestDto request) {
        try {
            return objectMapper.writeValueAsString(request);
        } catch (Exception error) {
            return null;
        }
    }

    private String firstText(String first, String fallback) {
        return StringUtils.hasText(first) ? first.trim() : trimToNull(fallback);
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return value.trim();
    }
}
