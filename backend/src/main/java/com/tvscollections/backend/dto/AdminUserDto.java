package com.tvscollections.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public class AdminUserDto {
    public Long id;
    public String name;
    public String username;
    public String dialerUser;
    public String email;
    public Boolean isActive;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;
    public List<String> roles;
    public List<String> accessProducts;

    public AdminUserDto(Long id,
                        String name,
                        String username,
                        String dialerUser,
                        String email,
                        Boolean isActive,
                        LocalDateTime createdAt,
                        LocalDateTime updatedAt,
                        List<String> roles,
                        List<String> accessProducts) {
        this.id = id;
        this.name = name;
        this.username = username;
        this.dialerUser = dialerUser;
        this.email = email;
        this.isActive = isActive;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.roles = roles;
        this.accessProducts = accessProducts;
    }
}
