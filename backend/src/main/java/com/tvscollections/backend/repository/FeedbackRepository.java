package com.tvscollections.backend.repository;

import com.tvscollections.backend.dto.FeedbackHistoryDto;
import com.tvscollections.backend.dto.ProductCallCountDto;
import com.tvscollections.backend.model.Feedback;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByUploadFileDataIdOrderByCreatedAtDesc(Long uploadFileDataId);
    Long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(LocalDateTime start, LocalDateTime end);

    @Query("""
            SELECT new com.tvscollections.backend.dto.ProductCallCountDto(
                productId.code,
                product.name,
                COUNT(f)
            )
            FROM Feedback f
            JOIN f.uploadFileData lead
            JOIN lead.productId product
            WHERE f.createdAt >= :start
              AND f.createdAt < :end
            GROUP BY productId.code, product.name
            ORDER BY productId.name ASC
            """)
    List<ProductCallCountDto> countCallsByProductCreatedAtBetween(@Param("start") LocalDateTime start,
                                                                  @Param("end") LocalDateTime end);

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
            JOIN FETCH lead.productId product
            JOIN FETCH f.agent agent
            WHERE f.createdAt >= :start
              AND f.createdAt < :end
            ORDER BY lead.id ASC, f.createdAt DESC, f.id DESC
            """)
    Slice<Feedback> findExportRowsByCreatedAtBetween(@Param("start") LocalDateTime start,
                                                     @Param("end") LocalDateTime end,
                                                     Pageable pageable);

    @Query("""
            SELECT f
            FROM Feedback f
            JOIN FETCH f.uploadFileData lead
            JOIN FETCH lead.uploadFile uploadFile
            JOIN FETCH lead.productId product
            JOIN FETCH f.agent agent
            WHERE f.createdAt >= :start
              AND f.createdAt < :end
              AND NOT EXISTS (
                  SELECT latestFeedback
                  FROM Feedback latestFeedback
                  WHERE latestFeedback.uploadFileData = f.uploadFileData
                    AND latestFeedback.createdAt >= :start
                    AND latestFeedback.createdAt < :end
                    AND (
                        latestFeedback.createdAt > f.createdAt
                        OR (
                            latestFeedback.createdAt = f.createdAt
                            AND latestFeedback.id > f.id
                        )
                    )
              )
            ORDER BY lead.id ASC, f.createdAt DESC, f.id DESC
            """)
    Slice<Feedback> findLatestExportRowsByCreatedAtBetween(@Param("start") LocalDateTime start,
                                                           @Param("end") LocalDateTime end,
                                                           Pageable pageable);

    @Query("""
            SELECT f
            FROM Feedback f
            JOIN FETCH f.uploadFileData lead
            JOIN FETCH lead.uploadFile uploadFile
            JOIN FETCH lead.productId product
            JOIN FETCH f.agent agent
            WHERE f.createdAt >= :start
              AND f.createdAt < :end
              AND f.isFollowup = true
            ORDER BY lead.id ASC, f.createdAt DESC, f.id DESC
            """)
    Slice<Feedback> findFollowupExportRowsByCreatedAtBetween(@Param("start") LocalDateTime start,
                                                             @Param("end") LocalDateTime end,
                                                             Pageable pageable);

    @Query("""
            SELECT new com.tvscollections.backend.dto.FeedbackHistoryDto(
                f.id,
                f.uploadFileData.id,
                f.createdAt,
                f.uid,
                f.disposition,
                f.subDisposition,
                f.paymentMode,
                f.ptpAmount,
                f.ptpDate,
                f.callBackDate,
                f.callBackTime,
                f.alternateMobileNumber,
                f.sourceIncome,
                f.remark,
                f.isFollowup
            )
            FROM Feedback f
            WHERE f.uploadFileData.id = :uploadFileDataId
            ORDER BY f.createdAt DESC
            """)
    List<FeedbackHistoryDto> findHistoryByUploadFileDataId(@Param("uploadFileDataId") Long uploadFileDataId);

    @Query("""
            SELECT new com.tvscollections.backend.dto.FeedbackHistoryDto(
                f.id,
                f.uploadFileData.id,
                f.createdAt,
                f.uid,
                f.disposition,
                f.subDisposition,
                f.paymentMode,
                f.ptpAmount,
                f.ptpDate,
                f.callBackDate,
                f.callBackTime,
                f.alternateMobileNumber,
                f.sourceIncome,
                f.remark,
                f.isFollowup
            )
            FROM Feedback f
            WHERE f.uploadFileData.id IN :uploadFileDataIds
            ORDER BY f.uploadFileData.id ASC, f.createdAt DESC, f.id DESC
            """)
    List<FeedbackHistoryDto> findHistoryByUploadFileDataIds(@Param("uploadFileDataIds") Collection<Long> uploadFileDataIds);

    @Query("""
            SELECT f
            FROM Feedback f
            JOIN FETCH f.uploadFileData lead
            JOIN FETCH lead.productId product
            WHERE f.isFollowup = true
              AND product.code = :productCode
              AND f.agent.id = :agentId
            ORDER BY f.createdAt DESC
            """)
    List<Feedback> findFollowupsByProductAndAgent(@Param("productCode") String productCode, @Param("agentId") Long agentId);

    @Query("""
            SELECT f
            FROM Feedback f
            JOIN FETCH f.uploadFileData lead
            JOIN FETCH lead.productId product
            JOIN FETCH f.agent agent
            WHERE f.isFollowup = true
            ORDER BY f.createdAt DESC
            """)
    List<Feedback> findFollowupsForAdmin();
}
