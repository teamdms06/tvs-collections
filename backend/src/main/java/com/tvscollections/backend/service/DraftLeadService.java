package com.tvscollections.backend.service;

import com.tvscollections.backend.dto.AdminDraftLeadDto;
import com.tvscollections.backend.model.DraftLead;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.repository.DraftLeadRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class DraftLeadService {

    private final DraftLeadRepository repository;

    public DraftLeadService(DraftLeadRepository repository) {
        this.repository = repository;
    }

    public DraftLead saveDraft(User user, String agreementNumber, Long leadId, String productKey, String formDataJson) {
        if (user == null) {
            throw new IllegalArgumentException("User is required");
        }

        DraftLead draft = leadId == null
                ? null
                : repository.findFirstByUserAndLeadIdOrderByUpdatedAtDesc(user, leadId).orElse(null);

        if (draft == null) {
            draft = new DraftLead(agreementNumber, leadId, normalizeProductKey(productKey), formDataJson, user);
        } else {
            draft.setAgreementNumber(agreementNumber);
            draft.setLeadId(leadId);
            draft.setProductKey(normalizeProductKey(productKey));
            draft.setFormDataJson(formDataJson);
        }
        draft.setLeadStatus("active");

        return repository.save(draft);
    }

    public List<DraftLead> getDrafts(User user, String productKey) {
        return repository.findByUserAndLeadStatusOrderByUpdatedAtDesc(user, "active");
    }

    public List<AdminDraftLeadDto> getAllDraftsForAdmin() {
        return repository.findAllByOrderByUpdatedAtDesc()
                .stream()
                .map(this::toAdminDto)
                .toList();
    }

    @Transactional
    public void deleteDraft(Long id) {
        repository.deactivateById(id);
    }

    @Transactional
    public void deleteDraft(User user, Long id) {
        if (user == null || user.id == null || id == null) {
            return;
        }

        repository.deactivateByIdAndUserId(id, user.id);
    }

    private String normalizeProductKey(String productKey) {
        return productKey == null ? null : productKey.trim().toLowerCase();
    }

    private AdminDraftLeadDto toAdminDto(DraftLead draft) {
        AdminDraftLeadDto dto = new AdminDraftLeadDto();
        dto.id = draft.getId();
        dto.agreementNumber = draft.getAgreementNumber();
        dto.leadId = draft.getLeadId();
        dto.productKey = draft.getProductKey();
        dto.leadStatus = draft.getLeadStatus();
        dto.formDataJson = draft.getFormDataJson();
        dto.createdAt = draft.getCreatedAt();
        dto.updatedAt = draft.getUpdatedAt();

        User user = draft.getUser();
        if (user != null) {
            dto.userId = user.id;
            dto.userName = user.name;
            dto.username = user.username;
            dto.userEmail = user.email;
            dto.userDialerUser = user.dialerUser;
        }

        return dto;
    }
}
