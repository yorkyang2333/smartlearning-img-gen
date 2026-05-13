package com.smartlearning.backend.config;

import com.smartlearning.backend.entity.Model;
import com.smartlearning.backend.repository.ModelRepository;
import com.smartlearning.backend.util.ModelConfigUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DatabaseMigrationRunner implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ModelRepository modelRepository;

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

        try {
            List<Model> models = modelRepository.findAll();
            boolean hasChanges = false;

            for (Model model : models) {
                String normalizedConfig = ModelConfigUtil.normalizeConfig(
                    model.getModelId(),
                    model.getType(),
                    model.getApiFormat(),
                    model.getConfig()
                );

                if (!normalizedConfig.equals(model.getConfig())) {
                    model.setConfig(normalizedConfig);
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                modelRepository.saveAll(models);
                System.out.println("Successfully normalized model size configs.");
            }
        } catch (Exception e) {
            System.err.println("Model config normalization warning: " + e.getMessage());
        }
    }
}
