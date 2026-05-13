package com.smartlearning.backend.service;

import com.smartlearning.backend.config.LiteLlmProperties;
import com.smartlearning.backend.entity.LiteLlmConfig;
import com.smartlearning.backend.repository.LiteLlmConfigRepository;
import org.springframework.stereotype.Service;

@Service
public class LiteLlmConfigService {

    private static final String DEFAULT_ID = "default";

    private final LiteLlmConfigRepository liteLlmConfigRepository;
    private final LiteLlmProperties liteLlmProperties;

    public LiteLlmConfigService(LiteLlmConfigRepository liteLlmConfigRepository, LiteLlmProperties liteLlmProperties) {
        this.liteLlmConfigRepository = liteLlmConfigRepository;
        this.liteLlmProperties = liteLlmProperties;
    }

    public LiteLlmConfig getOrCreate() {
        return liteLlmConfigRepository.findById(DEFAULT_ID).orElseGet(() -> {
            LiteLlmConfig config = new LiteLlmConfig();
            config.setId(DEFAULT_ID);
            config.setEnabled(true);
            config.setBaseUrl(liteLlmProperties.getBaseUrl());
            config.setApiKey(liteLlmProperties.getApiKey());
            return liteLlmConfigRepository.save(config);
        });
    }

    public LiteLlmConfig update(LiteLlmConfig incoming) {
        LiteLlmConfig current = getOrCreate();
        if (incoming.getEnabled() != null) {
            current.setEnabled(incoming.getEnabled());
        }
        if (incoming.getBaseUrl() != null && !incoming.getBaseUrl().isBlank()) {
            current.setBaseUrl(normalizeUrl(incoming.getBaseUrl()));
        }
        if (incoming.getApiKey() != null) {
            current.setApiKey(incoming.getApiKey());
        }
        return liteLlmConfigRepository.save(current);
    }

    public ResolvedLiteLlmConfig getResolvedConfig() {
        LiteLlmConfig config = getOrCreate();
        String baseUrl = config.getBaseUrl() != null && !config.getBaseUrl().isBlank()
            ? normalizeUrl(config.getBaseUrl())
            : liteLlmProperties.getBaseUrl();
        String apiKey = config.getApiKey() != null ? config.getApiKey() : liteLlmProperties.getApiKey();
        boolean enabled = config.getEnabled() == null || config.getEnabled();
        return new ResolvedLiteLlmConfig(enabled, baseUrl, apiKey == null ? "" : apiKey);
    }

    private String normalizeUrl(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    public record ResolvedLiteLlmConfig(boolean enabled, String baseUrl, String apiKey) {}
}
