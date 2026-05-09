package com.tvscollections.backend.dto;

public class UploadResultDto {
    public Long uploadFileId;
    public String fileName;
    public Integer totalRecords;
    public Integer validRecords;
    public Integer duplicateRecords;
    public Integer failedRecords;
    public String status;

    public UploadResultDto(Long uploadFileId,
                           String fileName,
                           Integer totalRecords,
                           Integer validRecords,
                           Integer duplicateRecords,
                           Integer failedRecords,
                           String status) {
        this.uploadFileId = uploadFileId;
        this.fileName = fileName;
        this.totalRecords = totalRecords;
        this.validRecords = validRecords;
        this.duplicateRecords = duplicateRecords;
        this.failedRecords = failedRecords;
        this.status = status;
    }
}
