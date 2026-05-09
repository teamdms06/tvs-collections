package com.tvscollections.backend.dto;

import java.time.LocalDateTime;

public class UserDashboardDto {
    public String name;
    public String username;
    public LocalDateTime loginTime;
    public LocalDateTime lastSeenAt;
    public Long todayWorkingMinutes;
    public Long todayCallAttempts;
    public Long monthlyCallAttempts;
    public LocalDateTime generatedAt;

    public UserDashboardDto(String name,
                            String username,
                            LocalDateTime loginTime,
                            LocalDateTime lastSeenAt,
                            Long todayWorkingMinutes,
                            Long todayCallAttempts,
                            Long monthlyCallAttempts,
                            LocalDateTime generatedAt) {
        this.name = name;
        this.username = username;
        this.loginTime = loginTime;
        this.lastSeenAt = lastSeenAt;
        this.todayWorkingMinutes = todayWorkingMinutes;
        this.todayCallAttempts = todayCallAttempts;
        this.monthlyCallAttempts = monthlyCallAttempts;
        this.generatedAt = generatedAt;
    }
}
