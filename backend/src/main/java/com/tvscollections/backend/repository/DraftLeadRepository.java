package com.tvscollections.backend.repository;

import com.tvscollections.backend.model.DraftLead;
import com.tvscollections.backend.model.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for DraftLead entities.
 */
@Repository
public interface DraftLeadRepository extends JpaRepository<DraftLead, Long> {
    List<DraftLead> findByAgreementNumberOrderByCreatedAtDesc(String agreementNumber);
    List<DraftLead> findByUserAndProductKeyOrderByUpdatedAtDesc(User user, String productKey);
    List<DraftLead> findByUserOrderByUpdatedAtDesc(User user);
    Optional<DraftLead> findFirstByUserAndLeadIdOrderByUpdatedAtDesc(User user, Long leadId);
}
