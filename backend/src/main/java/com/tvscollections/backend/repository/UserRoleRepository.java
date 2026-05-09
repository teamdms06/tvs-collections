package com.tvscollections.backend.repository;

import com.tvscollections.backend.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRoleRepository extends JpaRepository<UserRole, Long> {
    @Modifying
    @Query("delete from UserRole userRole where userRole.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
