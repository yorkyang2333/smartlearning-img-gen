package com.smartlearning.backend.service;

import com.smartlearning.backend.config.GatewayProperties;
import com.smartlearning.backend.entity.GatewayConfig;
import com.smartlearning.backend.repository.GatewayConfigRepository;
import org.springframework.stereotype.Service;

@Service
public class GatewayConfigService {

    private static final String DEFAULT_ID = "default";

    private final GatewayConfigRepository gatewayConfigRepository;
    private final GatewayProperties gatewayProperties;

    public GatewayConfigService(GatewayConfigRepository gatewayConfigRepository, GatewayProperties gatewayProperties) {
        this.gatewayConfigRepository = gatewayConfigRepository;
        this.gatewayProperties = gatewayProperties;
    }

    public GatewayConfig getOrCreate() {
        return gatewayConfigRepository.findById(DEFAULT_ID).orElseGet(() -> {
            GatewayConfig config = new GatewayConfig();
            config.setId(DEFAULT_ID);
            config.setEnabled(true);
            config.setBaseUrl(gatewayProperties.getBaseUrl());
            config.setApiKey(gatewayProperties.getApiKey());
            return gatewayConfigRepository.save(config);
        });
    }

    public GatewayConfig update(GatewayConfig incoming) {
        GatewayConfig current = getOrCreate();
        if (incoming.getEnabled() != null) {
            current.setEnabled(incoming.getEnabled());
        }
        if (incoming.getBaseUrl() != null && !incoming.getBaseUrl().isBlank()) {
            current.setBaseUrl(normalizeUrl(incoming.getBaseUrl()));
        }
        if (incoming.getApiKey() != null) {
            current.setApiKey(incoming.getApiKey());
        }
        return gatewayConfigRepository.save(current);
    }

    public ResolvedGatewayConfig getResolvedConfig() {
        GatewayConfig config = getOrCreate();
        String baseUrl = config.getBaseUrl() != null && !config.getBaseUrl().isBlank()
            ? normalizeUrl(config.getBaseUrl())
            : gatewayProperties.getBaseUrl();
        String apiKey = config.getApiKey() != null ? config.getApiKey() : gatewayProperties.getApiKey();
        boolean enabled = config.getEnabled() == null || config.getEnabled();
        return new ResolvedGatewayConfig(enabled, baseUrl, apiKey == null ? "" : apiKey);
    }

    private String normalizeUrl(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    public record ResolvedGatewayConfig(boolean enabled, String baseUrl, String apiKey) {}
}
