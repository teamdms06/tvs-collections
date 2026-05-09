package com.tvscollections.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(
        name = "upload_files",
        indexes = {
                @Index(name = "idx_upload_files_status_uploaded_at", columnList = "status, uploaded_at"),
                @Index(name = "idx_upload_files_product_uploaded_at", columnList = "product_id, uploaded_at")
        }
)
public class UploadFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    public Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    public User uploadedBy;

    @Column(name = "file_name", nullable = false, length = 255)
    public String fileName;

    @Column(name = "file_size", nullable = false)
    public Long fileSize = 0L;

    @Column(name = "total_records", nullable = false)
    public Integer totalRecords = 0;

    @Column(name = "valid_records", nullable = false)
    public Integer validRecords = 0;

    @Column(name = "duplicate_records", nullable = false)
    public Integer duplicateRecords = 0;

    @Column(name = "failed_records", nullable = false)
    public Integer failedRecords = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public UploadStatus status = UploadStatus.pending;

    @Column(name = "uploaded_at", nullable = false)
    public LocalDateTime uploadedAt;

    @JsonIgnore
    @OneToMany(mappedBy = "uploadFile", cascade = CascadeType.ALL, orphanRemoval = true)
    public Set<UploadFileData> records = new HashSet<>();

    public UploadFile() {
    }

    @PrePersist
    public void prePersist() {
        uploadedAt = LocalDateTime.now();
    }
}
