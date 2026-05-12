package com.smartlearning.backend.controller;

import com.smartlearning.backend.entity.Assignment;
import com.smartlearning.backend.repository.AssignmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import com.smartlearning.backend.entity.TutorConfig;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.entity.Template;
import com.smartlearning.backend.repository.TutorConfigRepository;
import com.smartlearning.backend.repository.UserRepository;
import com.smartlearning.backend.repository.TemplateRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;
import com.smartlearning.backend.entity.Generation;
import com.smartlearning.backend.entity.Model;
import com.smartlearning.backend.repository.GenerationRepository;
import com.smartlearning.backend.repository.ModelRepository;
import com.smartlearning.backend.service.ModelDiscoveryService;

@RestController
@RequestMapping("/api/teacher")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherController {

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TutorConfigRepository tutorConfigRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TemplateRepository templateRepository;

    @Autowired
    private GenerationRepository generationRepository;

    @Autowired
    private ModelRepository modelRepository;

    @Autowired
    private com.smartlearning.backend.repository.ApiEndpointRepository apiEndpointRepository;

    @Autowired
    private ModelDiscoveryService modelDiscoveryService;

    private String getTeacherId() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByUsername(userDetails.getUsername()).orElseThrow().getId();
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        try {
            long totalStudents = userRepository.countByRole("STUDENT");
            long totalGenerations = generationRepository.count();

            List<Generation> allGens = generationRepository.findAll();
            long activeModelsCount = allGens.stream().map(Generation::getModelId).distinct().count();

            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(6).withHour(0).withMinute(0).withSecond(0).withNano(0);
            List<Generation> recentGenerations = generationRepository.findByCreatedAtAfter(sevenDaysAgo);

            Map<String, Integer> trendMap = new java.util.LinkedHashMap<>();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM d");
            for (int i = 0; i < 7; i++) {
                LocalDateTime d = sevenDaysAgo.plusDays(i);
                trendMap.put(d.format(formatter), 0);
            }

            for (Generation gen : recentGenerations) {
                if (gen.getCreatedAt() != null) {
                    String dateStr = gen.getCreatedAt().format(formatter);
                    if (trendMap.containsKey(dateStr)) {
                        trendMap.put(dateStr, trendMap.get(dateStr) + 1);
                    }
                }
            }

            List<Map<String, Object>> dailyTrend = new ArrayList<>();
            for (Map.Entry<String, Integer> entry : trendMap.entrySet()) {
                dailyTrend.add(Map.of("date", entry.getKey(), "count", entry.getValue()));
            }

            Map<String, Long> modelCounts = allGens.stream()
                .collect(Collectors.groupingBy(Generation::getModelId, Collectors.counting()));
            
            List<Model> models = modelRepository.findAll();
            List<Map<String, Object>> modelUsage = modelCounts.entrySet().stream()
                .map(entry -> {
                    String modelName = models.stream()
                        .filter(m -> m.getId().equals(entry.getKey()))
                        .findFirst()
                        .map(Model::getName)
                        .orElse("Unknown");
                    return Map.<String, Object>of("name", modelName, "count", entry.getValue());
                })
                .sorted((a, b) -> Long.compare((Long) b.get("count"), (Long) a.get("count")))
                .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("data", Map.of(
                "totalStudents", totalStudents,
                "totalGenerations", totalGenerations,
                "activeModels", activeModelsCount,
                "dailyTrend", dailyTrend,
                "modelUsage", modelUsage
            )));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getHistory() {
        try {
            List<Generation> generations = generationRepository.findAllByOrderByCreatedAtDesc();
            List<User> users = userRepository.findAll();
            List<Model> models = modelRepository.findAll();

            Map<String, User> userMap = users.stream().collect(Collectors.toMap(User::getId, u -> u));
            Map<String, Model> modelMap = models.stream().collect(Collectors.toMap(Model::getId, m -> m));

            List<Map<String, Object>> enrichedGens = generations.stream()
                .limit(100) // Limit to top 100 to avoid huge payload
                .map(g -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", g.getId());
                    map.put("outputImageUrl", g.getOutputImageUrl());
                    map.put("prompt", g.getPrompt());
                    map.put("createdAt", g.getCreatedAt());
                    
                    User user = userMap.get(g.getUserId());
                    if (user != null) {
                        map.put("user", Map.of("id", user.getId(), "displayName", user.getDisplayName() != null ? user.getDisplayName() : user.getUsername()));
                    }
                    
                    Model model = modelMap.get(g.getModelId());
                    if (model != null) {
                        map.put("model", Map.of("id", model.getId(), "name", model.getName()));
                    }
                    
                    return map;
                }).collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("data", enrichedGens));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // --- ASSIGNMENTS ---
    @GetMapping("/assignments")
    public ResponseEntity<List<Assignment>> getAssignments() {
        return ResponseEntity.ok(assignmentRepository.findByTeacherIdOrderByCreatedAtDesc(getTeacherId()));
    }

    @PostMapping("/assignments")
    public ResponseEntity<Assignment> createAssignment(@RequestBody Assignment assignment) {
        assignment.setTeacherId(getTeacherId());
        return ResponseEntity.ok(assignmentRepository.save(assignment));
    }

    // --- TUTOR CONFIG (MODELS) ---
    @GetMapping("/config")
    public ResponseEntity<TutorConfig> getConfig() {
        String teacherId = getTeacherId();
        return ResponseEntity.ok(tutorConfigRepository.findByTeacherId(teacherId)
            .orElseGet(() -> {
                TutorConfig newConfig = new TutorConfig();
                newConfig.setTeacherId(teacherId);
                return tutorConfigRepository.save(newConfig);
            }));
    }

    @PutMapping("/config")
    public ResponseEntity<TutorConfig> updateConfig(@RequestBody TutorConfig configDetails) {
        TutorConfig config = tutorConfigRepository.findByTeacherId(getTeacherId())
            .orElseThrow(() -> new RuntimeException("Config not found"));
        
        if (configDetails.getEnabled() != null) config.setEnabled(configDetails.getEnabled());
        if (configDetails.getSystemPrompt() != null) config.setSystemPrompt(configDetails.getSystemPrompt());
        if (configDetails.getModelName() != null) config.setModelName(configDetails.getModelName());
        if (configDetails.getApiEndpointId() != null) config.setApiEndpointId(configDetails.getApiEndpointId());
        
        return ResponseEntity.ok(tutorConfigRepository.save(config));
    }

    // --- STUDENTS ---
    @GetMapping("/students")
    public ResponseEntity<List<User>> getStudents() {
        List<User> students = userRepository.findByTeacherId(getTeacherId());
        // Clean password hash before sending to frontend
        students.forEach(s -> s.setPasswordHash(null));
        return ResponseEntity.ok(students);
    }

    @PutMapping("/students/{studentId}/quota")
    public ResponseEntity<User> updateQuota(@PathVariable String studentId, @RequestBody Map<String, Integer> body) {
        User student = userRepository.findById(studentId).orElseThrow();
        if (!student.getTeacherId().equals(getTeacherId())) {
            return ResponseEntity.status(403).build();
        }
        student.setTokenQuota(body.get("quota"));
        User saved = userRepository.save(student);
        saved.setPasswordHash(null);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/students/{studentId}/status")
    public ResponseEntity<User> updateStatus(@PathVariable String studentId, @RequestBody Map<String, Boolean> body) {
        User student = userRepository.findById(studentId).orElseThrow();
        if (!student.getTeacherId().equals(getTeacherId())) {
            return ResponseEntity.status(403).build();
        }
        student.setIsActive(body.get("isActive"));
        User saved = userRepository.save(student);
        saved.setPasswordHash(null);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/students/{studentId}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable String studentId, @RequestBody Map<String, String> body) {
        User student = userRepository.findById(studentId).orElseThrow();
        if (!student.getTeacherId().equals(getTeacherId())) {
            return ResponseEntity.status(403).build();
        }
        student.setPasswordHash(passwordEncoder.encode(body.get("newPassword")));
        userRepository.save(student);
        return ResponseEntity.ok().build();
    }

    // --- TEMPLATES ---
    @GetMapping("/templates")
    public ResponseEntity<List<Template>> getTemplates() {
        return ResponseEntity.ok(templateRepository.findByTeacherIdOrderByCreatedAtDesc(getTeacherId()));
    }

    @PostMapping("/templates")
    public ResponseEntity<Template> createTemplate(@RequestBody Template template) {
        template.setTeacherId(getTeacherId());
        return ResponseEntity.ok(templateRepository.save(template));
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<?> deleteTemplate(@PathVariable String id) {
        Template template = templateRepository.findById(id).orElseThrow();
        if (!template.getTeacherId().equals(getTeacherId())) {
            return ResponseEntity.status(403).build();
        }
        templateRepository.delete(template);
        return ResponseEntity.ok().build();
    }
    @GetMapping("/endpoints")
    public ResponseEntity<List<java.util.Map<String, Object>>> getEndpoints() {
        List<com.smartlearning.backend.entity.ApiEndpoint> endpoints = apiEndpointRepository.findAll();
        List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        
        for (com.smartlearning.backend.entity.ApiEndpoint ep : endpoints) {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", ep.getId());
            map.put("name", ep.getName());
            map.put("baseUrl", ep.getBaseUrl());
            map.put("apiKey", ep.getApiKey());
            map.put("apiFormat", ep.getApiFormat());
            map.put("createdAt", ep.getCreatedAt());
            
            java.util.Map<String, Object> countMap = new java.util.HashMap<>();
            countMap.put("models", modelRepository.countByApiEndpointId(ep.getId()));
            map.put("_count", countMap);
            
            result.add(map);
        }
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/endpoints")
    public ResponseEntity<com.smartlearning.backend.entity.ApiEndpoint> createEndpoint(@RequestBody com.smartlearning.backend.entity.ApiEndpoint endpoint) {
        if (endpoint.getApiFormat() == null) {
            endpoint.setApiFormat("openai");
        }
        return ResponseEntity.ok(apiEndpointRepository.save(endpoint));
    }

    @PutMapping("/endpoints/{id}")
    public ResponseEntity<com.smartlearning.backend.entity.ApiEndpoint> updateEndpoint(@PathVariable String id, @RequestBody com.smartlearning.backend.entity.ApiEndpoint endpointDetails) {
        com.smartlearning.backend.entity.ApiEndpoint endpoint = apiEndpointRepository.findById(id).orElseThrow();
        endpoint.setName(endpointDetails.getName());
        endpoint.setBaseUrl(endpointDetails.getBaseUrl());
        endpoint.setApiKey(endpointDetails.getApiKey());
        if (endpointDetails.getApiFormat() != null) {
            endpoint.setApiFormat(endpointDetails.getApiFormat());
        }
        return ResponseEntity.ok(apiEndpointRepository.save(endpoint));
    }

    @PostMapping("/endpoints/{id}/discover")
    public ResponseEntity<Map<String, Object>> discoverModels(@PathVariable String id) {
        com.smartlearning.backend.entity.ApiEndpoint endpoint = apiEndpointRepository.findById(id).orElseThrow();
        Map<String, Object> result = modelDiscoveryService.discoverModels(endpoint);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/endpoints/{id}")
    public ResponseEntity<?> deleteEndpoint(@PathVariable String id) {
        apiEndpointRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // --- MODELS ---
    @GetMapping("/models")
    public ResponseEntity<List<java.util.Map<String, Object>>> getModels() {
        List<com.smartlearning.backend.entity.Model> models = modelRepository.findAllByOrderBySortOrderAsc();
        List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        
        for (com.smartlearning.backend.entity.Model m : models) {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", m.getId());
            map.put("name", m.getName());
            map.put("modelId", m.getModelId());
            map.put("type", m.getType());
            map.put("provider", m.getProvider());
            map.put("description", m.getDescription());
            map.put("config", m.getConfig());
            map.put("isActive", m.getIsActive());
            map.put("sortOrder", m.getSortOrder());
            map.put("apiFormat", m.getApiFormat());
            map.put("apiEndpointId", m.getApiEndpointId());
            map.put("createdAt", m.getCreatedAt());
            
            if (m.getApiEndpointId() != null) {
                apiEndpointRepository.findById(m.getApiEndpointId()).ifPresent(ep -> {
                    java.util.Map<String, Object> epMap = new java.util.HashMap<>();
                    epMap.put("id", ep.getId());
                    epMap.put("name", ep.getName());
                    map.put("apiEndpoint", epMap);
                });
            }
            result.add(map);
        }
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/models")
    public ResponseEntity<com.smartlearning.backend.entity.Model> createModel(@RequestBody com.smartlearning.backend.entity.Model model) {
        if (model.getApiFormat() == null) {
            model.setApiFormat("openai");
        }
        return ResponseEntity.ok(modelRepository.save(model));
    }

    @PutMapping("/models/{id}")
    public ResponseEntity<com.smartlearning.backend.entity.Model> updateModel(@PathVariable String id, @RequestBody com.smartlearning.backend.entity.Model modelDetails) {
        com.smartlearning.backend.entity.Model model = modelRepository.findById(id).orElseThrow();
        model.setName(modelDetails.getName());
        model.setModelId(modelDetails.getModelId());
        model.setType(modelDetails.getType());
        model.setProvider(modelDetails.getProvider());
        model.setDescription(modelDetails.getDescription());
        model.setConfig(modelDetails.getConfig());
        model.setIsActive(modelDetails.getIsActive());
        model.setSortOrder(modelDetails.getSortOrder());
        if (modelDetails.getApiFormat() != null) {
            model.setApiFormat(modelDetails.getApiFormat());
        }
        model.setApiEndpointId(modelDetails.getApiEndpointId());
        return ResponseEntity.ok(modelRepository.save(model));
    }

    @PostMapping("/models/batch")
    public ResponseEntity<Map<String, Object>> batchCreateModels(@RequestBody List<com.smartlearning.backend.entity.Model> models) {
        List<com.smartlearning.backend.entity.Model> savedModels = new ArrayList<>();
        for (com.smartlearning.backend.entity.Model model : models) {
            if (!modelRepository.existsByModelId(model.getModelId())) {
                if (model.getApiFormat() == null) {
                    model.setApiFormat("openai");
                }
                savedModels.add(modelRepository.save(model));
            }
        }
        return ResponseEntity.ok(Map.of("success", true, "count", savedModels.size()));
    }

    @DeleteMapping("/models/{id}")
    public ResponseEntity<?> deleteModel(@PathVariable String id) {
        modelRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
