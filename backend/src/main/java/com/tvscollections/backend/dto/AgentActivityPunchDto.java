package com.tvscollections.backend.dto;

import java.time.LocalDateTime;

public class AgentActivityPunchDto {
    public LocalDateTime loginAt;
    public LocalDateTime logoutAt;
    public LocalDateTime lastActivityAt;
    public Long workMinutes;
    public Long idleMinutes;

    public AgentActivityPunchDto(LocalDateTime loginAt,
                                 LocalDateTime logoutAt,
                                 LocalDateTime lastActivityAt,
                                 Long workMinutes,
                                 Long idleMinutes) {
        this.loginAt = loginAt;
        this.logoutAt = logoutAt;
        this.lastActivityAt = lastActivityAt;
        this.workMinutes = workMinutes;
        this.idleMinutes = idleMinutes;
    }
}
