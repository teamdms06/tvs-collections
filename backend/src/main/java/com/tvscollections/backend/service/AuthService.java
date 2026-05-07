package com.tvscollections.backend.service;

import com.tvscollections.backend.dto.AuthLoginResponse;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.repository.UserRepository;
import com.tvscollections.backend.security.JwtUtils;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    private final ProductAccessService productAccessService;

    public AuthService(AuthenticationManager authenticationManager,
                       JwtUtils jwtUtils,
                       UserRepository userRepository,
                       ProductAccessService productAccessService) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.userRepository = userRepository;
        this.productAccessService = productAccessService;
    }

    public AuthLoginResponse login(String email, String password) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        User user = userRepository.findWithAccessByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String token = jwtUtils.generateToken(email);
        List<String> roles = user.getRoles().stream()
                .filter(role -> role != null && StringUtils.hasText(role.name))
                .map(role -> role.name.trim())
                .collect(Collectors.toList());
        List<String> accessProducts = productAccessService.getAccessibleProductCodes(user);

        return new AuthLoginResponse(token, user.id, user.name, user.email, roles, accessProducts);
    }
}



