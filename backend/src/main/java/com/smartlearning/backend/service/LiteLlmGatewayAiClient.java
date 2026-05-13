package com.smartlearning.backend.service;

import com.smartlearning.backend.util.ModelConfigUtil;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class LiteLlmGatewayAiClient implements GatewayAiClient {

    private final RestTemplate restTemplate = new RestTemplate();
    private final LiteLlmConfigService liteLlmConfigService;

    public LiteLlmGatewayAiClient(LiteLlmConfigService liteLlmConfigService) {
        this.liteLlmConfigService = liteLlmConfigService;
    }

    @Override
    public String generateImage(String prompt, String modelId, Map<String, Object> config) {
        HttpHeaders headers = buildHeaders();
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("prompt", applyPromptSizeHint(prompt, modelId, config));
        requestBody.put("model", modelId);

        Map<String, Object> configMap = new HashMap<>();
        configMap.put("n", 1);
        if (config != null) {
            configMap.putAll(config);
        }
        requestBody.putAll(configMap);

        try {
            LiteLlmConfigService.ResolvedLiteLlmConfig configInfo = requireEnabledConfig();
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                configInfo.baseUrl() + "/v1/images/generations",
                request,
                String.class
            );
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Image generation failed via LiteLLM: " + e.getMessage());
        }
    }

    @Override
    public String editImage(String prompt, String modelId, byte[] imageBytes, String filename, String contentType, Map<String, Object> config) {
        HttpHeaders headers = buildHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("prompt", applyPromptSizeHint(prompt, modelId, config));
        body.add("model", modelId);
        ByteArrayResource imageResource = new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return filename;
            }

            @Override
            public long contentLength() {
                return imageBytes.length;
            }
        };
        HttpHeaders fileHeaders = new HttpHeaders();
        if (contentType != null && !contentType.isBlank()) {
            fileHeaders.setContentType(MediaType.parseMediaType(contentType));
        }
        body.add("image", new HttpEntity<>(imageResource, fileHeaders));

        if (config != null) {
            config.forEach((key, value) -> {
                if (value != null) {
                    body.add(key, String.valueOf(value));
                }
            });
        }

        try {
            LiteLlmConfigService.ResolvedLiteLlmConfig configInfo = requireEnabledConfig();
            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                configInfo.baseUrl() + "/v1/images/edits",
                request,
                String.class
            );
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Image edit failed via LiteLLM: " + e.getMessage());
        }
    }

    @Override
    public String generateChatResponse(String systemPrompt, String userMessage, String modelName) {
        HttpHeaders headers = buildHeaders();
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", modelName);
        requestBody.put("messages", List.of(
            Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : "You are a helpful AI tutor."),
            Map.of("role", "user", "content", userMessage)
        ));

        try {
            LiteLlmConfigService.ResolvedLiteLlmConfig configInfo = requireEnabledConfig();
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                configInfo.baseUrl() + "/v1/chat/completions",
                request,
                String.class
            );
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Chat generation failed via LiteLLM: " + e.getMessage());
        }
    }

    @Override
    public String generateChatResponseWithImage(String systemPrompt, String userMessage, String imageUrl, String modelName) {
        HttpHeaders headers = buildHeaders();
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", modelName);

        List<Map<String, Object>> contentParts = new ArrayList<>();
        contentParts.add(Map.of("type", "text", "text", userMessage));
        contentParts.add(Map.of("type", "image_url", "image_url", Map.of("url", imageUrl)));

        requestBody.put("messages", List.of(
            Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : "You are a helpful AI tutor."),
            Map.of("role", "user", "content", contentParts)
        ));

        try {
            LiteLlmConfigService.ResolvedLiteLlmConfig configInfo = requireEnabledConfig();
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                configInfo.baseUrl() + "/v1/chat/completions",
                request,
                String.class
            );
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Multimodal chat generation failed via LiteLLM: " + e.getMessage());
        }
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String apiKey = liteLlmConfigService.getResolvedConfig().apiKey();
        if (!apiKey.isBlank()) {
            headers.setBearerAuth(apiKey);
        }
        return headers;
    }

    private LiteLlmConfigService.ResolvedLiteLlmConfig requireEnabledConfig() {
        LiteLlmConfigService.ResolvedLiteLlmConfig config = liteLlmConfigService.getResolvedConfig();
        if (!config.enabled()) {
            throw new RuntimeException("LiteLLM 网关当前已关闭，请先在平台配置中启用。");
        }
        return config;
    }

    private String applyPromptSizeHint(String prompt, String modelId, Map<String, Object> config) {
        if (config == null) {
            return prompt;
        }

        Object selectedSize = config.get("size");
        if (!(selectedSize instanceof String sizeValue)) {
            return prompt;
        }

        String hint = ModelConfigUtil.buildAspectRatioPromptHint(sizeValue);
        return hint.isBlank() ? prompt : prompt + hint;
    }
}
