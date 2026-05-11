package com.tvscollections.backend.repository;

import com.tvscollections.backend.dto.RecentUploadDto;
import com.tvscollections.backend.model.UploadFile;
import com.tvscollections.backend.model.UploadStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UploadFileRepository extends JpaRepository<UploadFile, Long> {
    Long countByUploadedAtGreaterThanEqualAndUploadedAtLessThan(LocalDateTime start, LocalDateTime end);
    Long countByStatusNot(UploadStatus status);

    @Query("""
            SELECT new com.tvscollections.backend.dto.RecentUploadDto(
                u.id,
                u.fileName,
                u.product.code,
                u.product.name,
                u.totalRecords,
                u.validRecords,
                u.failedRecords,
                u.status,
                u.uploadedAt
            )
            FROM UploadFile u
            ORDER BY u.uploadedAt DESC
            """)
    List<RecentUploadDto> findRecentUploads(Pageable pageable);

    @Query("""
            SELECT new com.tvscollections.backend.dto.RecentUploadDto(
                u.id,
                u.fileName,
                u.product.code,
                u.product.name,
                u.totalRecords,
                u.validRecords,
                u.failedRecords,
                u.status,
                u.uploadedAt
            )
            FROM UploadFile u
            ORDER BY u.uploadedAt DESC
            """)
    List<RecentUploadDto> findUploadSummaries(Pageable pageable);

    @Query("""
            SELECT new com.tvscollections.backend.dto.RecentUploadDto(
                u.id,
                u.fileName,
                u.product.code,
                u.product.name,
                u.totalRecords,
                u.validRecords,
                u.failedRecords,
                u.status,
                u.uploadedAt
            )
            FROM UploadFile u
            WHERE u.id = :uploadId
            """)
    Optional<RecentUploadDto> findUploadSummaryById(@Param("uploadId") Long uploadId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE UploadFile u SET u.status = :status WHERE u.id = :uploadId")
    int updateStatusById(@Param("uploadId") Long uploadId, @Param("status") UploadStatus status);
}
