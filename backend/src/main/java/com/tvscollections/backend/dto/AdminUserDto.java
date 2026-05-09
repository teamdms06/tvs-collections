package com.tvscollections.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public class AdminUserDto {
    public Long id;
    public String name;
    public String username;
    public String email;
    public Boolean isActive;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;
    public List<String> roles;
    public List<String> accessProducts;

    public AdminUserDto(Long id,
                        String name,
                        String username,
                        String email,
                        Boolean isActive,
                        LocalDateTime createdAt,
                        LocalDateTime updatedAt,
                        List<String> roles,
                        List<String> accessProducts) {
        this.id = id;
        this.name = name;
        this.username = username;
        this.email = email;
        this.isActive = isActive;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.roles = roles;
        this.accessProducts = accessProducts;
    }
}
