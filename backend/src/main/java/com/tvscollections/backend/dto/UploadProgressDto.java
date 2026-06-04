package com.tvscollections.backend.dto;

import java.time.LocalDateTime;

public class UploadProgressDto {
    public String progressId;
    public String phase;
    public String status;
    public String fileName;
    public Long uploadFileId;
    public Integer estimatedTotalRecords;
    public Integer recordsRead;
    public Integer recordsSaved;
    public String message;
    public LocalDateTime startedAt;
    public LocalDateTime updatedAt;

    public UploadProgressDto(String progressId,
                             String phase,
                             String status,
                             String fileName,
                             Long uploadFileId,
                             Integer estimatedTotalRecords,
                             Integer recordsRead,
                             Integer recordsSaved,
                             String message,
                             LocalDateTime startedAt,
                             LocalDateTime updatedAt) {
        this.progressId = progressId;
        this.phase = phase;
        this.status = status;
        this.fileName = fileName;
        this.uploadFileId = uploadFileId;
        this.estimatedTotalRecords = estimatedTotalRecords;
        this.recordsRead = recordsRead;
        this.recordsSaved = recordsSaved;
        this.message = message;
        this.startedAt = startedAt;
        this.updatedAt = updatedAt;
    }
}
