package com.tvscollections.backend.security;

import com.tvscollections.backend.model.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.stream.Collectors;

public class UserPrincipal implements UserDetails {

    private final User user;

    public UserPrincipal(User user) {
        this.user = user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return user.getRoles().stream()
                .filter(role -> role != null && StringUtils.hasText(role.name))
                .map(role -> new SimpleGrantedAuthority(role.name.trim()))
                .collect(Collectors.toList());
    }

    @Override
    public String getPassword() {
        return user.passwordHash;
    }

    @Override
    public String getUsername() {
        return user.email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return Boolean.TRUE.equals(user.isActive);
    }

    public Long getId() {
        return user.id;
    }

    public String getName() {
        return user.name;
    }

    public User getUser() {
        return user;
    }
}
