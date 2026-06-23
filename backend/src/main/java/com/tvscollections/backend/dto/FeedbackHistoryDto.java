package com.tvscollections.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.tvscollections.backend.model.Feedback;

import java.time.LocalDateTime;

public class FeedbackHistoryDto {
    public Long id;
    @JsonIgnore
    public Long uploadFileDataId;
    public String date;
    public String uid;
    public String disposition;
    public String subDisposition;
    public String paymentMode;
    public Integer ptpAmount;
    public String ptpDate;
    public String callBackDate;
    public String callBackTime;
    public String alternateMobileNumber;
    public String sourceIncome;
    public String remark;
    public Boolean isFollowup;
    public String customerName;
    public String agreementNumber;
    public String mobileNumber;
    public String agentName;
    public String agentUsername;

    public FeedbackHistoryDto(Long id,
                              LocalDateTime createdAt,
                              String disposition,
                              String subDisposition,
                              String paymentMode,
                              Integer ptpAmount,
                              String ptpDate,
                              String callBackDate,
                              String callBackTime,
                              String alternateMobileNumber,
                              String sourceIncome,
                              String remark,
                              Boolean isFollowup) {
        this(id, null, createdAt, null, disposition, subDisposition, paymentMode, ptpAmount, ptpDate, callBackDate,
                callBackTime, alternateMobileNumber, sourceIncome, remark, isFollowup);
    }

    public FeedbackHistoryDto(Long id,
                              Long uploadFileDataId,
                              LocalDateTime createdAt,
                              String uid,
                              String disposition,
                              String subDisposition,
                              String paymentMode,
                              Integer ptpAmount,
                              String ptpDate,
                              String callBackDate,
                              String callBackTime,
                              String alternateMobileNumber,
                              String sourceIncome,
                              String remark,
                              Boolean isFollowup) {
        this.id = id;
        this.uploadFileDataId = uploadFileDataId;
        this.date = createdAt == null ? null : createdAt.toString();
        this.uid = uid;
        this.disposition = disposition;
        this.subDisposition = subDisposition;
        this.paymentMode = paymentMode;
        this.ptpAmount = ptpAmount;
        this.ptpDate = ptpDate;
        this.callBackDate = callBackDate;
        this.callBackTime = callBackTime;
        this.alternateMobileNumber = alternateMobileNumber;
        this.sourceIncome = sourceIncome;
        this.remark = remark;
        this.isFollowup = isFollowup;
    }

    public FeedbackHistoryDto(Feedback feedback) {
        this(
                feedback.id,
                feedback.uploadFileData == null ? null : feedback.uploadFileData.id,
                feedback.createdAt,
                feedback.uid,
                feedback.disposition,
                feedback.subDisposition,
                feedback.paymentMode,
                feedback.ptpAmount,
                feedback.ptpDate,
                feedback.callBackDate,
                feedback.callBackTime,
                feedback.alternateMobileNumber,
                feedback.sourceIncome,
                feedback.remark,
                feedback.isFollowup
        );
        if (feedback.uploadFileData != null) {
            this.customerName = feedback.uploadFileData.customerName;
            this.agreementNumber = feedback.uploadFileData.agreementNumber;
            this.mobileNumber = feedback.uploadFileData.mobileNumber;
        }
        if (feedback.agent != null) {
            this.agentName = feedback.agent.name;
            this.agentUsername = feedback.agent.username;
        }
    }
}
