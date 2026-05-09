package com.tvscollections.backend.controller;

import com.tvscollections.backend.dto.AdminUserRequestDto;
import com.tvscollections.backend.service.AdminDashboardService;
import com.tvscollections.backend.service.AdminUserService;
import com.tvscollections.backend.model.UploadStatus;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminDashboardService adminDashboardService;
    private final AdminUserService adminUserService;

    public AdminController(AdminDashboardService adminDashboardService,
                           AdminUserService adminUserService) {
        this.adminDashboardService = adminDashboardService;
        this.adminUserService = adminUserService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard() {
        validateAdmin();
        return ResponseEntity.ok(adminDashboardService.getDashboard());
    }

    @GetMapping("/uploads")
    public ResponseEntity<?> getUploadedFiles() {
        validateAdmin();
        return ResponseEntity.ok(adminDashboardService.getUploadedFiles());
    }

    @GetMapping("/export/feedback")
    public ResponseEntity<byte[]> exportFeedback(@RequestParam("startDate") String startDate,
                                                 @RequestParam("endDate") String endDate) {
        validateAdmin();
        LocalDate parsedStartDate;
        LocalDate parsedEndDate;

        try {
            parsedStartDate = LocalDate.parse(startDate);
            parsedEndDate = LocalDate.parse(endDate);
        } catch (DateTimeParseException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dates must use yyyy-MM-dd format", error);
        }

        byte[] exportFile = adminDashboardService.exportFeedback(parsedStartDate, parsedEndDate);
        String fileName = "feedback-export-" + startDate + "-to-" + endDate + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(exportFile);
    }

    @PostMapping("/uploads/{uploadId}/deactivate")
    public ResponseEntity<?> deactivateUpload(@PathVariable("uploadId") Long uploadId) {
        validateAdmin();
        return ResponseEntity.ok(adminDashboardService.updateUploadStatus(uploadId, UploadStatus.inactive));
    }

    @PostMapping("/uploads/{uploadId}/activate")
    public ResponseEntity<?> activateUpload(@PathVariable("uploadId") Long uploadId) {
        validateAdmin();
        return ResponseEntity.ok(adminDashboardService.updateUploadStatus(uploadId, UploadStatus.completed));
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers() {
        validateAdmin();
        return ResponseEntity.ok(adminUserService.getUsers());
    }

    @GetMapping("/users/options")
    public ResponseEntity<?> getUserOptions() {
        validateAdmin();
        return ResponseEntity.ok(adminUserService.getOptions());
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody AdminUserRequestDto request) {
        validateAdmin();
        return ResponseEntity.ok(adminUserService.createUser(request));
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable("userId") Long userId,
                                        @RequestBody AdminUserRequestDto request) {
        validateAdmin();
        return ResponseEntity.ok(adminUserService.updateUser(userId, request));
    }

    @PostMapping("/users/{userId}/deactivate")
    public ResponseEntity<?> deactivateUser(@PathVariable("userId") Long userId) {
        validateAdmin();
        return ResponseEntity.ok(adminUserService.updateUserActiveStatus(userId, false));
    }

    @PostMapping("/users/{userId}/activate")
    public ResponseEntity<?> activateUser(@PathVariable("userId") Long userId) {
        validateAdmin();
        return ResponseEntity.ok(adminUserService.updateUserActiveStatus(userId, true));
    }

    private void validateAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication != null
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> "admin".equalsIgnoreCase(authority.getAuthority()));

        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }
}
