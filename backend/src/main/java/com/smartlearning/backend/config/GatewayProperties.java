package com.smartlearning.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class GatewayProperties {

    @Value("${gateway.base-url:http://localhost:4000}")
    private String baseUrl;

    @Value("${gateway.api-key:}")
    private String apiKey;

    public String getBaseUrl() {
        if (baseUrl == null || baseUrl.isBlank()) {
            return "http://localhost:4000";
        }
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    public String getApiKey() {
        return apiKey == null ? "" : apiKey;
    }
}
