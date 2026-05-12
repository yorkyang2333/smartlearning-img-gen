package com.smartlearning.backend.service;

import java.util.Map;

public interface AiService {
    String generateImage(String prompt, String modelId, String apiKey, String baseUrl, Map<String, Object> config);
    String generateChatResponse(String systemPrompt, String userMessage, String modelName, String apiKey, String baseUrl);
}
