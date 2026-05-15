package com.tvscollections.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "agent_activity_sessions",
        indexes = {
                @Index(name = "idx_agent_activity_user_date", columnList = "user_id, activity_date"),
                @Index(name = "idx_agent_activity_login", columnList = "login_at"),
                @Index(name = "idx_agent_activity_logout", columnList = "logout_at")
        }
)
public class AgentActivitySession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    public User user;

    @Column(name = "activity_date", nullable = false)
    public LocalDate activityDate;

    @Column(name = "login_at", nullable = false)
    public LocalDateTime loginAt;

    @Column(name = "logout_at")
    public LocalDateTime logoutAt;

    @Column(name = "last_activity_at", nullable = false)
    public LocalDateTime lastActivityAt;

    @Column(name = "idle_seconds", nullable = false)
    public Long idleSeconds = 0L;

    public AgentActivitySession() {
    }
}
