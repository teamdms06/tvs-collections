package com.tvscollections.backend.controller;

import com.tvscollections.backend.dto.AuthLoginRequest;
import com.tvscollections.backend.dto.AuthLoginResponse;
import com.tvscollections.backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthLoginResponse> login(@RequestBody AuthLoginRequest request) {
        System.out.println("Login attempt for email: " + request.email);
        AuthLoginResponse response = authService.login(request.email, request.password);
        return ResponseEntity.ok(response);
    }
}
