package com.smartlearning.backend.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiServiceImpl implements AiService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String generateImage(String prompt, String modelId, String apiKey, String baseUrl, Map<String, Object> config) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("prompt", prompt);
        requestBody.put("model", modelId);
        
        if (config != null) {
            requestBody.putAll(config);
        }

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(baseUrl + "/images/generations", request, String.class);
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Image generation failed: " + e.getMessage());
        }
    }

    @Override
    public String generateChatResponse(String systemPrompt, String userMessage, String modelName, String apiKey, String baseUrl) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", modelName);
        
        List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : "You are a helpful AI tutor."),
                Map.of("role", "user", "content", userMessage)
        );
        requestBody.put("messages", messages);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(baseUrl + "/chat/completions", request, String.class);
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Chat generation failed: " + e.getMessage());
        }
    }
}
