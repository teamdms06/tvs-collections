package com.tvscollections.backend.repository;

import com.tvscollections.backend.model.RoleProductAccess;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoleProductAccessRepository extends JpaRepository<RoleProductAccess, Long> {
    @EntityGraph(attributePaths = {"product"})
    List<RoleProductAccess> findByRoleId(Long roleId);

    boolean existsByRoleIdAndProductId(Long roleId, Long productId);
}
