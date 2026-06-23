package com.tvscollections.backend.repository;

import com.tvscollections.backend.model.HitCallLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;

public interface HitCallLogRepository extends JpaRepository<HitCallLog, Long> {
    @EntityGraph(attributePaths = {"agent", "recordedBy"})
    List<HitCallLog> findAllByOrderByObservedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"agent", "recordedBy"})
    Optional<HitCallLog> findTopByCampaignIdAndCallerAndObservedAtOrderByIdAsc(
            String campaignId,
            String caller,
            LocalDateTime observedAt
    );

    @EntityGraph(attributePaths = {"agent", "recordedBy"})
    Optional<HitCallLog> findByCallId(String callId);
}
