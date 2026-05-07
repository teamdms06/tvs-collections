package com.tvscollections.backend.repository;

import com.tvscollections.backend.model.UploadFile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UploadFileRepository extends JpaRepository<UploadFile, Long> {
}
