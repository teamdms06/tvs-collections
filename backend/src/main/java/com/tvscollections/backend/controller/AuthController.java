package com.tvscollections.backend.controller;

import com.tvscollections.backend.dto.AuthLoginRequest;
import com.tvscollections.backend.dto.AuthLoginResponse;
import com.tvscollections.backend.service.ActiveUserTrackerService;
import com.tvscollections.backend.service.AgentActivityService;
import com.tvscollections.backend.service.AuthService;
import com.tvscollections.backend.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final ActiveUserTrackerService activeUserTrackerService;
    private final AgentActivityService agentActivityService;

    public AuthController(AuthService authService,
                          ActiveUserTrackerService activeUserTrackerService,
                          AgentActivityService agentActivityService) {
        this.authService = authService;
        this.activeUserTrackerService = activeUserTrackerService;
        this.agentActivityService = agentActivityService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthLoginRequest request) {
        try {
            System.out.println("Login attempt for username: " + request.username);
            AuthLoginResponse response = authService.login(request.username, request.password);
            return ResponseEntity.ok(response);
        } catch (AuthenticationException error) {
            return handleControllerError("Login failed", HttpStatus.UNAUTHORIZED, "Invalid username or password", error);
        } catch (Exception error) {
            return handleControllerError("Login failed", HttpStatus.INTERNAL_SERVER_ERROR, error.getMessage(), error);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        try {
            if (SecurityContextHolder.getContext().getAuthentication() != null
                    && !(SecurityContextHolder.getContext().getAuthentication() instanceof AnonymousAuthenticationToken)) {
                if (SecurityContextHolder.getContext().getAuthentication().getPrincipal() instanceof UserPrincipal userPrincipal) {
                    agentActivityService.recordLogout(userPrincipal.getUser());
                }
                activeUserTrackerService.markInactive(
                        SecurityContextHolder.getContext().getAuthentication().getName()
                );
            }

            return ResponseEntity.ok().body("Logged out");
        } catch (Exception error) {
            return handleControllerError("Logout failed", HttpStatus.INTERNAL_SERVER_ERROR, error.getMessage(), error);
        }
    }

    private ResponseEntity<Map<String, String>> handleControllerError(
            String action,
            HttpStatus status,
            String message,
            Exception error
    ) {
        System.out.println(action + " with HTTP status " + status + ". Reason: " + message);
        error.printStackTrace();

        Map<String, String> body = new LinkedHashMap<>();
        body.put("error", status.toString());
        body.put("message", message != null ? message : action);
        return ResponseEntity.status(status).body(body);
    }
}
