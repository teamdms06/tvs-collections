package com.tvscollections.backend.repository;

import com.tvscollections.backend.model.AgentCallLog;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AgentCallLogRepository extends JpaRepository<AgentCallLog, Long> {
    @EntityGraph(attributePaths = {"hitCallLog", "agent"})
    Optional<AgentCallLog> findTopByHitCallLogIdOrderByObservedAtDesc(Long hitCallLogId);

    @EntityGraph(attributePaths = {"hitCallLog", "agent"})
    List<AgentCallLog> findByHitCallLogIdInOrderByObservedAtDesc(Collection<Long> hitCallLogIds);

    Optional<AgentCallLog> findTopBySessionIdOrderByObservedAtDesc(String sessionId);
}
