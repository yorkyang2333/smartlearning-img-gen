package com.smartlearning.backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseMigrationRunner implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try {
            // Force update columns to LONGTEXT to support Base64 images
            jdbcTemplate.execute("ALTER TABLE generations MODIFY COLUMN input_image_url LONGTEXT");
            jdbcTemplate.execute("ALTER TABLE generations MODIFY COLUMN output_image_url LONGTEXT");
            jdbcTemplate.execute("ALTER TABLE generations MODIFY COLUMN api_response LONGTEXT");
            System.out.println("Successfully migrated generations table TEXT columns to LONGTEXT.");
        } catch (Exception e) {
            System.err.println("Migration warning (can be ignored if columns are already LONGTEXT or table doesn't exist yet): " + e.getMessage());
        }
    }
}
