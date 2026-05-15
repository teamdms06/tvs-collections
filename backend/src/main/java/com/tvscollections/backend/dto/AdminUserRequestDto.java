package com.tvscollections.backend.dto;

import java.util.List;

public class AdminUserRequestDto {
    public String name;
    public String username;
    public String dialerUser;
    public String email;
    public String password;
    public Boolean isActive;
    public List<String> roles;
    public List<String> accessProducts;
}
