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
        
        config.setEnabled(configDetails.getEnabled());
        config.setSystemPrompt(configDetails.getSystemPrompt());
        config.setModelName(configDetails.getModelName());
        
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
}
