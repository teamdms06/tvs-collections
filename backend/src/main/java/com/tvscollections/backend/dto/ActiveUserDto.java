package com.tvscollections.backend.dto;

import java.time.LocalDateTime;

public class ActiveUserDto {
    public String username;
    public LocalDateTime loginTime;
    public LocalDateTime lastSeenAt;

    public ActiveUserDto(String username, LocalDateTime lastSeenAt) {
        this.username = username;
        this.lastSeenAt = lastSeenAt;
    }

    public ActiveUserDto(String username, LocalDateTime loginTime, LocalDateTime lastSeenAt) {
        this.username = username;
        this.loginTime = loginTime;
        this.lastSeenAt = lastSeenAt;
    }
}
