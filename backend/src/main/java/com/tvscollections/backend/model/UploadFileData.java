package com.tvscollections.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "upload_file_data")
public class UploadFileData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "upload_file_id", nullable = false)
    @JsonIgnore
    public UploadFile uploadFile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    public Product product;

    @Column(name = "list_id", length = 100)
    public String listId;

    @Column(name = "agreement_number", length = 100)
    public String agreementNumber;

    @Column(name = "uid", length = 50)
    public String uid;

    @Column(name = "customer_name", length = 150)
    public String customerName;

    @Column(name = "mobile_number", length = 20)
    public String mobileNumber;

    @Column(columnDefinition = "TEXT")
    public String address;

    @Column(length = 100)
    public String city;

    @Column(length = 20)
    public String pincode;

    @Column(name = "dealer_code", length = 100)
    public String dealerCode;

    @Column(name = "dealer_name", length = 150)
    public String dealerName;

    @Column(length = 100)
    public String portfolio;

    @Column(name = "amount_financed", precision = 12, scale = 2)
    public Integer amountFinanced;

    @Column(name = "first_emi_date")
    public String firstEmiDate;

    @Column(name = "last_emi_date")
    public String lastEmiDate;

    @Column(name = "bounce_reason", length = 255)
    public String bounceReason;

    public Integer tenor;

    @Column(precision = 12, scale = 2)
    public Integer emi;

    @Column(columnDefinition = "TEXT")
    public String otherDetails;

    @Column(name = "final_opening_bkt_status", length = 100)
    public String finalOpeningBktStatus;

    @Column(length = 150)
    public String model;

    @Column(name = "dpd_del_string", length = 100)
    public String dpdDelString;

    @Column(name = "branch_name", length = 150)
    public String branchName;

    @Column(length = 100)
    public String region;

    @Column(length = 100)
    public String zone;

    @Column(length = 80)
    public String language;

    @Column(name = "total_overdue", precision = 12, scale = 2)
    public Integer totalOverdue;

    @Column(name = "cbc_charges", precision = 12, scale = 2)
    public Integer cbcCharges;

    @Column(precision = 12, scale = 2)
    public Integer askable;

    @Column(name = "settlement_month", length = 50)
    public String settlementMonth;

    @Column(name = "fce_name", length = 150)
    public String fceName;

    @Column(name = "fce_number", length = 20)
    public String fceNumber;

    @Column(name = "tcm_name", length = 150)
    public String tcmName;

    @Column(name = "tcm_number", length = 20)
    public String tcmNumber;

    @Column(name = "acm_name", length = 150)
    public String acmName;

    @Column(name = "acm_number", length = 20)
    public String acmNumber;

    @Column(name = "best_dispo_internal", length = 100)
    public String bestDispoInternal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "latest_feedback_id")
    public Feedback latestFeedback;

    @Column(name = "raw_data", columnDefinition = "CLOB")
    public String rawData;

    @Column(name = "created_at", nullable = false)
    public LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    public LocalDateTime updatedAt;

    public UploadFileData() {
    }

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
