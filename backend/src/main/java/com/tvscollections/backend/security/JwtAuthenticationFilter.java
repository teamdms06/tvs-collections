package com.tvscollections.backend.security;

import com.tvscollections.backend.service.ActiveUserTrackerService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final CustomUserDetailsService userDetailsService;
    private final ActiveUserTrackerService activeUserTrackerService;

    public JwtAuthenticationFilter(JwtUtils jwtUtils,
                                   CustomUserDetailsService userDetailsService,
                                   ActiveUserTrackerService activeUserTrackerService) {
        this.jwtUtils = jwtUtils;
        this.userDetailsService = userDetailsService;
        this.activeUserTrackerService = activeUserTrackerService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtUtils.validateToken(token)) {
                String username = jwtUtils.getUsernameFromToken(token);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                if (hasAdminRole(userDetails)) {
                    activeUserTrackerService.markInactive(username);
                } else {
                    if (activeUserTrackerService.hasExpiredSession(username)) {
                        activeUserTrackerService.markInactive(username);
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"message\":\"Session expired due to inactivity\"}");
                        return;
                    }
                    activeUserTrackerService.markActive(username);
                }
            }
        }
        filterChain.doFilter(request, response);
    }

    private boolean hasAdminRole(UserDetails userDetails) {
        return userDetails.getAuthorities().stream()
                .anyMatch(authority -> isAdminAuthority(authority.getAuthority()));
    }

    private boolean isAdminAuthority(String authority) {
        if (authority == null) {
            return false;
        }

        String normalizedAuthority = authority.trim();
        return "admin".equalsIgnoreCase(normalizedAuthority)
                || "role_admin".equalsIgnoreCase(normalizedAuthority);
    }
}
