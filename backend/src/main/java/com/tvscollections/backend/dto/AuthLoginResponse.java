package com.tvscollections.backend.dto;

import java.util.List;

public class AuthLoginResponse {
    public String accessToken;
    public String tokenType = "Bearer";
    public Long userId;
    public String name;
    public String email;
    public List<String> roles;
    public List<String> accessProducts;

    public AuthLoginResponse(String accessToken, Long userId, String name, String email, List<String> roles, List<String> accessProducts) {
        this.accessToken = accessToken;
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.roles = roles;
        this.accessProducts = accessProducts;
    }
}
