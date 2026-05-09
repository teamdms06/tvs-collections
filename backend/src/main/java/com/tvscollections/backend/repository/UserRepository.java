package com.tvscollections.backend.repository;

import com.tvscollections.backend.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);

    @Query("""
            select count(distinct u)
            from User u
            where not exists (
                select userRole
                from UserRole userRole
                where userRole.user = u
                    and lower(userRole.role.name) = 'admin'
            )
            """)
    Long countNotAdminRole();

    @Query("""
            select count(distinct u)
            from User u
            where u.isActive = true
                and not exists (
                    select userRole
                    from UserRole userRole
                    where userRole.user = u
                        and lower(userRole.role.name) = 'admin'
                )
            """)
    Long countByIsActiveTrueNotAdminRole();

    @Query("""
            select count(u) > 0
            from User u
            where lower(u.username) = lower(:username)
                and exists (
                    select userRole
                    from UserRole userRole
                    where userRole.user = u
                        and lower(userRole.role.name) = 'admin'
                )
            """)
    Boolean hasAdminRoleByUsername(@Param("username") String username);

    @EntityGraph(attributePaths = {
            "userRoles",
            "userRoles.role"
    })
    @Query("select u from User u where u.username = :username")
    Optional<User> findWithAccessByUsername(@Param("username") String username);

    @EntityGraph(attributePaths = {
            "userRoles",
            "userRoles.role"
    })
    @Query("""
            select distinct u
            from User u
            where not exists (
                select userRole
                from UserRole userRole
                where userRole.user = u
                    and lower(userRole.role.name) = 'admin'
            )
            order by u.createdAt desc
            """)
    List<User> findAllNonAdminWithRoles();

    @EntityGraph(attributePaths = {
            "userRoles",
            "userRoles.role"
    })
    @Query("select u from User u where u.id = :id")
    Optional<User> findByIdWithRoles(@Param("id") Long id);
}
