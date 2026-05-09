package com.tvscollections.backend.repository;

import com.tvscollections.backend.dto.FeedbackHistoryDto;
import com.tvscollections.backend.model.Feedback;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByUploadFileDataIdOrderByCreatedAtDesc(Long uploadFileDataId);
    Long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(LocalDateTime start, LocalDateTime end);

    @Query("""
            SELECT COUNT(f)
            FROM Feedback f
            WHERE f.agent.id = :agentId
              AND f.createdAt >= :start
              AND f.createdAt < :end
            """)
    Long countByAgentIdAndCreatedAtBetween(@Param("agentId") Long agentId,
                                           @Param("start") LocalDateTime start,
                                           @Param("end") LocalDateTime end);

    @Query("""
            SELECT f
            FROM Feedback f
            JOIN FETCH f.uploadFileData lead
            JOIN FETCH lead.uploadFile uploadFile
            JOIN FETCH lead.product product
            JOIN FETCH f.agent agent
            WHERE f.createdAt >= :start
              AND f.createdAt < :end
            ORDER BY lead.id ASC, f.createdAt DESC, f.id DESC
            """)
    Slice<Feedback> findExportRowsByCreatedAtBetween(@Param("start") LocalDateTime start,
                                                     @Param("end") LocalDateTime end,
                                                     Pageable pageable);

    @Query("""
            SELECT new com.tvscollections.backend.dto.FeedbackHistoryDto(
                f.id,
                f.createdAt,
                f.disposition,
                f.subDisposition,
                f.paymentMode,
                f.ptpAmount,
                f.ptpDate,
                f.callBackDate,
                f.callBackTime,
                f.alternateMobileNumber,
                f.remark
            )
            FROM Feedback f
            WHERE f.uploadFileData.id = :uploadFileDataId
            ORDER BY f.createdAt DESC
            """)
    List<FeedbackHistoryDto> findHistoryByUploadFileDataId(@Param("uploadFileDataId") Long uploadFileDataId);
}
