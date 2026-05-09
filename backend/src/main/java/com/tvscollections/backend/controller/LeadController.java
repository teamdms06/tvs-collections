package com.tvscollections.backend.controller;

import com.tvscollections.backend.dto.FeedbackRequestDto;
import com.tvscollections.backend.dto.UploadResultDto;
import com.tvscollections.backend.model.UploadFileData;
import com.tvscollections.backend.security.UserPrincipal;
import com.tvscollections.backend.service.ProductAccessService;
import com.tvscollections.backend.service.UploadFileDataService;
import com.tvscollections.backend.service.UserDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class LeadController {

    private final UploadFileDataService uploadFileDataService;
    private final ProductAccessService productAccessService;
    private final UserDashboardService userDashboardService;

    public LeadController(UploadFileDataService uploadFileDataService,
                          ProductAccessService productAccessService,
                          UserDashboardService userDashboardService) {
        this.uploadFileDataService = uploadFileDataService;
        this.productAccessService = productAccessService;
        this.userDashboardService = userDashboardService;
    }

    @GetMapping("/user/dashboard")
    public ResponseEntity<?> getUserDashboard() {
        try {
            return ResponseEntity.ok(userDashboardService.getDashboard(getCurrentUser().getUser()));
        } catch (ResponseStatusException error) {
            return handleControllerError("Get user dashboard failed", error);
        } catch (Exception error) {
            return handleControllerError("Get user dashboard failed", error);
        }
    }

    @GetMapping("/{productKey}/leads/search")
    public ResponseEntity<?> searchLeads(@PathVariable("productKey") String productKey, @RequestParam("q") String query) {
        try {
            System.out.println("Search leads for product: " + productKey + " with query: " + query);
            validateProductAccess(productKey);

            if (query == null || query.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query string is required");
            }

            return ResponseEntity.ok(uploadFileDataService.searchLeads(productKey, query.trim()));
        } catch (ResponseStatusException error) {
            return handleControllerError("Search leads failed", error);
        } catch (Exception error) {
            return handleControllerError("Search leads failed", error);
        }
    }

    @GetMapping("/{productKey}/leads/{leadId}")
    public ResponseEntity<?> getLeadById(@PathVariable("productKey") String productKey, @PathVariable("leadId") Long leadId) {
        try {
            validateProductAccess(productKey);
            return ResponseEntity.ok(uploadFileDataService.getLeadById(productKey, leadId));
        } catch (ResponseStatusException error) {
            return handleControllerError("Get lead failed", error);
        } catch (Exception error) {
            return handleControllerError("Get lead failed", error);
        }
    }

    @PostMapping("/{productKey}/leads/upload")
    public ResponseEntity<?> uploadLeads(@PathVariable("productKey") String productKey, @RequestParam("file") MultipartFile file) {
        try {
            System.out.println("Upload leads for product: " + productKey + " with file: " + (file != null ? file.getOriginalFilename() : "null"));
            validateProductAccess(productKey);

            if (file == null || file.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Excel file is required");
            }

            UploadResultDto result = uploadFileDataService.uploadExcel(productKey, getCurrentUser().getUser(), file);
            System.out.println("Upload completed for product: " + productKey + ". Saved records: " + result.validRecords);
            return ResponseEntity.ok(result);
        } catch (ResponseStatusException error) {
            return handleControllerError("Upload failed", error);
        } catch (Exception error) {
            return handleControllerError("Upload failed", error);
        }
    }

    @PostMapping("/{productKey}/leads/{leadId}/feedback")
    public ResponseEntity<?> saveFeedback(@PathVariable("productKey") String productKey,
                                          @PathVariable("leadId") Long leadId,
                                          @RequestBody FeedbackRequestDto feedbackRequest) {
        try {
            validateProductAccess(productKey);
            String email = getCurrentUserEmail();
            uploadFileDataService.addFeedback(productKey, leadId, email, feedbackRequest);
            return ResponseEntity.ok().body("Feedback saved");
        } catch (ResponseStatusException error) {
            return handleControllerError("Save feedback failed", error);
        } catch (Exception error) {
            return handleControllerError("Save feedback failed", error);
        }
    }

    private ResponseEntity<Map<String, String>> handleControllerError(String action, ResponseStatusException error) {
        System.out.println(action + " with HTTP status " + error.getStatusCode() + ". Reason: " + error.getReason());
        error.printStackTrace();

        Map<String, String> body = new LinkedHashMap<>();
        body.put("error", error.getStatusCode().toString());
        body.put("message", error.getReason() != null ? error.getReason() : action);
        return ResponseEntity.status(error.getStatusCode()).body(body);
    }

    private ResponseEntity<Map<String, String>> handleControllerError(String action, Exception error) {
        System.out.println(action + " with unexpected error: " + error.getClass().getName() + " - " + error.getMessage());
        error.printStackTrace();

        Map<String, String> body = new LinkedHashMap<>();
        body.put("error", HttpStatus.INTERNAL_SERVER_ERROR.toString());
        body.put("message", action + ": " + (error.getMessage() != null ? error.getMessage() : "Unexpected server error"));
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    private void validateProductAccess(String productKey) {
        UserPrincipal currentUser = getCurrentUser();
        String normalizedProductKey = productKey == null ? "" : productKey.trim().toLowerCase();
        List<String> accessibleProducts = productAccessService.getAccessibleProductCodes(currentUser.getUser());

        System.out.println(
                "Validating access for user: " + currentUser.getUsername()
                        + " to product: " + normalizedProductKey
                        + ". Allowed products: " + accessibleProducts
        );

        boolean hasProductAccess = accessibleProducts.stream()
                .anyMatch(product -> product != null && product.trim().equalsIgnoreCase(normalizedProductKey));
        System.out.println("Has access: " + hasProductAccess);

        if (!hasProductAccess) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied for product: " + normalizedProductKey);
        }

        System.out.println("Access granted for user: " + currentUser.getUsername() + " to product: " + normalizedProductKey);
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
