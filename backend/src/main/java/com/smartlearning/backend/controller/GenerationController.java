package com.smartlearning.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartlearning.backend.entity.*;
import com.smartlearning.backend.repository.*;
import com.smartlearning.backend.service.GatewayAiClient;
import com.smartlearning.backend.util.LiteLlmResponseUtil;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
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
    private GatewayAiClient gatewayAiClient;

    @Autowired
    private ModelRepository modelRepository;

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
        return processGenerationWithReference(prompt, modelId, size, conversationId, image);
    }

    private ResponseEntity<?> processGeneration(String prompt, String modelId, String size, String conversationId, String inputImageUrl) {
        try {
            UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();

            // 1. Fetch model configuration from the application model directory
            Model aiModel = modelRepository.findByModelId(modelId).orElse(null);
            if (aiModel == null) {
                aiModel = modelRepository.findAll().stream().findFirst().orElseThrow(() -> new RuntimeException("No AI Model configured"));
            }

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
            
            // 2. Call LiteLLM gateway
            String apiResponse = gatewayAiClient.generateImage(prompt, aiModel.getModelId(), config);
            
            long durationMs = System.currentTimeMillis() - startTime;

            // Extract image URL from response
            String outputImageUrl = LiteLlmResponseUtil.extractImageUrl(apiResponse);

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
            
            generation = generationRepository.save(generation);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("rawUrl", outputImageUrl);
            result.put("generationId", generation.getId());
            result.put("conversationId", conversationId);
            result.put("data", Map.of("durationMs", durationMs));
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    private ResponseEntity<?> processGenerationWithReference(String prompt, String modelId, String size, String conversationId, MultipartFile image) {
        try {
            UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();

            Model aiModel = modelRepository.findByModelId(modelId).orElse(null);
            if (aiModel == null) {
                aiModel = modelRepository.findAll().stream().findFirst().orElseThrow(() -> new RuntimeException("No AI Model configured"));
            }

            Map<String, Object> config = new HashMap<>();
            if (size != null && !size.isEmpty()) {
                config.put("size", size);
            }

            if (conversationId == null || conversationId.isEmpty()) {
                Conversation conv = new Conversation();
                conv.setUserId(user.getId());
                conv.setTitle(prompt.length() > 20 ? prompt.substring(0, 20) + "..." : prompt);
                conversationId = conversationRepository.save(conv).getId();
            }

            long startTime = System.currentTimeMillis();
            String apiResponse = gatewayAiClient.editImage(
                prompt,
                aiModel.getModelId(),
                image.getBytes(),
                image.getOriginalFilename() != null ? image.getOriginalFilename() : "reference.png",
                image.getContentType(),
                config
            );
            long durationMs = System.currentTimeMillis() - startTime;

            String outputImageUrl = LiteLlmResponseUtil.extractImageUrl(apiResponse);

            Generation generation = new Generation();
            generation.setUserId(user.getId());
            generation.setModelId(aiModel.getModelId());
            generation.setType(aiModel.getType());
            generation.setPrompt(prompt);
            generation.setInputImageUrl("uploaded:" + (image.getOriginalFilename() != null ? image.getOriginalFilename() : "reference.png"));
            generation.setOutputImageUrl(outputImageUrl);
            generation.setSize(size);
            generation.setDurationMs((int) durationMs);
            generation.setConversationId(conversationId);

            generation = generationRepository.save(generation);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "rawUrl", outputImageUrl,
                "generationId", generation.getId(),
                "conversationId", conversationId,
                "data", Map.of("durationMs", durationMs)
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/optimize-prompt")
    public ResponseEntity<?> optimizePrompt(@RequestBody Map<String, String> request) {
        try {
            String prompt = request.get("prompt");
            TutorConfig tutorConfig = getTutorConfig();
            if (tutorConfig == null || tutorConfig.getModelName() == null || tutorConfig.getModelName().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "AI 导师未配置"));
            }
            
            String systemPrompt = "你是一个文生图专家。请将用户提供的原始提示词优化为更具艺术感、细节更丰富、更容易生成高质量图片的专业提示词。仅返回优化后的提示词，不要有其他解释。";
            String userMessage = "原始提示词：" + prompt;

            String response = gatewayAiClient.generateChatResponse(systemPrompt, userMessage, tutorConfig.getModelName());

            String content = LiteLlmResponseUtil.extractChatContent(response);
            return ResponseEntity.ok(Map.of("success", true, "optimized", content.trim()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/analyze-prompt")
    public ResponseEntity<?> analyzePrompt(@RequestBody Map<String, String> request) {
        try {
            String prompt = request.get("prompt");
            TutorConfig tutorConfig = getTutorConfig();
            if (tutorConfig == null || tutorConfig.getModelName() == null || tutorConfig.getModelName().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "AI 导师未配置"));
            }
            
            String systemPrompt = "你是一个文生图专家。请分析用户提供的原始提示词，并从构图、细节、光影、材质等维度给出改进建议。请返回 JSON 格式，包含 suggestions 数组，每个元素包含 dimension、currentStatus、suggestion 字段。";
            String userMessage = "原始提示词：" + prompt;

            String response = gatewayAiClient.generateChatResponse(systemPrompt, userMessage, tutorConfig.getModelName());

            String content = LiteLlmResponseUtil.extractChatContent(response);
            content = content.replace("```json", "").replace("```", "").trim();
            
            return ResponseEntity.ok(Map.of("success", true, "data", objectMapper.readTree(content)));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/review")
    public ResponseEntity<?> reviewGeneration(@RequestBody Map<String, Object> request) {
        try {
            String generationId = (String) request.get("generationId");
            List<String> perspectives = (List<String>) request.get("perspectives");
            
            Generation generation = generationRepository.findById(generationId).orElseThrow();
            TutorConfig tutorConfig = getTutorConfig();
            if (tutorConfig == null || tutorConfig.getModelName() == null || tutorConfig.getModelName().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "AI 导师未配置"));
            }
            
            Map<String, Object> finalResults = new HashMap<>();
            
            for (String p : perspectives) {
                String systemPrompt = getSystemPromptForPerspective(p);
                String userMessage = "分析这个绘画作品。提示词是：" + generation.getPrompt();
                String imageUrl = generation.getOutputImageUrl();

                String response = gatewayAiClient.generateChatResponseWithImage(
                    systemPrompt, userMessage, imageUrl, tutorConfig.getModelName()
                );

                String content = LiteLlmResponseUtil.extractChatContent(response);
                content = content.replace("```json", "").replace("```", "").trim();
                finalResults.put(p, objectMapper.readTree(content));
            }

            // Save back to DB for persistence
            String existingResponse = generation.getApiResponse();
            Map<String, Object> apiResponseMap = existingResponse != null ? objectMapper.readValue(existingResponse, Map.class) : new HashMap<>();
            Map<String, Object> reviews = apiResponseMap.containsKey("reviews") ? (Map<String, Object>) apiResponseMap.get("reviews") : new HashMap<>();
            reviews.putAll(finalResults);
            apiResponseMap.put("reviews", reviews);
            
            generation.setApiResponse(objectMapper.writeValueAsString(apiResponseMap));
            generationRepository.save(generation);

            return ResponseEntity.ok(Map.of("success", true, "results", finalResults));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    private TutorConfig getTutorConfig() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
        if (user.getTeacherId() == null) return null;
        return tutorConfigRepository.findByTeacherId(user.getTeacherId()).orElse(null);
    }

    private String getSystemPromptForPerspective(String perspective) {
        switch (perspective) {
            case "composition":
                return "你是一个美术导师。请根据提供的图片和原始提示词，从光影和构图的角度进行评审。请返回 JSON 格式，包含 score (0-100)、analysis (评审分析文字)、promptSuggestion (针对光影构图的提示词优化建议)。";
            case "style":
                return "你是一个美术导师。请根据提供的图片和原始提示词，从艺术风格的角度进行评审。请返回 JSON 格式，包含 score (0-100)、analysis (评审分析文字)、promptSuggestion (针对风格一致性的提示词优化建议)。";
            case "completeness":
                return "你是一个美术导师。请根据提供的图片和原始提示词，从内容完整性和意图匹配度的角度进行评审。请返回 JSON 格式，包含 score (0-100)、analysis (评审分析文字)、promptSuggestion (补全或修正内容的提示词优化建议)。";
            default:
                return "你是一个美术导师。请评价这个作品。请返回 JSON 格式，包含 score, analysis, promptSuggestion。";
        }
    }

    @Data
    static class GenerationRequest {
        private String prompt;
        private String modelId;
        private String size;
        private String conversationId;
    }
}
