package com.tvscollections.backend.dto;

import java.time.LocalDateTime;

public class AgentCallLogDto {
    public Long id;
    public Long hitCallLogId;
    public Long agentId;
    public String agentUser;
    public String agentName;
    public String appAgentName;
    public String status;
    public String callerId;
    public String leadId;
    public String campaignId;
    public Integer callsToday;
    public String phoneNumber;
    public String vendorLeadCode;
    public String sessionId;
    public String agentDetailJson;
    public LocalDateTime observedAt;
    public LocalDateTime createdAt;
}
