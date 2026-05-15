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
    private final ActiveUserTrackerService activeUserTrackerService;
    private final AgentActivityService agentActivityService;

    public AuthService(AuthenticationManager authenticationManager,
                       JwtUtils jwtUtils,
                       UserRepository userRepository,
                       ProductAccessService productAccessService,
                       ActiveUserTrackerService activeUserTrackerService,
                       AgentActivityService agentActivityService) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.userRepository = userRepository;
        this.productAccessService = productAccessService;
        this.activeUserTrackerService = activeUserTrackerService;
        this.agentActivityService = agentActivityService;
    }

    public AuthLoginResponse login(String username, String password) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password)
        );

        User user = userRepository.findWithAccessByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String token = jwtUtils.generateToken(user.username);
        List<String> roles = user.getRoles().stream()
                .filter(role -> role != null && StringUtils.hasText(role.name))
                .map(role -> role.name.trim())
                .collect(Collectors.toList());
        List<String> accessProducts = productAccessService.getAccessibleProductCodes(user);
        if (hasAdminRole(roles)) {
            activeUserTrackerService.markInactive(user.username);
        } else {
            activeUserTrackerService.markActive(user.username);
            agentActivityService.recordLogin(user);
        }

        return new AuthLoginResponse(token, user.id, user.name, user.email, user.username, user.dialerUser, roles, accessProducts);
    }

    private boolean hasAdminRole(List<String> roles) {
        return roles.stream().anyMatch(role -> {
            if (role == null) {
                return false;
            }

            String normalizedRole = role.trim();
            return "admin".equalsIgnoreCase(normalizedRole)
                    || "role_admin".equalsIgnoreCase(normalizedRole);
        });
    }
}



