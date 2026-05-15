package com.tvscollections.backend.dto;

import java.time.LocalDateTime;

public class UserDashboardDto {
    public String name;
    public String username;
    public LocalDateTime loginTime;
    public LocalDateTime lastSeenAt;
    public LocalDateTime logoutTime;
    public Long todayWorkingMinutes;
    public Long todayIdleMinutes;
    public Long totalSpanMinutes;
    public Long todayCallAttempts;
    public Long monthlyCallAttempts;
    public LocalDateTime generatedAt;
    public AgentActivitySummaryDto activity;

    public UserDashboardDto(String name,
                            String username,
                            LocalDateTime loginTime,
                            LocalDateTime lastSeenAt,
                            LocalDateTime logoutTime,
                            Long todayWorkingMinutes,
                            Long todayIdleMinutes,
                            Long totalSpanMinutes,
                            Long todayCallAttempts,
                            Long monthlyCallAttempts,
                            LocalDateTime generatedAt,
                            AgentActivitySummaryDto activity) {
        this.name = name;
        this.username = username;
        this.loginTime = loginTime;
        this.lastSeenAt = lastSeenAt;
        this.logoutTime = logoutTime;
        this.todayWorkingMinutes = todayWorkingMinutes;
        this.todayIdleMinutes = todayIdleMinutes;
        this.totalSpanMinutes = totalSpanMinutes;
        this.todayCallAttempts = todayCallAttempts;
        this.monthlyCallAttempts = monthlyCallAttempts;
        this.generatedAt = generatedAt;
        this.activity = activity;
    }
}
