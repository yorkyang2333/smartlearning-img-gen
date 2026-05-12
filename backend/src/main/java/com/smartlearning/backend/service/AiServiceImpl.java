package com.smartlearning.backend.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiServiceImpl implements AiService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String generateImage(String prompt, String modelId, String apiKey, String baseUrl, String apiFormat, Map<String, Object> config) {
        boolean isGeminiFormat = "gemini".equalsIgnoreCase(apiFormat);
        boolean isGoogleApi = baseUrl != null && baseUrl.contains("generativelanguage.googleapis.com");

        if (isGeminiFormat && isGoogleApi) {
            // 1. Google Native Gemini API format
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", apiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("contents", List.of(Map.of(
                "role", "user", 
                "parts", List.of(Map.of("text", prompt))
            )));
            
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("responseModalities", List.of("IMAGE", "TEXT"));
            requestBody.put("generationConfig", generationConfig);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            try {
                String finalUrl = baseUrl;
                if (!baseUrl.contains("/v1")) {
                    finalUrl = baseUrl.endsWith("/") ? baseUrl + "v1beta" : baseUrl + "/v1beta";
                }
                
                String endpoint = finalUrl + "/models/" + modelId + ":generateContent";
                ResponseEntity<String> response = restTemplate.postForEntity(endpoint, request, String.class);
                return response.getBody();
            } catch (Exception e) {
                throw new RuntimeException("Image generation failed (Google Native): " + e.getMessage());
            }
        } else {
            // 2. Proxy or OpenAI format (e.g. ChatAnywhere, OpenAI Native)
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> requestBody = new HashMap<>();
            
            // Check if the model is likely a text model that generates images via Chat Completions
            boolean useChatCompletion = modelId.toLowerCase().contains("gemini") || modelId.toLowerCase().contains("claude");
            
            try {
                String endpoint = baseUrl;
                if (endpoint.endsWith("/")) {
                    endpoint = endpoint.substring(0, endpoint.length() - 1);
                }
                if (endpoint.endsWith("/v1")) {
                    endpoint = endpoint.substring(0, endpoint.length() - 3);
                }
                
                if (useChatCompletion) {
                    // Send chat completion request
                    endpoint += "/v1/chat/completions";
                    
                    requestBody.put("model", modelId);
                    requestBody.put("messages", List.of(
                        Map.of("role", "system", "content", "You are an AI image generator. Please directly output an image based on the prompt."),
                        Map.of("role", "user", "content", prompt)
                    ));
                    
                } else {
                    // Send standard image generation request
                    endpoint += "/v1/images/generations";

                    
                    requestBody.put("prompt", prompt);
                    requestBody.put("model", modelId);
                    
                    Map<String, Object> configMap = new HashMap<>();
                    configMap.put("n", 1);
                    configMap.put("size", "1024x1024");
                    if (config != null) {
                        configMap.putAll(config);
                    }
                    requestBody.putAll(configMap);
                }

                HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
                ResponseEntity<String> response = restTemplate.postForEntity(endpoint, request, String.class);
                return response.getBody();
            } catch (Exception e) {
                throw new RuntimeException("Image generation failed (Proxy API): " + e.getMessage());
            }
        }
    }

    @Override
    public String generateChatResponse(String systemPrompt, String userMessage, String modelName, String apiKey, String baseUrl, String apiFormat) {
        if ("gemini".equalsIgnoreCase(apiFormat)) {
            // Gemini API format
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", apiKey);

            Map<String, Object> requestBody = new HashMap<>();
            Map<String, Object> systemInstruction = new HashMap<>();
            systemInstruction.put("parts", List.of(Map.of("text", systemPrompt != null ? systemPrompt : "You are a helpful AI tutor.")));
            requestBody.put("systemInstruction", systemInstruction);

            List<Map<String, Object>> contents = List.of(
                    Map.of("role", "user", "parts", List.of(Map.of("text", userMessage)))
            );
            requestBody.put("contents", contents);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            try {
                String endpoint = baseUrl + "/models/" + modelName + ":generateContent";
                ResponseEntity<String> response = restTemplate.postForEntity(endpoint, request, String.class);
                return response.getBody();
            } catch (Exception e) {
                throw new RuntimeException("Chat generation failed: " + e.getMessage());
            }
        } else {
            // OpenAI API format (default)
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

    @Override
    public String generateChatResponseWithImage(String systemPrompt, String userMessage, String imageUrl, String modelName, String apiKey, String baseUrl, String apiFormat) {
        if ("gemini".equalsIgnoreCase(apiFormat)) {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", apiKey);

            Map<String, Object> requestBody = new HashMap<>();
            Map<String, Object> systemInstruction = new HashMap<>();
            systemInstruction.put("parts", List.of(Map.of("text", systemPrompt != null ? systemPrompt : "You are a helpful AI tutor.")));
            requestBody.put("systemInstruction", systemInstruction);

            Map<String, Object> textPart = Map.of("text", userMessage);
            Map<String, Object> imagePart = new HashMap<>();
            if (imageUrl.startsWith("data:")) {
                String[] parts = imageUrl.split(",");
                String mimeType = parts[0].split(":")[1].split(";")[0];
                String base64Data = parts[1];
                imagePart.put("inlineData", Map.of("mimeType", mimeType, "data", base64Data));
            } else {
                // If it's a URL, Gemini requires File API or slightly different format depending on the exact endpoint, 
                // but usually for simplicity we assume base64 or public URL.
                // For now, let's support data URI which is common in our app.
                imagePart.put("text", "[Image: " + imageUrl + "]");
            }

            List<Map<String, Object>> contents = List.of(
                    Map.of("role", "user", "parts", List.of(textPart, imagePart))
            );
            requestBody.put("contents", contents);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            try {
                String endpoint = baseUrl + "/models/" + modelName + ":generateContent";
                ResponseEntity<String> response = restTemplate.postForEntity(endpoint, request, String.class);
                return response.getBody();
            } catch (Exception e) {
                throw new RuntimeException("Multimodal chat generation failed: " + e.getMessage());
            }
        } else {
            // OpenAI Vision format
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", modelName);
            
            List<Map<String, Object>> contentParts = new ArrayList<>();
            contentParts.add(Map.of("type", "text", "text", userMessage));
            contentParts.add(Map.of("type", "image_url", "image_url", Map.of("url", imageUrl)));

            List<Map<String, Object>> messages = List.of(
                    Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : "You are a helpful AI tutor."),
                    Map.of("role", "user", "content", contentParts)
            );
            requestBody.put("messages", messages);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            try {
                ResponseEntity<String> response = restTemplate.postForEntity(baseUrl + "/chat/completions", request, String.class);
                return response.getBody();
            } catch (Exception e) {
                throw new RuntimeException("Multimodal chat generation failed: " + e.getMessage());
            }
        }
    }
}
