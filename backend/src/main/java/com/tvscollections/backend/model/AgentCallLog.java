package com.tvscollections.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(
        name = "agent_call_logs",
        indexes = {
                @Index(name = "idx_agent_call_hit", columnList = "hit_call_log_id"),
                @Index(name = "idx_agent_call_agent_observed", columnList = "agent_id, observed_at"),
                @Index(name = "idx_agent_call_session", columnList = "session_id")
        }
)
public class AgentCallLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hit_call_log_id")
    @JsonIgnore
    public HitCallLog hitCallLog;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id")
    @JsonIgnore
    public User agent;

    @Column(name = "observed_at", nullable = false)
    public LocalDateTime observedAt;

    @Column(name = "agent_user", length = 100)
    public String agentUser;

    @Column(name = "agent_name", length = 150)
    public String agentName;

    @Column(name = "status", length = 50)
    public String status;

    @Column(name = "caller_id", length = 120)
    public String callerId;

    @Column(name = "lead_id", length = 120)
    public String leadId;

    @Column(name = "campaign_id", length = 50)
    public String campaignId;

    @Column(name = "calls_today")
    public Integer callsToday;

    @Column(name = "phone_number", length = 80)
    public String phoneNumber;

    @Column(name = "vendor_lead_code", length = 150)
    public String vendorLeadCode;

    @Column(name = "session_id", length = 120)
    public String sessionId;

    @Lob
    @Column(name = "agent_detail_json", columnDefinition = "TEXT")
    public String agentDetailJson;

    @Column(name = "created_at", nullable = false)
    public LocalDateTime createdAt;

    public AgentCallLog() {
    }

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);
        if (observedAt == null) {
            observedAt = now;
        }
        if (createdAt == null) {
            createdAt = now;
        }
    }
}
