package com.tvscollections.backend.dto;

import java.util.List;

public class AuthLoginResponse {
    public String accessToken;
    public String tokenType = "Bearer";
    public Long userId;
    public String name;
    public String email;
    public String username;
    public String dialerUser;
    public List<String> roles;
    public List<String> accessProducts;

    public AuthLoginResponse(String accessToken, Long userId, String name, String email, String username, String dialerUser, List<String> roles, List<String> accessProducts) {
        this.accessToken = accessToken;
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.username = username;
        this.dialerUser = dialerUser;
        this.roles = roles;
        this.accessProducts = accessProducts;
    }
}
