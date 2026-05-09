package com.tvscollections.backend.dto;

import com.tvscollections.backend.model.UploadStatus;

import java.time.LocalDateTime;

public class RecentUploadDto {
    public Long id;
    public String fileName;
    public String productCode;
    public String productName;
    public Integer totalRecords;
    public Integer validRecords;
    public Integer failedRecords;
    public UploadStatus status;
    public LocalDateTime uploadedAt;

    public RecentUploadDto(Long id,
                           String fileName,
                           String productCode,
                           String productName,
                           Integer totalRecords,
                           Integer validRecords,
                           Integer failedRecords,
                           UploadStatus status,
                           LocalDateTime uploadedAt) {
        this.id = id;
        this.fileName = fileName;
        this.productCode = productCode;
        this.productName = productName;
        this.totalRecords = totalRecords;
        this.validRecords = validRecords;
        this.failedRecords = failedRecords;
        this.status = status;
        this.uploadedAt = uploadedAt;
    }
}
