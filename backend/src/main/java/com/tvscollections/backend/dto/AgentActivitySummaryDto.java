package com.tvscollections.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class AgentActivitySummaryDto {
    public Long userId;
    public String name;
    public String username;
    public LocalDate activityDate;
    public LocalDateTime firstLoginAt;
    public LocalDateTime lastLogoutAt;
    public LocalDateTime lastActivityAt;
    public Boolean active;
    public Long totalWorkMinutes;
    public Long totalIdleMinutes;
    public Long spanMinutes;
    public Integer punchCount;
    public List<AgentActivityPunchDto> punches;

    public AgentActivitySummaryDto(Long userId,
                                   String name,
                                   String username,
                                   LocalDate activityDate,
                                   LocalDateTime firstLoginAt,
                                   LocalDateTime lastLogoutAt,
                                   LocalDateTime lastActivityAt,
                                   Boolean active,
                                   Long totalWorkMinutes,
                                   Long totalIdleMinutes,
                                   Long spanMinutes,
                                   Integer punchCount,
                                   List<AgentActivityPunchDto> punches) {
        this.userId = userId;
        this.name = name;
        this.username = username;
        this.activityDate = activityDate;
        this.firstLoginAt = firstLoginAt;
        this.lastLogoutAt = lastLogoutAt;
        this.lastActivityAt = lastActivityAt;
        this.active = active;
        this.totalWorkMinutes = totalWorkMinutes;
        this.totalIdleMinutes = totalIdleMinutes;
        this.spanMinutes = spanMinutes;
        this.punchCount = punchCount;
        this.punches = punches;
    }
}
