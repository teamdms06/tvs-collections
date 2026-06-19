package com.tvscollections.backend.dto;

import java.time.LocalDateTime;

public class HitCallLogDto {
    public Long id;
    public Long agentId;
    public String agentName;
    public String agentUsername;
    public String agentDialerUser;
    public Long recordedByUserId;
    public String recordedByName;
    public LocalDateTime observedAt;
    public String campaignId;
    public String caller;
    public String callId;
    public String selectedAgentUser;
    public String selectedAgentName;
    public String selectedAgentStatus;
    public String selectedAgentSessionId;
    public String selectedAgentLeadId;
    public Long selectedAgentReadySeconds;
    public Integer selectedAgentCallsToday;
    public Integer readyAgentCount;
    public String selectionRule;
    public String callPayloadJson;
    public String readyAgentsJson;
    public String selectedAgentDetailJson;
    public LocalDateTime createdAt;
    public AgentCallLogDto agentCall;
}
