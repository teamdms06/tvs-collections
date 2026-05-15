package com.tvscollections.backend.service;

import com.tvscollections.backend.dto.AgentActivitySummaryDto;
import com.tvscollections.backend.dto.UserDashboardDto;
import com.tvscollections.backend.model.User;
import com.tvscollections.backend.repository.FeedbackRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class UserDashboardService {
    private final FeedbackRepository feedbackRepository;
    private final AgentActivityService agentActivityService;

    public UserDashboardService(FeedbackRepository feedbackRepository,
                                AgentActivityService agentActivityService) {
        this.feedbackRepository = feedbackRepository;
        this.agentActivityService = agentActivityService;
    }

    public UserDashboardDto getDashboard(User user) {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime tomorrowStart = today.plusDays(1).atStartOfDay();
        LocalDateTime monthStart = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime nextMonthStart = today.plusMonths(1).withDayOfMonth(1).atStartOfDay();
        AgentActivitySummaryDto activity = agentActivityService.getTodaySummary(user);

        return new UserDashboardDto(
                user.name,
                user.username,
                activity.firstLoginAt,
                activity.lastActivityAt,
                activity.lastLogoutAt,
                activity.totalWorkMinutes,
                activity.totalIdleMinutes,
                activity.spanMinutes,
                feedbackRepository.countByAgentIdAndCreatedAtBetween(user.id, todayStart, tomorrowStart),
                feedbackRepository.countByAgentIdAndCreatedAtBetween(user.id, monthStart, nextMonthStart),
                now,
                activity
        );
    }

    public UserDashboardDto recordActivityAndGetDashboard(User user) {
        agentActivityService.recordActivity(user);
        return getDashboard(user);
    }
}
