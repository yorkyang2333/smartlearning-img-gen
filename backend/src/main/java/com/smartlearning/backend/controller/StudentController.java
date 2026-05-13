package com.smartlearning.backend.controller;

import com.smartlearning.backend.entity.Assignment;
import com.smartlearning.backend.entity.Conversation;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.entity.TutorConfig;
import com.smartlearning.backend.repository.AssignmentRepository;
import com.smartlearning.backend.repository.ConversationRepository;
import com.smartlearning.backend.repository.GenerationRepository;
import com.smartlearning.backend.repository.UserRepository;
import com.smartlearning.backend.repository.TutorConfigRepository;
import com.smartlearning.backend.repository.ModelRepository;
import com.smartlearning.backend.service.GatewayAiClient;
import com.smartlearning.backend.util.GatewayResponseUtil;
import com.smartlearning.backend.util.ModelConfigUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasRole('STUDENT')")
public class StudentController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private GenerationRepository generationRepository;

    @Autowired
    private TutorConfigRepository tutorConfigRepository;

    @Autowired
    private ModelRepository modelRepository;

    @Autowired
    private GatewayAiClient gatewayAiClient;

    private User getCurrentStudent() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
    }

    // --- CONVERSATIONS ---
    @GetMapping("/conversations")
    public ResponseEntity<Map<String, Object>> getConversations() {
        List<Conversation> list = conversationRepository.findByUserIdOrderByUpdatedAtDesc(getCurrentStudent().getId());
        return ResponseEntity.ok(Map.of("success", true, "data", list));
    }

    @PostMapping("/conversations")
    public ResponseEntity<Conversation> createConversation(@RequestBody(required = false) Map<String, String> body) {
        Conversation conv = new Conversation();
        conv.setUserId(getCurrentStudent().getId());
        if (body != null && body.containsKey("title")) {
            conv.setTitle(body.get("title"));
        } else {
            conv.setTitle("新创作");
        }
        return ResponseEntity.ok(conversationRepository.save(conv));
    }

    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<?> deleteConversation(@PathVariable String id) {
        Conversation conv = conversationRepository.findById(id).orElseThrow();
        if (!conv.getUserId().equals(getCurrentStudent().getId())) {
            return ResponseEntity.status(403).build();
        }
        conversationRepository.delete(conv);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/conversations/{id}")
    public ResponseEntity<Map<String, Object>> getConversationById(@PathVariable String id) {
        Conversation conv = conversationRepository.findById(id).orElseThrow();
        if (!conv.getUserId().equals(getCurrentStudent().getId())) {
            return ResponseEntity.status(403).build();
        }
        
        List<com.smartlearning.backend.entity.Generation> gens = generationRepository.findByConversationIdOrderByCreatedAtAsc(id);
        
        List<Map<String, Object>> messages = new java.util.ArrayList<>();
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        
        for (com.smartlearning.backend.entity.Generation g : gens) {
            // User message
            Map<String, Object> userMsg = new HashMap<>();
            userMsg.put("id", g.getId() + "_user");
            userMsg.put("role", "user");
            userMsg.put("content", g.getPrompt());
            if (g.getInputImageUrl() != null) {
                userMsg.put("image", g.getInputImageUrl());
            }
            messages.add(userMsg);
            
            // Agent message
            Map<String, Object> agentMsg = new HashMap<>();
            agentMsg.put("id", g.getId() + "_agent");
            agentMsg.put("role", "agent");
            agentMsg.put("progress", 100);
            agentMsg.put("image", g.getOutputImageUrl());
            agentMsg.put("timeMs", g.getDurationMs());
            
            messages.add(agentMsg);
        }
        
        Map<String, Object> convMap = new HashMap<>();
        convMap.put("id", conv.getId());
        convMap.put("title", conv.getTitle());
        convMap.put("messages", messages);
        
        return ResponseEntity.ok(Map.of("success", true, "data", convMap));
    }

    // --- ASSIGNMENTS ---
    @GetMapping("/assignments")
    public ResponseEntity<Map<String, Object>> getAssignments() {
        User student = getCurrentStudent();
        if (student.getTeacherId() == null) {
            return ResponseEntity.ok(Map.of("success", true, "data", List.of()));
        }
        List<Assignment> list = assignmentRepository.findByTeacherIdOrderByCreatedAtDesc(student.getTeacherId());
        return ResponseEntity.ok(Map.of("success", true, "data", list));
    }

    // --- MODELS ---
    @GetMapping("/models")
    public ResponseEntity<Map<String, Object>> getStudentModels() {
        // Only return models that are marked as active and are NOT text generation only
        List<com.smartlearning.backend.entity.Model> models = modelRepository.findByIsActiveTrueOrderBySortOrderAsc()
            .stream()
            .peek(m -> m.setConfig(ModelConfigUtil.normalizeConfig(m.getModelId(), m.getType(), m.getApiFormat(), m.getConfig())))
            .filter(m -> !"TEXT_GENERATION".equals(m.getType()))
            .collect(java.util.stream.Collectors.toList());
            
        return ResponseEntity.ok(Map.of("success", true, "data", models));
    }

    // --- ANALYTICS ---
    @GetMapping({"/analytics/student", "/../analytics/student"})
    public ResponseEntity<Map<String, Object>> getStudentAnalytics() {
        User student = getCurrentStudent();
        Map<String, Object> stats = new HashMap<>();
        stats.put("todayCount", 0);
        stats.put("dailyLimit", student.getTokenQuota());
        stats.put("thisWeekCount", 0);
        stats.put("totalGenerations", generationRepository.findByUserIdOrderByCreatedAtDesc(student.getId()).size());

        return ResponseEntity.ok(Map.of("success", true, "data", stats));
    }

    // --- CHAT ---
    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chatWithTutor(@RequestBody Map<String, Object> payload) {
        User student = getCurrentStudent();
        String userMessage = (String) payload.getOrDefault("message", "");

        if (student.getTeacherId() == null) {
            return ResponseEntity.ok(Map.of(
                "role", "assistant",
                "content", "您当前没有绑定的教师，AI学伴暂时不可用。"
            ));
        }

        TutorConfig tutorConfig = tutorConfigRepository.findByTeacherId(student.getTeacherId()).orElse(null);
        if (tutorConfig == null || !tutorConfig.getEnabled() || tutorConfig.getModelName() == null || tutorConfig.getModelName().isBlank()) {
            return ResponseEntity.ok(Map.of(
                "role", "assistant",
                "content", "您的老师暂时没有启用AI学伴功能。"
            ));
        }

        try {
            String rawResponse = gatewayAiClient.generateChatResponse(
                tutorConfig.getSystemPrompt(),
                userMessage,
                tutorConfig.getModelName()
            );
            String replyContent = GatewayResponseUtil.extractChatContent(rawResponse);
            if (replyContent == null || replyContent.isBlank()) {
                replyContent = "抱歉，无法解析AI返回的响应。";
            }

            return ResponseEntity.ok(Map.of(
                "role", "assistant",
                "content", replyContent
            ));
            
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "role", "assistant",
                "content", "抱歉，AI学伴在思考时遇到了一些问题：" + e.getMessage()
            ));
        }
    }
}
