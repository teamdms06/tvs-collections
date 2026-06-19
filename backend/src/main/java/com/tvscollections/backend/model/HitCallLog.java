package com.tvscollections.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(
        name = "hit_call_logs",
        indexes = {
                @Index(name = "idx_hit_call_observed_at", columnList = "observed_at"),
                @Index(name = "idx_hit_call_agent_observed", columnList = "agent_id, observed_at"),
                @Index(name = "idx_hit_call_campaign_observed", columnList = "campaign_id, observed_at")
        }
)
public class HitCallLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id")
    @JsonIgnore
    public User agent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by_user_id")
    @JsonIgnore
    public User recordedBy;

    @Column(name = "observed_at", nullable = false)
    public LocalDateTime observedAt;

    @Column(name = "campaign_id", length = 50)
    public String campaignId;

    @Column(name = "caller", length = 80)
    public String caller;

    @Column(name = "call_id", length = 120)
    public String callId;

    @Column(name = "selected_agent_user", length = 100)
    public String selectedAgentUser;

    @Column(name = "selected_agent_name", length = 150)
    public String selectedAgentName;

    @Column(name = "selected_agent_status", length = 50)
    public String selectedAgentStatus;

    @Column(name = "selected_agent_session_id", length = 120)
    public String selectedAgentSessionId;

    @Column(name = "selected_agent_lead_id", length = 120)
    public String selectedAgentLeadId;

    @Column(name = "selected_agent_ready_seconds")
    public Long selectedAgentReadySeconds;

    @Column(name = "selected_agent_calls_today")
    public Integer selectedAgentCallsToday;

    @Column(name = "ready_agent_count")
    public Integer readyAgentCount;

    @Column(name = "selection_rule", length = 500)
    public String selectionRule;

    @Lob
    @Column(name = "call_payload_json", columnDefinition = "TEXT")
    public String callPayloadJson;

    @Lob
    @Column(name = "ready_agents_json", columnDefinition = "TEXT")
    public String readyAgentsJson;

    @Lob
    @Column(name = "selected_agent_detail_json", columnDefinition = "TEXT")
    public String selectedAgentDetailJson;

    @Column(name = "created_at", nullable = false)
    public LocalDateTime createdAt;

    public HitCallLog() {
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
