package com.tvscollections.backend.controller;

import com.tvscollections.backend.dto.AdminUserRequestDto;
import com.tvscollections.backend.service.AdminDashboardService;
import com.tvscollections.backend.service.AdminUserService;
import com.tvscollections.backend.service.DialerProxyService;
import com.tvscollections.backend.model.UploadStatus;
import com.tvscollections.backend.model.Role;
import com.tvscollections.backend.repository.UserRepository;
import com.tvscollections.backend.security.UserPrincipal;
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

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminDashboardService adminDashboardService;
    private final AdminUserService adminUserService;
    private final DialerProxyService dialerProxyService;
    private final UserRepository userRepository;

    public AdminController(AdminDashboardService adminDashboardService,
                           AdminUserService adminUserService,
                           DialerProxyService dialerProxyService,
                           UserRepository userRepository) {
        this.adminDashboardService = adminDashboardService;
        this.adminUserService = adminUserService;
        this.dialerProxyService = dialerProxyService;
        this.userRepository = userRepository;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard() {
        try {
            validateAdmin();
            return ResponseEntity.ok(adminDashboardService.getDashboard());
        } catch (ResponseStatusException error) {
            return handleControllerError("Get admin dashboard failed", error);
        } catch (Exception error) {
            return handleControllerError("Get admin dashboard failed", error);
        }
    }

    @GetMapping("/uploads")
    public ResponseEntity<?> getUploadedFiles() {
        try {
            validateAdmin();
            return ResponseEntity.ok(adminDashboardService.getUploadedFiles());
        } catch (ResponseStatusException error) {
            return handleControllerError("Get uploaded files failed", error);
        } catch (Exception error) {
            return handleControllerError("Get uploaded files failed", error);
        }
    }

    @GetMapping("/dialer/agents")
    public ResponseEntity<?> getDialerAgents() {
        try {
            validateAdmin();
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(dialerProxyService.getLoggedInAgents());
        } catch (ResponseStatusException error) {
            return handleControllerError("Get dialer agents failed", error);
        } catch (Exception error) {
            return handleControllerError("Get dialer agents failed", error);
        }
    }

    @GetMapping("/dialer/agent")
    public ResponseEntity<?> getDialerAgent(@RequestParam("user") String agentUser) {
        try {
            validateAdmin();
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(dialerProxyService.getAgentStatus(agentUser));
        } catch (ResponseStatusException error) {
            return handleControllerError("Get dialer agent failed", error);
        } catch (Exception error) {
            return handleControllerError("Get dialer agent failed", error);
        }
    }

    @GetMapping("/export/feedback")
    public ResponseEntity<?> exportFeedback(@RequestParam("startDate") String startDate,
                                            @RequestParam("endDate") String endDate) {
        try {
            validateAdmin();
            LocalDate parsedStartDate;
            LocalDate parsedEndDate;

            try {
                parsedStartDate = LocalDate.parse(startDate);
                parsedEndDate = LocalDate.parse(endDate);
            } catch (DateTimeParseException error) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dates must use yyyy-MM-dd format", error);
            }

            String fileName = "feedback-export-" + startDate + "-to-" + endDate + ".xlsx";
            ByteArrayOutputStream exportFile = new ByteArrayOutputStream();
            adminDashboardService.exportFeedback(parsedStartDate, parsedEndDate, exportFile);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(exportFile.toByteArray());
        } catch (ResponseStatusException error) {
            return handleControllerError("Export feedback failed", error);
        } catch (Exception error) {
            return handleControllerError("Export feedback failed", error);
        }
    }

    @PostMapping("/uploads/{uploadId}/deactivate")
    public ResponseEntity<?> deactivateUpload(@PathVariable("uploadId") Long uploadId) {
        try {
            validateAdmin();
            return ResponseEntity.ok(adminDashboardService.updateUploadStatus(uploadId, UploadStatus.inactive));
        } catch (ResponseStatusException error) {
            return handleControllerError("Deactivate upload failed", error);
        } catch (Exception error) {
            return handleControllerError("Deactivate upload failed", error);
        }
    }

    @PostMapping("/uploads/{uploadId}/activate")
    public ResponseEntity<?> activateUpload(@PathVariable("uploadId") Long uploadId) {
        try {
            validateAdmin();
            return ResponseEntity.ok(adminDashboardService.updateUploadStatus(uploadId, UploadStatus.completed));
        } catch (ResponseStatusException error) {
            return handleControllerError("Activate upload failed", error);
        } catch (Exception error) {
            return handleControllerError("Activate upload failed", error);
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers() {
        try {
            validateAdmin();
            return ResponseEntity.ok(adminUserService.getUsers());
        } catch (ResponseStatusException error) {
            return handleControllerError("Get admin users failed", error);
        } catch (Exception error) {
            return handleControllerError("Get admin users failed", error);
        }
    }

    @GetMapping("/users/options")
    public ResponseEntity<?> getUserOptions() {
        try {
            validateAdmin();
            return ResponseEntity.ok(adminUserService.getOptions());
        } catch (ResponseStatusException error) {
            return handleControllerError("Get admin user options failed", error);
        } catch (Exception error) {
            return handleControllerError("Get admin user options failed", error);
        }
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody AdminUserRequestDto request) {
        try {
            System.out.println("Create user request: " + request);
            validateAdmin();
            return ResponseEntity.ok(adminUserService.createUser(request));
        } catch (ResponseStatusException error) {
            return handleControllerError("Create user failed", error);
        } catch (Exception error) {
            return handleControllerError("Create user failed", error);
        }
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable("userId") Long userId,
                                        @RequestBody AdminUserRequestDto request) {
        try {
            validateAdmin();
            return ResponseEntity.ok(adminUserService.updateUser(userId, request));
        } catch (ResponseStatusException error) {
            return handleControllerError("Update user failed", error);
        } catch (Exception error) {
            return handleControllerError("Update user failed", error);
        }
    }

    @PostMapping("/users/{userId}/deactivate")
    public ResponseEntity<?> deactivateUser(@PathVariable("userId") Long userId) {
        try {
            validateAdmin();
            return ResponseEntity.ok(adminUserService.updateUserActiveStatus(userId, false));
        } catch (ResponseStatusException error) {
            return handleControllerError("Deactivate user failed", error);
        } catch (Exception error) {
            return handleControllerError("Deactivate user failed", error);
        }
    }

    @PostMapping("/users/{userId}/activate")
    public ResponseEntity<?> activateUser(@PathVariable("userId") Long userId) {
        try {
            validateAdmin();
            return ResponseEntity.ok(adminUserService.updateUserActiveStatus(userId, true));
        } catch (ResponseStatusException error) {
            return handleControllerError("Activate user failed", error);
        } catch (Exception error) {
            return handleControllerError("Activate user failed", error);
        }
    }

    private void validateAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication != null && (
                authentication.getAuthorities().stream()
                        .anyMatch(authority -> isAdminAuthority(authority.getAuthority()))
                        || hasAdminPrincipalRole(authentication)
                        || hasAdminDatabaseRole(authentication)
        );

        if (!isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    private boolean hasAdminPrincipalRole(Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof UserPrincipal userPrincipal)) {
            return false;
        }

        return userPrincipal.getUser().getRoles().stream()
                .filter(role -> role != null)
                .map((Role role) -> role.name)
                .anyMatch(this::isAdminAuthority);
    }

    private boolean hasAdminDatabaseRole(Authentication authentication) {
        String username = authentication.getName();
        if (username == null || username.isBlank()) {
            return false;
        }

        return Boolean.TRUE.equals(userRepository.hasAdminRoleByUsername(username));
    }

    private boolean isAdminAuthority(String authority) {
        if (authority == null) {
            return false;
        }

        String normalizedAuthority = authority.trim();
        return "admin".equalsIgnoreCase(normalizedAuthority)
                || "role_admin".equalsIgnoreCase(normalizedAuthority);
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
}
