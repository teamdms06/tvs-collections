package com.tvscollections.backend.service;

import com.tvscollections.backend.dto.AgentActivityPunchDto;
import com.tvscollections.backend.dto.AgentActivitySummaryDto;
import com.tvscollections.backend.model.AgentActivitySession;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.repository.AgentActivitySessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AgentActivityService {
    private final AgentActivitySessionRepository activitySessionRepository;
    private final Duration idleThreshold;

    public AgentActivityService(AgentActivitySessionRepository activitySessionRepository,
                                @Value("${agent-activity.idle-threshold-ms:300000}") long idleThresholdMs) {
        this.activitySessionRepository = activitySessionRepository;
        this.idleThreshold = Duration.ofMillis(idleThresholdMs);
    }

    @Transactional
    public AgentActivitySession recordLogin(User user) {
        if (user == null || user.id == null) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        AgentActivitySession session = activitySessionRepository
                .findTopByUserIdAndLogoutAtIsNullOrderByLoginAtDesc(user.id)
                .orElseGet(AgentActivitySession::new);

        if (session.id != null && !today.equals(session.activityDate)) {
            session.logoutAt = session.lastActivityAt != null ? session.lastActivityAt : session.loginAt;
            activitySessionRepository.save(session);
            session = new AgentActivitySession();
        }

        if (session.id == null) {
            session.user = user;
            session.activityDate = today;
            session.loginAt = now;
            session.idleSeconds = 0L;
        }

        session.lastActivityAt = now;
        return activitySessionRepository.save(session);
    }

    @Transactional
    public void recordActivity(User user) {
        if (user == null || user.id == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        AgentActivitySession session = activitySessionRepository
                .findTopByUserIdAndLogoutAtIsNullOrderByLoginAtDesc(user.id)
                .orElse(null);

        if (session == null) {
            return;
        }

        addIdleGap(session, now);
        session.lastActivityAt = now;
        activitySessionRepository.save(session);
    }

    @Transactional
    public void recordLogout(User user) {
        if (user == null || user.id == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        activitySessionRepository.findTopByUserIdAndLogoutAtIsNullOrderByLoginAtDesc(user.id)
                .ifPresent(session -> {
                    addIdleGap(session, now);
                    session.lastActivityAt = now;
                    session.logoutAt = now;
                    activitySessionRepository.save(session);
                });
    }

    @Transactional(readOnly = true)
    public AgentActivitySummaryDto getTodaySummary(User user) {
        if (user == null || user.id == null) {
            return emptySummary(null, LocalDate.now());
        }

        LocalDate activityDate = LocalDate.now();
        return toSummary(
                user,
                activityDate,
                activitySessionRepository.findByUserIdAndActivityDateOrderByLoginAtAsc(user.id, activityDate)
        );
    }

    @Transactional(readOnly = true)
    public List<AgentActivitySummaryDto> getTodaySummaries() {
        LocalDate activityDate = LocalDate.now();
        Map<Long, List<AgentActivitySession>> sessionsByUser = new LinkedHashMap<>();

        for (AgentActivitySession session : activitySessionRepository.findNonAdminSessionsByActivityDate(activityDate)) {
            if (session.user == null || session.user.id == null) {
                continue;
            }

            sessionsByUser.computeIfAbsent(session.user.id, ignored -> new ArrayList<>()).add(session);
        }

        return sessionsByUser.values().stream()
                .map(sessions -> toSummary(sessions.get(0).user, activityDate, sessions))
                .toList();
    }

    private void addIdleGap(AgentActivitySession session, LocalDateTime now) {
        if (session.lastActivityAt == null || now == null || now.isBefore(session.lastActivityAt)) {
            return;
        }

        long gapSeconds = Duration.between(session.lastActivityAt, now).toSeconds();
        if (gapSeconds > idleThreshold.toSeconds()) {
            session.idleSeconds = Math.max(0L, session.idleSeconds == null ? 0L : session.idleSeconds) + gapSeconds;
        }
    }

    private AgentActivitySummaryDto toSummary(User user, LocalDate activityDate, List<AgentActivitySession> sessions) {
        if (sessions == null || sessions.isEmpty()) {
            return emptySummary(user, activityDate);
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime firstLoginAt = null;
        LocalDateTime lastLogoutAt = null;
        LocalDateTime lastActivityAt = null;
        long totalWorkMinutes = 0;
        long totalIdleMinutes = 0;
        boolean active = false;
        List<AgentActivityPunchDto> punches = new ArrayList<>();

        for (AgentActivitySession session : sessions) {
            LocalDateTime sessionEnd = session.logoutAt != null ? session.logoutAt : now;
            long workMinutes = Math.max(0, Duration.between(session.loginAt, sessionEnd).toMinutes());
            long idleMinutes = Math.max(0, (session.idleSeconds == null ? 0L : session.idleSeconds) / 60);

            if (firstLoginAt == null || session.loginAt.isBefore(firstLoginAt)) {
                firstLoginAt = session.loginAt;
            }
            if (session.logoutAt != null && (lastLogoutAt == null || session.logoutAt.isAfter(lastLogoutAt))) {
                lastLogoutAt = session.logoutAt;
            }
            if (session.lastActivityAt != null && (lastActivityAt == null || session.lastActivityAt.isAfter(lastActivityAt))) {
                lastActivityAt = session.lastActivityAt;
            }

            active = active || session.logoutAt == null;
            totalWorkMinutes += workMinutes;
            totalIdleMinutes += idleMinutes;
            punches.add(new AgentActivityPunchDto(
                    session.loginAt,
                    session.logoutAt,
                    session.lastActivityAt,
                    workMinutes,
                    idleMinutes
            ));
        }

        LocalDateTime spanEnd = active ? now : lastLogoutAt;
        long spanMinutes = firstLoginAt == null || spanEnd == null
                ? 0
                : Math.max(0, Duration.between(firstLoginAt, spanEnd).toMinutes());

        return new AgentActivitySummaryDto(
                user == null ? null : user.id,
                user == null ? null : user.name,
                user == null ? null : user.username,
                activityDate,
                firstLoginAt,
                lastLogoutAt,
                lastActivityAt,
                active,
                totalWorkMinutes,
                totalIdleMinutes,
                spanMinutes,
                punches.size(),
                punches
        );
    }

    private AgentActivitySummaryDto emptySummary(User user, LocalDate activityDate) {
        return new AgentActivitySummaryDto(
                user == null ? null : user.id,
                user == null ? null : user.name,
                user == null ? null : user.username,
                activityDate,
                null,
                null,
                null,
                false,
                0L,
                0L,
                0L,
                0,
                List.of()
        );
    }
}
