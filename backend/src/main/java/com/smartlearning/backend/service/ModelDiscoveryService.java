package com.smartlearning.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartlearning.backend.entity.ApiEndpoint;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ModelDiscoveryService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> discoverModels(ApiEndpoint endpoint) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, String>> imageModels = new ArrayList<>();
        List<Map<String, String>> textModels = new ArrayList<>();

        if ("gemini".equalsIgnoreCase(endpoint.getApiFormat())) {
            // Gemini API format for listing models
            HttpHeaders headers = new HttpHeaders();
            try {
                String url = endpoint.getBaseUrl() + "/models?key=" + endpoint.getApiKey();
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
                JsonNode root = objectMapper.readTree(response.getBody());
                
                if (root.has("models")) {
                    for (JsonNode modelNode : root.get("models")) {
                        String name = modelNode.has("name") ? modelNode.get("name").asText().replace("models/", "") : "";
                        String displayName = modelNode.has("displayName") ? modelNode.get("displayName").asText() : name;
                        
                        Map<String, String> modelInfo = new HashMap<>();
                        modelInfo.put("id", name);
                        modelInfo.put("name", displayName);
                        modelInfo.put("provider", "google");
                        
                        String type = classifyModel(name);
                        if ("TEXT_TO_IMAGE".equals(type) || "BOTH".equals(type)) {
                            imageModels.add(modelInfo);
                        } else {
                            textModels.add(modelInfo);
                        }
                    }
                }
            } catch (Exception e) {
                result.put("success", false);
                result.put("error", "Failed to discover Gemini models: " + e.getMessage());
                return result;
            }
        } else {
            // OpenAI API format
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(endpoint.getApiKey());
            
            try {
                String url = endpoint.getBaseUrl() + "/models";
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
                JsonNode root = objectMapper.readTree(response.getBody());
                
                if (root.has("data") && root.get("data").isArray()) {
                    for (JsonNode modelNode : root.get("data")) {
                        String id = modelNode.has("id") ? modelNode.get("id").asText() : "";
                        String ownedBy = modelNode.has("owned_by") ? modelNode.get("owned_by").asText() : "unknown";
                        
                        if (id.isEmpty()) continue;
                        
                        Map<String, String> modelInfo = new HashMap<>();
                        modelInfo.put("id", id);
                        modelInfo.put("name", id);
                        modelInfo.put("provider", ownedBy);
                        
                        String type = classifyModel(id);
                        if ("TEXT_TO_IMAGE".equals(type) || "BOTH".equals(type)) {
                            imageModels.add(modelInfo);
                        } else {
                            textModels.add(modelInfo);
                        }
                    }
                }
            } catch (Exception e) {
                result.put("success", false);
                result.put("error", "Failed to discover OpenAI-compatible models: " + e.getMessage());
                return result;
            }
        }
        
        result.put("success", true);
        result.put("imageModels", imageModels);
        result.put("textModels", textModels);
        return result;
    }

    private String classifyModel(String modelId) {
        String lowerId = modelId.toLowerCase();
        
        // Image generation keywords
        if (lowerId.contains("dall-e") || 
            lowerId.contains("image") || 
            lowerId.contains("stable-diffusion") || 
            lowerId.contains("flux") || 
            lowerId.contains("midjourney") ||
            lowerId.contains("mj")) {
            return "TEXT_TO_IMAGE";
        }
        
        // Text generation keywords
        if (lowerId.contains("gpt") || 
            lowerId.contains("claude") || 
            lowerId.contains("gemini") || 
            lowerId.contains("deepseek") || 
            lowerId.contains("qwen") || 
            lowerId.contains("o3") || 
            lowerId.contains("o4") ||
            lowerId.contains("llama") ||
            lowerId.contains("mistral")) {
            return "TEXT_GENERATION";
        }
        
        return "UNKNOWN"; // Can be decided by the user
    }
}
