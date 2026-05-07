package com.tvscollections.backend.repository;

import com.tvscollections.backend.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByUploadFileDataIdOrderByCreatedAtDesc(Long uploadFileDataId);
}
