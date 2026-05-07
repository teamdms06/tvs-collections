package com.tvscollections.backend.controller;

import com.tvscollections.backend.dto.FeedbackRequestDto;
import com.tvscollections.backend.model.UploadFileData;
import com.tvscollections.backend.security.UserPrincipal;
import com.tvscollections.backend.service.ProductAccessService;
import com.tvscollections.backend.service.UploadFileDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api")
public class LeadController {

    private final UploadFileDataService uploadFileDataService;
    private final ProductAccessService productAccessService;

    public LeadController(UploadFileDataService uploadFileDataService, ProductAccessService productAccessService) {
        this.uploadFileDataService = uploadFileDataService;
        this.productAccessService = productAccessService;
    }

    @GetMapping("/{productKey}/leads/search")
    public List<UploadFileData> searchLeads(@PathVariable("productKey") String productKey, @RequestParam("q") String query) {
        System.out.println("Search leads for product: " + productKey + " with query: " + query);
        validateProductAccess(productKey);

        if (query == null || query.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query string is required");
        }

        return uploadFileDataService.searchLeads(productKey, query.trim());
    }

    @GetMapping("/{productKey}/leads/{leadId}")
    public UploadFileData getLeadById(@PathVariable("productKey") String productKey, @PathVariable("leadId") Long leadId) {
        validateProductAccess(productKey);
        return uploadFileDataService.getLeadById(productKey, leadId);
    }

    @PostMapping("/{productKey}/leads/{leadId}/feedback")
    public ResponseEntity<?> saveFeedback(@PathVariable("productKey") String productKey,
                                          @PathVariable("leadId") Long leadId,
                                          @RequestBody FeedbackRequestDto feedbackRequest) {
        validateProductAccess(productKey);
        String email = getCurrentUserEmail();
        uploadFileDataService.addFeedback(productKey, leadId, email, feedbackRequest);
        return ResponseEntity.ok().body("Feedback saved");
    }

    private void validateProductAccess(String productKey) {
        UserPrincipal currentUser = getCurrentUser();
        if (!productAccessService.getAccessibleProductCodes(currentUser.getUser()).contains(productKey)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied for product: " + productKey);
        }
    }

    private UserPrincipal getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }
        return (UserPrincipal) authentication.getPrincipal();
    }

    private String getCurrentUserEmail() {
        return getCurrentUser().getUsername();
    }
}

