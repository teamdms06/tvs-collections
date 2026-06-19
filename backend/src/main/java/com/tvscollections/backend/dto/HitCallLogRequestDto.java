package com.tvscollections.backend.dto;

public class HitCallLogRequestDto {
    public String observedAt;
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
}
