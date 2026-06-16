package com.tvscollections.backend.service;

import com.tvscollections.backend.model.DraftLead;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.repository.DraftLeadRepository;
import java.util.List;
import org.springframework.stereotype.Service;
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

        return repository.save(draft);
    }

    public List<DraftLead> getDrafts(User user, String productKey) {
        if (StringUtils.hasText(productKey)) {
            return repository.findByUserAndProductKeyOrderByUpdatedAtDesc(user, normalizeProductKey(productKey));
        }
        return repository.findByUserOrderByUpdatedAtDesc(user);
    }

    public void deleteDraft(Long id) {
        repository.deleteById(id);
    }

    public void deleteDraft(User user, Long id) {
        repository.findById(id)
                .filter(draft -> draft.getUser() != null && draft.getUser().id.equals(user.id))
                .ifPresent(repository::delete);
    }

    private String normalizeProductKey(String productKey) {
        return productKey == null ? null : productKey.trim().toLowerCase();
    }
}
