package com.tvscollections.backend.controller;

import com.tvscollections.backend.service.DialerProxyService;
import com.tvscollections.backend.security.UserPrincipal;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/dialer")
public class DialerController {
    private final DialerProxyService dialerProxyService;

    public DialerController(DialerProxyService dialerProxyService) {
        this.dialerProxyService = dialerProxyService;
    }

    @GetMapping("/my-agent-status")
    public ResponseEntity<String> getMyAgentStatus() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal userPrincipal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }
        String dialerUser = userPrincipal.getUser().dialerUser;

        if (!StringUtils.hasText(dialerUser)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dialer user is not configured");
        }

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .body(dialerProxyService.getAgentStatus(dialerUser.trim()));
    }
}
