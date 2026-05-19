package com.smartlearning.backend.config;

import com.smartlearning.backend.entity.Model;
import com.smartlearning.backend.entity.TutorConfig;
import com.smartlearning.backend.entity.GatewayConfig;
import com.smartlearning.backend.repository.GatewayConfigRepository;
import com.smartlearning.backend.repository.ModelRepository;
import com.smartlearning.backend.repository.TutorConfigRepository;
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

    @Autowired
    private TutorConfigRepository tutorConfigRepository;

    @Autowired
    private GatewayConfigRepository gatewayConfigRepository;

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

                if (model.getApiEndpointId() != null) {
                    model.setApiEndpointId(null);
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

        try {
            List<TutorConfig> configs = tutorConfigRepository.findAll();
            boolean hasChanges = false;
            for (TutorConfig config : configs) {
                if (config.getApiEndpointId() != null) {
                    config.setApiEndpointId(null);
                    hasChanges = true;
                }
            }
            if (hasChanges) {
                tutorConfigRepository.saveAll(configs);
                System.out.println("Successfully detached tutor configs from legacy endpoints.");
            }
        } catch (Exception e) {
            System.err.println("Tutor config migration warning: " + e.getMessage());
        }

        try {
            gatewayConfigRepository.findById("default").ifPresentOrElse(config -> {
                if ("http://localhost:4000".equals(config.getBaseUrl())) {
                    config.setBaseUrl("https://ai-generating.com");
                    config.setApiKey("");
                    gatewayConfigRepository.save(config);
                    System.out.println("Migrated gateway config baseUrl to https://ai-generating.com");
                }
            }, () -> {
                GatewayConfig config = new GatewayConfig();
                config.setId("default");
                gatewayConfigRepository.save(config);
                System.out.println("Successfully created default AI API config row.");
            });
        } catch (Exception e) {
            System.err.println("AI API config bootstrap warning: " + e.getMessage());
        }

        try {
            if (modelRepository.findByModelId("gpt-image-2").isEmpty()) {
                Model gptImage2 = new Model();
                gptImage2.setName("GPT Image 2");
                gptImage2.setModelId("gpt-image-2");
                gptImage2.setType("BOTH");
                gptImage2.setProvider("openai");
                gptImage2.setDescription("优质AI图像生成与编辑（经 APIMart 路由）");
                gptImage2.setApiFormat("openai");
                gptImage2.setConfig(ModelConfigUtil.buildImageConfigJson("gpt-image-2", "openai"));
                gptImage2.setApiEndpointId(null);
                modelRepository.save(gptImage2);
                System.out.println("Successfully seeded gpt-image-2 model.");
            }
        } catch (Exception e) {
            System.err.println("gpt-image-2 seeding warning: " + e.getMessage());
        }
    }
}
