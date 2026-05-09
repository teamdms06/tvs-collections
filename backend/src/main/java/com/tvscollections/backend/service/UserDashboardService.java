package com.tvscollections.backend.service;

import com.tvscollections.backend.dto.ActiveUserDto;
import com.tvscollections.backend.dto.UserDashboardDto;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.repository.FeedbackRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class UserDashboardService {
    private final FeedbackRepository feedbackRepository;
    private final ActiveUserTrackerService activeUserTrackerService;

    public UserDashboardService(FeedbackRepository feedbackRepository,
                                ActiveUserTrackerService activeUserTrackerService) {
        this.feedbackRepository = feedbackRepository;
        this.activeUserTrackerService = activeUserTrackerService;
    }

    public UserDashboardDto getDashboard(User user) {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime tomorrowStart = today.plusDays(1).atStartOfDay();
        LocalDateTime monthStart = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime nextMonthStart = today.plusMonths(1).withDayOfMonth(1).atStartOfDay();
        ActiveUserDto session = activeUserTrackerService.getSession(user.username);

        LocalDateTime loginTime = session != null ? session.loginTime : null;
        LocalDateTime workStart = loginTime != null && loginTime.isAfter(todayStart) ? loginTime : todayStart;
        long todayWorkingMinutes = loginTime == null ? 0 : Math.max(0, Duration.between(workStart, now).toMinutes());

        return new UserDashboardDto(
                user.name,
                user.username,
                loginTime,
                session != null ? session.lastSeenAt : null,
                todayWorkingMinutes,
                feedbackRepository.countByAgentIdAndCreatedAtBetween(user.id, todayStart, tomorrowStart),
                feedbackRepository.countByAgentIdAndCreatedAtBetween(user.id, monthStart, nextMonthStart),
                now
        );
    }
}
