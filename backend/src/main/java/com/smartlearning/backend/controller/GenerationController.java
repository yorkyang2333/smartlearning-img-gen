package com.smartlearning.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartlearning.backend.entity.*;
import com.smartlearning.backend.repository.*;
import com.smartlearning.backend.service.AiService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/generate")
public class GenerationController {

    @Autowired
    private GenerationRepository generationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AiService aiService;

    @Autowired
    private ModelRepository modelRepository;

    @Autowired
    private ApiEndpointRepository apiEndpointRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private TutorConfigRepository tutorConfigRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/text-to-image")
    public ResponseEntity<?> textToImage(@RequestBody GenerationRequest request) {
        return processGeneration(request.getPrompt(), request.getModelId(), request.getSize(), request.getConversationId(), null);
    }

    @PostMapping("/image-to-image")
    public ResponseEntity<?> imageToImage(
            @RequestParam("prompt") String prompt,
            @RequestParam("modelId") String modelId,
            @RequestParam("size") String size,
            @RequestParam(value = "conversationId", required = false) String conversationId,
            @RequestParam("image") MultipartFile image) {
        // Mock uploading image for now, and process generation
        return processGeneration(prompt, modelId, size, conversationId, "mock_uploaded_image_url");
    }

    private ResponseEntity<?> processGeneration(String prompt, String modelId, String size, String conversationId, String inputImageUrl) {
        try {
            UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();

            // 1. Fetch Model and API Key from database
            Model aiModel = modelRepository.findByModelId(modelId).orElse(null);
            if (aiModel == null) {
                aiModel = modelRepository.findAll().stream().findFirst().orElseThrow(() -> new RuntimeException("No AI Model configured"));
            }

            ApiEndpoint endpoint = apiEndpointRepository.findById(aiModel.getApiEndpointId())
                    .orElseThrow(() -> new RuntimeException("API Endpoint not found for model"));

            String apiKey = endpoint.getApiKey();
            String baseUrl = endpoint.getBaseUrl();
            String apiFormat = aiModel.getApiFormat();

            Map<String, Object> config = new HashMap<>();
            if (size != null && !size.isEmpty()) {
                config.put("size", size);
            }

            // Create conversation if needed
            if (conversationId == null || conversationId.isEmpty()) {
                Conversation conv = new Conversation();
                conv.setUserId(user.getId());
                conv.setTitle(prompt.length() > 20 ? prompt.substring(0, 20) + "..." : prompt);
                conversationId = conversationRepository.save(conv).getId();
            }

            long startTime = System.currentTimeMillis();
            
            // 2. Call AI Service
            String apiResponse = aiService.generateImage(prompt, aiModel.getModelId(), apiKey, baseUrl, apiFormat, config);
            
            long durationMs = System.currentTimeMillis() - startTime;

            // Extract image URL from response
            String outputImageUrl = extractImageUrl(apiResponse, apiFormat);

            // 3. Save to DB
            Generation generation = new Generation();
            generation.setUserId(user.getId());
            generation.setModelId(aiModel.getModelId());
            generation.setType(aiModel.getType());
            generation.setPrompt(prompt);
            generation.setInputImageUrl(inputImageUrl);
            generation.setOutputImageUrl(outputImageUrl);
            generation.setSize(size);
            generation.setDurationMs((int) durationMs);
            generation.setConversationId(conversationId);
            
            // Generate tutor analysis asynchronously
            generateTutorAnalysisAsync(generation, user, prompt);

            generation = generationRepository.save(generation);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("rawUrl", outputImageUrl);
            result.put("conversationId", conversationId);
            result.put("data", Map.of("durationMs", durationMs));
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    private String extractImageUrl(String apiResponse, String apiFormat) {
        try {
            JsonNode root = objectMapper.readTree(apiResponse);
            if ("gemini".equalsIgnoreCase(apiFormat)) {
                // Parse gemini format (mock parsing since gemini text-to-image is rarely used directly via this endpoint)
                if (root.has("predictions") && root.get("predictions").isArray() && root.get("predictions").size() > 0) {
                    JsonNode pred = root.get("predictions").get(0);
                    if (pred.has("bytesBase64Encoded")) {
                        return "data:image/png;base64," + pred.get("bytesBase64Encoded").asText();
                    }
                }
            } else {
                // OpenAI format
                if (root.has("data") && root.get("data").isArray() && root.get("data").size() > 0) {
                    return root.get("data").get(0).get("url").asText();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    private void generateTutorAnalysisAsync(Generation generation, User student, String prompt) {
        new Thread(() -> {
            try {
                if (student.getTeacherId() == null) return;
                
                TutorConfig tutorConfig = tutorConfigRepository.findByTeacherId(student.getTeacherId()).orElse(null);
                if (tutorConfig == null || !tutorConfig.getEnabled() || tutorConfig.getApiEndpointId() == null) return;
                
                ApiEndpoint endpoint = apiEndpointRepository.findById(tutorConfig.getApiEndpointId()).orElse(null);
                if (endpoint == null) return;

                String systemPrompt = tutorConfig.getSystemPrompt();
                if (systemPrompt == null || systemPrompt.isEmpty()) {
                    systemPrompt = "你是一个专业的美术导师。请返回严格的JSON格式，包含 optimized 和 tips (数组，包含 dimension 和 explanation) 字段。";
                }
                
                String userMessage = "分析这个绘画提示词：" + prompt;
                
                String response = aiService.generateChatResponse(
                    systemPrompt, 
                    userMessage, 
                    tutorConfig.getModelName(), 
                    endpoint.getApiKey(), 
                    endpoint.getBaseUrl(), 
                    endpoint.getApiFormat()
                );
                
                // Parse response to extract JSON
                JsonNode root = objectMapper.readTree(response);
                String content = "";
                
                if ("gemini".equalsIgnoreCase(endpoint.getApiFormat())) {
                    if (root.has("candidates") && root.get("candidates").isArray() && root.get("candidates").size() > 0) {
                        content = root.get("candidates").get(0).get("content").get("parts").get(0).get("text").asText();
                    }
                } else {
                    if (root.has("choices") && root.get("choices").isArray() && root.get("choices").size() > 0) {
                        content = root.get("choices").get(0).get("message").get("content").asText();
                    }
                }
                
                // Clean markdown JSON block
                content = content.replace("```json", "").replace("```", "").trim();
                
                // Validate JSON
                objectMapper.readTree(content);
                
                generation.setApiResponse(content);
                generationRepository.save(generation);
                
            } catch (Exception e) {
                System.err.println("Tutor analysis failed: " + e.getMessage());
            }
        }).start();
    }

    @Data
    static class GenerationRequest {
        private String prompt;
        private String modelId;
        private String size;
        private String conversationId;
    }
}
