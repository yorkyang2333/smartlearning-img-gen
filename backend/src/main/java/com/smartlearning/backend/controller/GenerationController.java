package com.smartlearning.backend.controller;

import com.smartlearning.backend.entity.Generation;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.repository.GenerationRepository;
import com.smartlearning.backend.repository.UserRepository;
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

    @PostMapping
    public ResponseEntity<?> createGeneration(@RequestBody GenerationRequest request) {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();

        // 1. Fetch Model and API Key logic here (mocked for now)
        String apiKey = "MOCK_API_KEY";
        String baseUrl = "https://api.openai.com/v1"; // Or ChatAnywhere

        // 2. Call AI Service
        try {
            String apiResponse = aiService.generateImage(request.getPrompt(), request.getModelId(), apiKey, baseUrl, null);
            
            // 3. Save to DB
            Generation generation = new Generation();
            generation.setUserId(user.getId());
            generation.setModelId(request.getModelId());
            generation.setType("TEXT_TO_IMAGE");
            generation.setPrompt(request.getPrompt());
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
    }
}
