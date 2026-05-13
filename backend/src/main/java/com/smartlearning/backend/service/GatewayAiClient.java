package com.smartlearning.backend.service;

import java.util.Map;

public interface GatewayAiClient {
    String generateImage(String prompt, String modelId, Map<String, Object> config);
    String editImage(String prompt, String modelId, byte[] imageBytes, String filename, String contentType, Map<String, Object> config);
    String generateChatResponse(String systemPrompt, String userMessage, String modelName);
    String generateChatResponseWithImage(String systemPrompt, String userMessage, String imageUrl, String modelName);
}
