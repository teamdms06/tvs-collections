package com.tvscollections.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback")
public class Feedback {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "upload_file_data_id", nullable = false)
    @JsonIgnore
    public UploadFileData uploadFileData;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    public User agent;

    @Column(length = 100)
    public String disposition;

    @Column(name = "sub_disposition", length = 100)
    public String subDisposition;

    @Column(name = "payment_mode", length = 150)
    public String paymentMode;

    @Column(name = "non_payment_reason", length = 255)
    public String nonPaymentReason;

    @Column(name = "bouncing_reason", length = 255)
    public String bouncingReason;

    @Column(name = "ptp_amount", precision = 12, scale = 2)
    public Integer ptpAmount;

    @Column(name = "ptp_date")
    public String ptpDate;

    @Column(name = "pickup_time")
    public String pickupTime;

    @Column(name = "pickup_address", columnDefinition = "TEXT")
    public String pickupAddress;

    @Column(name = "transaction_receipt_no", length = 150)
    public String transactionReceiptNo;

    @Column(name = "paid_to_name", length = 150)
    public String paidToName;

    @Column(name = "paid_to_contact", length = 20)
    public String paidToContact;

    @Column(name = "paid_showroom", length = 150)
    public String paidShowroom;

    @Column(name = "call_back_date")
    public String callBackDate;

    @Column(name = "call_back_time")
    public String callBackTime;

    @Column(name = "alternate_mobile_number", length = 20)
    public String alternateMobileNumber;

    @Column(columnDefinition = "TEXT")
    public String remark;

    @Column(name = "created_at", nullable = false)
    public LocalDateTime createdAt;

    public Feedback() {
    }

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
