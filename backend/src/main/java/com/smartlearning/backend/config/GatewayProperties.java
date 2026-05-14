package com.smartlearning.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class GatewayProperties {

    @Value("${gateway.base-url:http://localhost:4000}")
    private String baseUrl;

    @Value("${gateway.api-key:}")
    private String apiKey;

    @Value("${gateway.override-from-env:false}")
    private boolean overrideFromEnv;

    public String getBaseUrl() {
        if (baseUrl == null || baseUrl.isBlank()) {
            return "http://localhost:4000";
        }
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    public String getApiKey() {
        return apiKey == null ? "" : apiKey;
    }

    public boolean isOverrideFromEnv() {
        return overrideFromEnv;
    }
}
