package com.tvscollections.backend.repository;

import com.tvscollections.backend.model.AgentActivitySession;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AgentActivitySessionRepository extends JpaRepository<AgentActivitySession, Long> {
    @EntityGraph(attributePaths = {"user"})
    Optional<AgentActivitySession> findTopByUserIdAndLogoutAtIsNullOrderByLoginAtDesc(Long userId);

    @EntityGraph(attributePaths = {"user"})
    List<AgentActivitySession> findByUserIdAndActivityDateOrderByLoginAtAsc(Long userId, LocalDate activityDate);

    @EntityGraph(attributePaths = {"user"})
    @Query("""
            select session
            from AgentActivitySession session
            join fetch session.user user
            where session.activityDate = :activityDate
                and not exists (
                    select userRole
                    from UserRole userRole
                    where userRole.user = user
                        and lower(userRole.role.name) in ('admin', 'role_admin')
                )
            order by user.name asc, session.loginAt asc
            """)
    List<AgentActivitySession> findNonAdminSessionsByActivityDate(@Param("activityDate") LocalDate activityDate);

    @Query("""
            select count(session)
            from AgentActivitySession session
            where session.user.id = :userId
                and session.logoutAt is null
                and session.loginAt < :before
            """)
    Long countStaleOpenSessions(@Param("userId") Long userId, @Param("before") LocalDateTime before);
}
