package com.tvscollections.backend.dto;

public class NcRecordUploadResultDto {
    public Integer totalRecords;
    public Integer matchedRecords;
    public Integer updatedRecords;
    public Integer unmatchedRecords;
    public Integer failedRecords;

    public NcRecordUploadResultDto(Integer totalRecords,
                                   Integer matchedRecords,
                                   Integer updatedRecords,
                                   Integer unmatchedRecords,
                                   Integer failedRecords) {
        this.totalRecords = totalRecords;
        this.matchedRecords = matchedRecords;
        this.updatedRecords = updatedRecords;
        this.unmatchedRecords = unmatchedRecords;
        this.failedRecords = failedRecords;
    }
}
