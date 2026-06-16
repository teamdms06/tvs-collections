package com.tvscollections.backend.controller;

import com.tvscollections.backend.model.DraftLead;
import com.tvscollections.backend.security.UserPrincipal;
import com.tvscollections.backend.service.DraftLeadService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/drafts")
public class DraftLeadController {

    private final DraftLeadService draftLeadService;

    public DraftLeadController(DraftLeadService draftLeadService) {
        this.draftLeadService = draftLeadService;
    }

    @PostMapping
    public ResponseEntity<DraftLead> saveDraft(@RequestBody DraftLead draft) {
        DraftLead saved = draftLeadService.saveDraft(
                getCurrentUser().getUser(),
                draft.getAgreementNumber(),
                draft.getLeadId(),
                draft.getProductKey(),
                draft.getFormDataJson()
        );
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<DraftLead>> listDrafts(@RequestParam(required = false) String productKey) {
        return ResponseEntity.ok(draftLeadService.getDrafts(getCurrentUser().getUser(), productKey));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDraft(@PathVariable Long id) {
        draftLeadService.deleteDraft(getCurrentUser().getUser(), id);
        return ResponseEntity.noContent().build();
    }

    private UserPrincipal getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }
        return (UserPrincipal) authentication.getPrincipal();
    }
}
