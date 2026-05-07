package com.tvscollections.backend.repository;

import com.tvscollections.backend.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    @EntityGraph(attributePaths = {
            "userRoles",
            "userRoles.role"
    })
    @Query("select u from User u where u.email = :email")
    Optional<User> findWithAccessByEmail(@Param("email") String email);
}
