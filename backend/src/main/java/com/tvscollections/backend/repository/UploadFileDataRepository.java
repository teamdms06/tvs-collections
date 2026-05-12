package com.tvscollections.backend.repository;

import com.tvscollections.backend.dto.ProductCountDto;
import com.tvscollections.backend.model.UploadFileData;
import com.tvscollections.backend.model.UploadStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UploadFileDataRepository extends JpaRepository<UploadFileData, Long> {
    @Query("""
            SELECT u
            FROM UploadFileData u
            WHERE u.product.code = :productCode
                AND u.uploadFile.status <> :inactiveStatus
                AND (
                    LOWER(u.agreementNumber) LIKE LOWER(CONCAT('%', :query, '%'))
                    OR LOWER(u.mobileNumber) LIKE LOWER(CONCAT('%', :query, '%'))
                )
            """)
    List<UploadFileData> searchByProductAndQuery(@Param("productCode") String productCode,
                                                  @Param("query") String query,
                                                  @Param("inactiveStatus") UploadStatus inactiveStatus,
                                                  Pageable pageable);

    @Query("""
            SELECT u
            FROM UploadFileData u
            WHERE u.product.code = :productCode
                AND u.uploadFile.status <> :inactiveStatus
                AND TRIM(u.mobileNumber) = :mobileNumber
            ORDER BY u.uploadFile.uploadedAt DESC, u.uploadFile.id DESC, u.id DESC
            """)
    List<UploadFileData> findLatestByProductAndExactMobileNumber(@Param("productCode") String productCode,
                                                                  @Param("mobileNumber") String mobileNumber,
                                                                  @Param("inactiveStatus") UploadStatus inactiveStatus,
                                                                  Pageable pageable);

    @Query("""
            SELECT u
            FROM UploadFileData u
            WHERE u.product.code = :productCode
                AND u.uploadFile.status <> :inactiveStatus
                AND TRIM(LOWER(u.agreementNumber)) = TRIM(LOWER(:agreementNumber))
            ORDER BY u.uploadFile.uploadedAt DESC, u.uploadFile.id DESC, u.id DESC
            """)
    List<UploadFileData> findLatestByProductAndExactAgreementNumber(@Param("productCode") String productCode,
                                                                     @Param("agreementNumber") String agreementNumber,
                                                                     @Param("inactiveStatus") UploadStatus inactiveStatus,
                                                                     Pageable pageable);

    @Query("""
            SELECT u
            FROM UploadFileData u
            WHERE u.id = :id
                AND u.product.code = :productCode
                AND u.uploadFile.status <> :inactiveStatus
            """)
    Optional<UploadFileData> findActiveByIdAndProductCode(@Param("id") Long id,
                                                          @Param("productCode") String productCode,
                                                          @Param("inactiveStatus") UploadStatus inactiveStatus);

    Long countByUploadFile_StatusNot(UploadStatus status);

    @Query("""
            SELECT new com.tvscollections.backend.dto.ProductCountDto(
                u.product.code,
                u.product.name,
                COUNT(u)
            )
            FROM UploadFileData u
            WHERE u.uploadFile.status <> :inactiveStatus
            GROUP BY u.product.code, u.product.name
            ORDER BY COUNT(u) DESC
            """)
    List<ProductCountDto> countLeadsByProduct(@Param("inactiveStatus") UploadStatus inactiveStatus);
}
