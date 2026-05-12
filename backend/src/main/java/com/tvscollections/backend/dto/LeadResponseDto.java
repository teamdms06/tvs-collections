package com.tvscollections.backend.dto;

import com.tvscollections.backend.model.UploadFileData;

import java.time.LocalDateTime;
import java.util.List;

public class LeadResponseDto {
    public Long id;
    public ProductSummaryDto product;
    public String listId;
    public String agreementNumber;
    public String uid;
    public String customerName;
    public String mobileNumber;
    public String address;
    public String city;
    public String pincode;
    public String dealerCode;
    public String dealerName;
    public String portfolio;
    public Integer amountFinanced;
    public String firstEmiDate;
    public String lastEmiDate;
    public String bounceReason;
    public Integer tenor;
    public Integer emi;
    public String otherDetails;
    public String finalOpeningBktStatus;
    public String model;
    public String dpdDelString;
    public String branchName;
    public String region;
    public String zone;
    public String language;
    public Integer totalOverdue;
    public Integer cbcCharges;
    public Integer askable;
    public String settlementMonth;
    public String fceName;
    public String fceNumber;
    public String tcmName;
    public String tcmNumber;
    public String acmName;
    public String acmNumber;
    public String bestDispoInternal;
    public FeedbackHistoryDto latestFeedback;
    public String rawData;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;
    public List<FeedbackHistoryDto> history;

    public LeadResponseDto() {
    }

    public LeadResponseDto(UploadFileData lead, List<FeedbackHistoryDto> feedbackHistory) {
        this.id = lead.id;
        this.product = lead.product == null ? null : new ProductSummaryDto(lead.product);
        this.listId = lead.listId;
        this.agreementNumber = lead.agreementNumber;
        this.uid = lead.uid;
        this.customerName = lead.customerName;
        this.mobileNumber = lead.mobileNumber;
        this.address = lead.address;
        this.city = lead.city;
        this.pincode = lead.pincode;
        this.dealerCode = lead.dealerCode;
        this.dealerName = lead.dealerName;
        this.portfolio = lead.portfolio;
        this.amountFinanced = lead.amountFinanced;
        this.firstEmiDate = lead.firstEmiDate;
        this.lastEmiDate = lead.lastEmiDate;
        this.bounceReason = lead.bounceReason;
        this.tenor = lead.tenor;
        this.emi = lead.emi;
        this.otherDetails = lead.otherDetails;
        this.finalOpeningBktStatus = lead.finalOpeningBktStatus;
        this.model = lead.model;
        this.dpdDelString = lead.dpdDelString;
        this.branchName = lead.branchName;
        this.region = lead.region;
        this.zone = lead.zone;
        this.language = lead.language;
        this.totalOverdue = lead.totalOverdue;
        this.cbcCharges = lead.cbcCharges;
        this.askable = lead.askable;
        this.settlementMonth = lead.settlementMonth;
        this.fceName = lead.fceName;
        this.fceNumber = lead.fceNumber;
        this.tcmName = lead.tcmName;
        this.tcmNumber = lead.tcmNumber;
        this.acmName = lead.acmName;
        this.acmNumber = lead.acmNumber;
        this.bestDispoInternal = lead.bestDispoInternal;
        this.latestFeedback = feedbackHistory.isEmpty() ? null : feedbackHistory.get(0);
        this.rawData = lead.rawData;
        this.createdAt = lead.createdAt;
        this.updatedAt = lead.updatedAt;
        this.history = feedbackHistory;
    }
}
