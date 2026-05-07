package com.tvscollections.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "roles")
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false, unique = true, length = 80)
    public String name;

    @Column(name = "created_at", nullable = false)
    public LocalDateTime createdAt;

    @JsonIgnore
    @OneToMany(mappedBy = "role", cascade = CascadeType.ALL, orphanRemoval = true)
    public Set<UserRole> userRoles = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "role", cascade = CascadeType.ALL, orphanRemoval = true)
    public Set<RoleProductAccess> roleProductAccess = new HashSet<>();

    public Role() {
    }

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
