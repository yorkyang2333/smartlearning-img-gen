package com.smartlearning.backend.controller;

import com.smartlearning.backend.entity.Generation;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.repository.GenerationRepository;
import com.smartlearning.backend.repository.UserRepository;
import com.smartlearning.backend.repository.ModelRepository;
import com.smartlearning.backend.service.AiService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/generations")
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
    private com.smartlearning.backend.repository.ApiEndpointRepository apiEndpointRepository;

    @PostMapping
    public ResponseEntity<?> createGeneration(@RequestBody GenerationRequest request) {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();

        // 1. Fetch Model and API Key from database
        com.smartlearning.backend.entity.Model aiModel = modelRepository.findByModelId(request.getModelId()).orElse(null);
        if (aiModel == null) {
            // Fallback to first model if exact match not found (e.g. from frontend defaults)
            aiModel = modelRepository.findAll().stream().findFirst().orElseThrow(() -> new RuntimeException("No AI Model configured"));
        }

        com.smartlearning.backend.entity.ApiEndpoint endpoint = apiEndpointRepository.findById(aiModel.getApiEndpointId())
                .orElseThrow(() -> new RuntimeException("API Endpoint not found for model"));

        String apiKey = endpoint.getApiKey();
        String baseUrl = endpoint.getBaseUrl();

        // 2. Call AI Service
        try {
            String apiResponse = aiService.generateImage(request.getPrompt(), aiModel.getModelId(), apiKey, baseUrl, null);
            
            // 3. Save to DB
            Generation generation = new Generation();
            generation.setUserId(user.getId());
            generation.setModelId(aiModel.getModelId());
            generation.setType(aiModel.getType());
            generation.setPrompt(request.getPrompt());
            generation.setConversationId(request.getConversationId());
            generation.setApiResponse(apiResponse);
            // Assuming response contains URL in a specific format, we need to parse it. 
            // For now, let's just save the raw response.
            generationRepository.save(generation);

            return ResponseEntity.ok(generation);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<Generation>> getGenerations() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(generationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()));
    }

    @Data
    static class GenerationRequest {
        private String prompt;
        private String modelId;
        private String size;
        private String conversationId;
    }
}
