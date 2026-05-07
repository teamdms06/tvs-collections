package com.tvscollections.backend.repository;

import com.tvscollections.backend.model.UploadFileData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UploadFileDataRepository extends JpaRepository<UploadFileData, Long> {
    @Query("SELECT u FROM UploadFileData u WHERE u.product.code = :productCode AND (LOWER(u.agreementNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.mobileNumber) LIKE LOWER(CONCAT('%', :query, '%'))) ")
    List<UploadFileData> searchByProductAndQuery(@Param("productCode") String productCode, @Param("query") String query);

    Optional<UploadFileData> findByIdAndProduct_Code(Long id, String productCode);
}
