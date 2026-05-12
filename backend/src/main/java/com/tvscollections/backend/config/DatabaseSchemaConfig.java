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
    public void alignSchema() {
        try {
            jdbcTemplate.execute("ALTER TABLE upload_files MODIFY status VARCHAR(20) NOT NULL");
        } catch (Exception error) {
            System.out.println("Upload status schema check skipped: " + error.getMessage());
        }

        createIndexIfMissing(
                "upload_file_data",
                "idx_upload_file_data_product_mobile",
                "product_id, mobile_number"
        );
        createIndexIfMissing(
                "upload_file_data",
                "idx_upload_file_data_product_agreement",
                "product_id, agreement_number"
        );
        createIndexIfMissing(
                "upload_file_data",
                "idx_upload_file_data_upload_file",
                "upload_file_id"
        );
        createIndexIfMissing(
                "upload_file_data",
                "idx_upload_file_data_latest_feedback",
                "latest_feedback_id"
        );
        createIndexIfMissing(
                "upload_file_data",
                "idx_upload_file_data_created_at",
                "created_at"
        );
        createIndexIfMissing(
                "upload_files",
                "idx_upload_files_status_uploaded_at",
                "status, uploaded_at"
        );
        createIndexIfMissing(
                "upload_files",
                "idx_upload_files_product_uploaded_at",
                "product_id, uploaded_at"
        );
        createIndexIfMissing(
                "feedback",
                "idx_feedback_created_at",
                "created_at"
        );
        createIndexIfMissing(
                "feedback",
                "idx_feedback_upload_file_data_created_at",
                "upload_file_data_id, created_at"
        );
        createIndexIfMissing(
                "feedback",
                "idx_feedback_agent_created_at",
                "agent_id, created_at"
        );
    }

    private void createIndexIfMissing(String tableName, String indexName, String columns) {
        try {
            Integer indexCount = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(1)
                            FROM information_schema.statistics
                            WHERE table_schema = DATABASE()
                              AND table_name = ?
                              AND index_name = ?
                            """,
                    Integer.class,
                    tableName,
                    indexName
            );

            if (indexCount == null || indexCount > 0) {
                return;
            }

            jdbcTemplate.execute("CREATE INDEX " + indexName + " ON " + tableName + " (" + columns + ")");
        } catch (Exception error) {
            System.out.println("Index schema check skipped for " + indexName + ": " + error.getMessage());
        }
    }
}
