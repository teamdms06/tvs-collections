package com.tvscollections.backend.repository;

import com.tvscollections.backend.model.DraftLead;
import com.tvscollections.backend.model.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository for DraftLead entities.
 */
@Repository
public interface DraftLeadRepository extends JpaRepository<DraftLead, Long> {
    List<DraftLead> findByAgreementNumberOrderByCreatedAtDesc(String agreementNumber);
    List<DraftLead> findByUserAndProductKeyOrderByUpdatedAtDesc(User user, String productKey);
    List<DraftLead> findByUserOrderByUpdatedAtDesc(User user);
    List<DraftLead> findByUserAndLeadStatusOrderByUpdatedAtDesc(User user, String leadStatus);
    Optional<DraftLead> findFirstByUserAndLeadIdOrderByUpdatedAtDesc(User user, Long leadId);

    @EntityGraph(attributePaths = {"user"})
    List<DraftLead> findAllByOrderByUpdatedAtDesc();

    @Modifying
    @Query("""
            update DraftLead draft
            set draft.leadStatus = 'deactive'
            where draft.id = :id
                and draft.user.id = :userId
            """)
    int deactivateByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    @Modifying
    @Query("""
            update DraftLead draft
            set draft.leadStatus = 'deactive'
            where draft.id = :id
            """)
    int deactivateById(@Param("id") Long id);
}
