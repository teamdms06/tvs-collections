package com.tvscollections.backend.config;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSchemaConfig {
    private final JdbcTemplate jdbcTemplate;

    public DatabaseSchemaConfig(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void alignUploadStatusColumn() {
        try {
            jdbcTemplate.execute("ALTER TABLE upload_files MODIFY status VARCHAR(20) NOT NULL");
        } catch (Exception error) {
            System.out.println("Upload status schema check skipped: " + error.getMessage());
        }
    }
}
