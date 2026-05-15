package com.tvscollections.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public class AdminDashboardDto {
    public Long uploadedFiles;
    public Long totalLeads;
    public Long totalFeedback;
    public Long feedbackToday;
    public Long totalUsers;
    public Long enabledUsers;
    public Long activeUsers;
    public Long uploadedToday;
    public LocalDateTime generatedAt;
    public List<ProductCountDto> productCounts;
    public List<ActiveUserDto> activeUserSessions;
    public List<AgentActivitySummaryDto> agentActivities;
    public List<RecentUploadDto> recentUploads;

    public AdminDashboardDto(Long uploadedFiles,
                             Long totalLeads,
                             Long totalFeedback,
                             Long feedbackToday,
                             Long totalUsers,
                             Long enabledUsers,
                             Long activeUsers,
                             Long uploadedToday,
                             LocalDateTime generatedAt,
                             List<ProductCountDto> productCounts,
                             List<ActiveUserDto> activeUserSessions,
                             List<AgentActivitySummaryDto> agentActivities,
                             List<RecentUploadDto> recentUploads) {
        this.uploadedFiles = uploadedFiles;
        this.totalLeads = totalLeads;
        this.totalFeedback = totalFeedback;
        this.feedbackToday = feedbackToday;
        this.totalUsers = totalUsers;
        this.enabledUsers = enabledUsers;
        this.activeUsers = activeUsers;
        this.uploadedToday = uploadedToday;
        this.generatedAt = generatedAt;
        this.productCounts = productCounts;
        this.activeUserSessions = activeUserSessions;
        this.agentActivities = agentActivities;
        this.recentUploads = recentUploads;
    }
}
