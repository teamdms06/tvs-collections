package com.tvscollections.backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "role_product_access", uniqueConstraints = @UniqueConstraint(name = "uq_role_product", columnNames = {"role_id", "product_id"}))
public class RoleProductAccess {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    public Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    public Product product;

    @Column(name = "created_at", nullable = false)
    public LocalDateTime createdAt;

    public RoleProductAccess() {
    }

    public RoleProductAccess(Role role, Product product) {
        this.role = role;
        this.product = product;
    }

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
