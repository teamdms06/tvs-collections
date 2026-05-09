package com.tvscollections.backend.service;

import com.tvscollections.backend.dto.ActiveUserDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ActiveUserTrackerService {
    private final Map<String, UserSession> sessionsByUsername = new ConcurrentHashMap<>();
    private final Duration sessionWindow;

    public ActiveUserTrackerService(@Value("${active-user.session-timeout-ms:1800000}") long sessionTimeoutMs) {
        this.sessionWindow = Duration.ofMillis(sessionTimeoutMs);
    }

    public void markActive(String username) {
        String normalizedUsername = normalizeUsername(username);
        if (normalizedUsername == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        sessionsByUsername.compute(normalizedUsername, (key, session) -> {
            if (session == null) {
                return new UserSession(now, now);
            }

            session.lastSeenAt = now;
            return session;
        });
        removeExpiredUsers();
    }

    public void markInactive(String username) {
        String normalizedUsername = normalizeUsername(username);
        if (normalizedUsername == null) {
            return;
        }

        sessionsByUsername.remove(normalizedUsername);
    }

    public List<ActiveUserDto> getActiveUsers() {
        removeExpiredUsers();
        return sessionsByUsername.entrySet().stream()
                .map(entry -> new ActiveUserDto(entry.getKey(), entry.getValue().loginTime, entry.getValue().lastSeenAt))
                .sorted(Comparator.comparing((ActiveUserDto user) -> user.lastSeenAt).reversed())
                .toList();
    }

    public ActiveUserDto getSession(String username) {
        removeExpiredUsers();
        String normalizedUsername = normalizeUsername(username);
        if (normalizedUsername == null) {
            return null;
        }

        UserSession session = sessionsByUsername.get(normalizedUsername);
        if (session == null) {
            return null;
        }

        return new ActiveUserDto(normalizedUsername, session.loginTime, session.lastSeenAt);
    }

    public boolean hasExpiredSession(String username) {
        String normalizedUsername = normalizeUsername(username);
        if (normalizedUsername == null) {
            return true;
        }

        UserSession session = sessionsByUsername.get(normalizedUsername);
        if (session == null) {
            return false;
        }

        return session.lastSeenAt.isBefore(LocalDateTime.now().minus(sessionWindow));
    }

    public long getActiveUserCount() {
        return getActiveUsers().size();
    }

    private void removeExpiredUsers() {
        LocalDateTime cutoff = LocalDateTime.now().minus(sessionWindow);
        sessionsByUsername.entrySet().removeIf(entry -> entry.getValue().lastSeenAt.isBefore(cutoff));
    }

    private String normalizeUsername(String username) {
        if (username == null || username.isBlank()) {
            return null;
        }

        return username.trim();
    }

    private static class UserSession {
        private final LocalDateTime loginTime;
        private LocalDateTime lastSeenAt;

        private UserSession(LocalDateTime loginTime, LocalDateTime lastSeenAt) {
            this.loginTime = loginTime;
            this.lastSeenAt = lastSeenAt;
        }
    }
}
