package com.tvscollections.backend.controller;

import com.tvscollections.backend.dto.AgentCallLogRequestDto;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.security.UserPrincipal;
import com.tvscollections.backend.service.AgentCallLogService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/agent-call-logs")
public class AgentCallLogController {
    private final AgentCallLogService agentCallLogService;

    public AgentCallLogController(AgentCallLogService agentCallLogService) {
        this.agentCallLogService = agentCallLogService;
    }

    @PostMapping
    public ResponseEntity<?> createAgentCallLog(@RequestBody AgentCallLogRequestDto request) {
        return ResponseEntity.ok(agentCallLogService.createLog(request, getCurrentUser()));
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal userPrincipal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }
        return userPrincipal.getUser();
    }
}
