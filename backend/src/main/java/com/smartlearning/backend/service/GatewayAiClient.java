package com.smartlearning.backend.service;

import com.smartlearning.backend.entity.Model;
import java.util.Map;

public interface GatewayAiClient {
    String generateImage(String prompt, Model model, Map<String, Object> config);
    String editImage(String prompt, Model model, byte[] imageBytes, String filename, String contentType, Map<String, Object> config);
    String generateChatResponse(String systemPrompt, String userMessage, String modelName);
    String generateChatResponseWithImage(String systemPrompt, String userMessage, String imageUrl, String modelName);
    void generateChatStream(String systemPrompt, String userMessage, String modelName, java.util.function.Consumer<String> onNext, Runnable onComplete, java.util.function.Consumer<Throwable> onError);
}
