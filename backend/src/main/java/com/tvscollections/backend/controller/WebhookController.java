package com.tvscollections.backend.controller;

import com.tvscollections.backend.dto.HitCallLogRequestDto;
import com.tvscollections.backend.dto.HitCallLogDto;
import com.tvscollections.backend.service.HitCallAgentResolverService;
import com.tvscollections.backend.service.HitCallLogService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/webhook")
public class WebhookController {
    private final HitCallLogService hitCallLogService;
    private final HitCallAgentResolverService hitCallAgentResolverService;
    private final String hitCallSecret;

    public WebhookController(HitCallLogService hitCallLogService,
                             HitCallAgentResolverService hitCallAgentResolverService,
                             @Value("${hit-call.webhook-secret:}") String hitCallSecret) {
        this.hitCallLogService = hitCallLogService;
        this.hitCallAgentResolverService = hitCallAgentResolverService;
        this.hitCallSecret = hitCallSecret;
    }

    @PostMapping("/hit-calls")
    public ResponseEntity<?> createHitCall(@RequestHeader(value = "X-Hit-Call-Secret", required = false) String secret,
                                           @RequestBody HitCallLogRequestDto request) {
        if (StringUtils.hasText(hitCallSecret) && !hitCallSecret.equals(secret)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid hit call webhook secret");
        }

        HitCallLogDto hitCallLog = hitCallLogService.createLog(request, null);
        hitCallAgentResolverService.resolveAgentCallAsync(hitCallLog, request);

        return ResponseEntity.ok(hitCallLog);
    }
}
