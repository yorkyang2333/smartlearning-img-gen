package com.smartlearning.backend.controller;

import com.smartlearning.backend.entity.Assignment;
import com.smartlearning.backend.entity.ClassGroup;
import com.smartlearning.backend.repository.AssignmentRepository;
import com.smartlearning.backend.repository.ClassGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import com.smartlearning.backend.entity.TutorConfig;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.entity.Template;
import com.smartlearning.backend.entity.GatewayConfig;
import com.smartlearning.backend.entity.Submission;
import com.smartlearning.backend.repository.TutorConfigRepository;
import com.smartlearning.backend.repository.UserRepository;
import com.smartlearning.backend.repository.TemplateRepository;
import com.smartlearning.backend.repository.SubmissionRepository;
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
import com.smartlearning.backend.service.AssignmentService;
import com.smartlearning.backend.service.GatewayConfigService;
import com.smartlearning.backend.service.GatewayModelSyncService;
import com.smartlearning.backend.util.ModelConfigUtil;

@RestController
@RequestMapping("/api/teacher")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherController {

    @Autowired
    private AssignmentService assignmentService;

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
    private GatewayModelSyncService gatewayModelSyncService;

    @Autowired
    private GatewayConfigService gatewayConfigService;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private ClassGroupRepository classGroupRepository;

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
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("M/d");
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
                        .filter(m -> m.getModelId().equals(entry.getKey()))
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
            Map<String, Model> modelMap = models.stream().collect(Collectors.toMap(Model::getModelId, m -> m));

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
        return ResponseEntity.ok(assignmentService.getTeacherAssignments(getTeacherId()));
    }

    @PostMapping("/assignments")
    public ResponseEntity<Assignment> createAssignment(@RequestBody Assignment assignment) {
        return ResponseEntity.ok(assignmentService.createAssignment(assignment, getTeacherId()));
    }

    @PutMapping("/assignments/{id}")
    public ResponseEntity<?> updateAssignment(@PathVariable String id, @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(assignmentService.updateAssignment(id, getTeacherId(), body));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/assignments/{id}/submissions")
    public ResponseEntity<?> getSubmissions(@PathVariable String id) {
        try {
            return ResponseEntity.ok(assignmentService.getSubmissions(id, getTeacherId()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/submissions/{id}/review")
    public ResponseEntity<?> reviewSubmission(@PathVariable String id, @RequestBody Map<String, Object> body) {
        try {
            Integer score = body.containsKey("score") ? Integer.valueOf(body.get("score").toString()) : null;
            String feedback = body.containsKey("feedback") ? body.get("feedback").toString() : null;
            return ResponseEntity.ok(assignmentService.reviewSubmission(id, getTeacherId(), score, feedback));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
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
        config.setApiEndpointId(null);
        
        return ResponseEntity.ok(tutorConfigRepository.save(config));
    }

    @GetMapping("/gateway-config")
    public ResponseEntity<Map<String, Object>> getGatewayConfig() {
        GatewayConfig config = gatewayConfigService.getOrCreate();
        GatewayConfigService.ResolvedGatewayConfig resolved = gatewayConfigService.getResolvedConfig();
        Map<String, Object> payload = new HashMap<>();
        payload.put("enabled", config.getEnabled());
        payload.put("baseUrl", config.getBaseUrl());
        payload.put("apiKey", config.getApiKey() == null ? "" : config.getApiKey());
        payload.put("updatedAt", config.getUpdatedAt());
        payload.put("resolvedBaseUrl", resolved.baseUrl());
        payload.put("usingFallback", config.getBaseUrl() == null || config.getBaseUrl().isBlank());
        return ResponseEntity.ok(payload);
    }

    @PutMapping("/gateway-config")
    public ResponseEntity<Map<String, Object>> updateGatewayConfig(@RequestBody GatewayConfig configDetails) {
        GatewayConfig saved = gatewayConfigService.update(configDetails);
        GatewayConfigService.ResolvedGatewayConfig resolved = gatewayConfigService.getResolvedConfig();
        Map<String, Object> payload = new HashMap<>();
        payload.put("success", true);
        payload.put("enabled", saved.getEnabled());
        payload.put("baseUrl", saved.getBaseUrl());
        payload.put("apiKey", saved.getApiKey() == null ? "" : saved.getApiKey());
        payload.put("updatedAt", saved.getUpdatedAt());
        payload.put("resolvedBaseUrl", resolved.baseUrl());
        return ResponseEntity.ok(payload);
    }

    @GetMapping("/channels")
    public ResponseEntity<Map<String, Object>> getChannels() {
        try {
            GatewayConfigService.ResolvedGatewayConfig config = gatewayConfigService.getResolvedConfig();
            if (!config.enabled()) {
                return ResponseEntity.ok(Map.of("success", true, "data", List.of()));
            }
            String baseUrl = config.baseUrl();
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

            // Step 1: Login to New API to get session cookie + user ID
            org.springframework.http.HttpHeaders loginHeaders = new org.springframework.http.HttpHeaders();
            loginHeaders.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            Map<String, String> loginBody = Map.of("username", "root", "password", "12345678");
            org.springframework.http.HttpEntity<Map<String, String>> loginEntity = new org.springframework.http.HttpEntity<>(loginBody, loginHeaders);
            org.springframework.http.ResponseEntity<String> loginResponse = restTemplate.exchange(
                baseUrl + "/api/user/login", org.springframework.http.HttpMethod.POST, loginEntity, String.class
            );

            // Extract session cookie
            String sessionCookie = "";
            java.util.List<String> cookies = loginResponse.getHeaders().get("Set-Cookie");
            if (cookies != null) {
                for (String c : cookies) {
                    if (c.startsWith("session=")) {
                        sessionCookie = c.split(";")[0]; // "session=xxx"
                        break;
                    }
                }
            }

            // Extract user ID from login response (New API requires New-Api-User header)
            String userId = "1"; // default root user ID
            com.fasterxml.jackson.databind.JsonNode loginRoot = mapper.readTree(
                loginResponse.getBody() != null ? loginResponse.getBody() : "{}"
            );
            if (loginRoot.has("data") && loginRoot.get("data").has("id")) {
                userId = String.valueOf(loginRoot.get("data").get("id").asInt());
            }

            // Step 2: Get channel list with session cookie + New-Api-User header
            org.springframework.http.HttpHeaders chHeaders = new org.springframework.http.HttpHeaders();
            if (!sessionCookie.isEmpty()) {
                chHeaders.set("Cookie", sessionCookie);
            }
            chHeaders.set("New-Api-User", userId);
            org.springframework.http.HttpEntity<Void> chEntity = new org.springframework.http.HttpEntity<>(chHeaders);
            org.springframework.http.ResponseEntity<String> response = restTemplate.exchange(
                baseUrl + "/api/channel/?p=0&page_size=100", org.springframework.http.HttpMethod.GET, chEntity, String.class
            );

            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(
                response.getBody() != null ? response.getBody() : "{}"
            );
            if (root.has("success") && root.get("success").asBoolean()) {
                List<Map<String, Object>> channels = new ArrayList<>();
                // New API returns data.items (paginated) instead of flat data array
                com.fasterxml.jackson.databind.JsonNode dataNode = root.get("data");
                com.fasterxml.jackson.databind.JsonNode itemsNode = null;
                if (dataNode != null && dataNode.has("items")) {
                    itemsNode = dataNode.get("items");
                } else if (dataNode != null && dataNode.isArray()) {
                    // Fallback for One API compat
                    itemsNode = dataNode;
                }
                if (itemsNode != null && itemsNode.isArray()) {
                    for (com.fasterxml.jackson.databind.JsonNode ch : itemsNode) {
                        Map<String, Object> item = new HashMap<>();
                        item.put("id", ch.has("id") ? ch.get("id").asInt() : 0);
                        item.put("name", ch.has("name") ? ch.get("name").asText() : "");
                        item.put("type", ch.has("type") ? ch.get("type").asInt() : 0);
                        item.put("status", ch.has("status") ? ch.get("status").asInt() : 0);
                        item.put("models", ch.has("models") ? ch.get("models").asText() : "");
                        item.put("responseTime", ch.has("response_time") ? ch.get("response_time").asInt() : 0);
                        item.put("testTime", ch.has("test_time") ? ch.get("test_time").asLong() : 0);
                        item.put("balance", ch.has("balance") ? ch.get("balance").asDouble() : 0);
                        channels.add(item);
                    }
                }
                return ResponseEntity.ok(Map.of("success", true, "data", channels));
            }
            return ResponseEntity.ok(Map.of("success", true, "data", List.of()));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "error", e.getMessage() != null ? e.getMessage() : "获取渠道列表失败", "data", List.of()));
        }
    }


    // --- CLASS GROUPS ---
    @GetMapping("/classes")
    public ResponseEntity<List<ClassGroup>> getClasses() {
        return ResponseEntity.ok(classGroupRepository.findByTeacherIdOrderBySortOrderAsc(getTeacherId()));
    }

    @PostMapping("/classes")
    public ResponseEntity<?> createClass(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "班级名称不能为空"));
        }
        ClassGroup classGroup = new ClassGroup();
        classGroup.setName(name.trim());
        classGroup.setTeacherId(getTeacherId());
        classGroup.setDescription((String) body.get("description"));
        if (body.containsKey("sortOrder") && body.get("sortOrder") != null) {
            classGroup.setSortOrder((Integer) body.get("sortOrder"));
        }
        return ResponseEntity.ok(classGroupRepository.save(classGroup));
    }

    @PutMapping("/classes/{id}")
    public ResponseEntity<?> updateClass(@PathVariable String id, @RequestBody Map<String, Object> body) {
        ClassGroup classGroup = classGroupRepository.findByIdAndTeacherId(id, getTeacherId())
            .orElse(null);
        if (classGroup == null) {
            return ResponseEntity.status(404).body(Map.of("error", "班级不存在"));
        }
        if (body.containsKey("name")) {
            String name = (String) body.get("name");
            if (name != null && !name.trim().isEmpty()) {
                classGroup.setName(name.trim());
            }
        }
        if (body.containsKey("description")) {
            classGroup.setDescription((String) body.get("description"));
        }
        if (body.containsKey("sortOrder") && body.get("sortOrder") != null) {
            classGroup.setSortOrder((Integer) body.get("sortOrder"));
        }
        return ResponseEntity.ok(classGroupRepository.save(classGroup));
    }

    @DeleteMapping("/classes/{id}")
    public ResponseEntity<?> deleteClass(@PathVariable String id) {
        ClassGroup classGroup = classGroupRepository.findByIdAndTeacherId(id, getTeacherId())
            .orElse(null);
        if (classGroup == null) {
            return ResponseEntity.status(404).body(Map.of("error", "班级不存在"));
        }
        List<User> students = userRepository.findByTeacherIdAndClassGroupId(getTeacherId(), id);
        for (User s : students) {
            s.setClassGroupId(null);
            userRepository.save(s);
        }
        classGroupRepository.delete(classGroup);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // --- STUDENTS ---
    @GetMapping("/students")
    public ResponseEntity<List<User>> getStudents(@RequestParam(required = false) String classGroupId) {
        String teacherId = getTeacherId();
        List<User> students;
        if (classGroupId == null) {
            students = userRepository.findByTeacherId(teacherId);
        } else if ("unassigned".equals(classGroupId)) {
            students = userRepository.findByTeacherIdAndClassGroupIdIsNull(teacherId);
        } else {
            students = userRepository.findByTeacherIdAndClassGroupId(teacherId, classGroupId);
        }
        students.forEach(s -> s.setPasswordHash(null));
        return ResponseEntity.ok(students);
    }

    @PostMapping("/students")
    public ResponseEntity<?> createStudent(@RequestBody Map<String, String> body) {
        if (userRepository.findByUsername(body.get("username")).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "账号已存在"));
        }
        String teacherId = getTeacherId();
        User student = new User();
        student.setUsername(body.get("username"));
        student.setDisplayName(body.get("displayName"));
        student.setPasswordHash(passwordEncoder.encode(body.get("password")));
        student.setRole("STUDENT");
        student.setTeacherId(teacherId);
        if (body.get("classGroupId") != null && !body.get("classGroupId").isEmpty()) {
            String cgId = body.get("classGroupId");
            if (classGroupRepository.findByIdAndTeacherId(cgId, teacherId).isPresent()) {
                student.setClassGroupId(cgId);
            }
        }
        User saved = userRepository.save(student);
        saved.setPasswordHash(null);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/students/batch")
    public ResponseEntity<?> batchCreateStudents(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Map<String, String>> studentsList = (List<Map<String, String>>) body.get("students");
        if (studentsList == null || studentsList.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "列表为空"));
        }
        String teacherId = getTeacherId();
        String classGroupId = body.containsKey("classGroupId") ? (String) body.get("classGroupId") : null;
        if (classGroupId != null && !classGroupId.isEmpty()) {
            if (classGroupRepository.findByIdAndTeacherId(classGroupId, teacherId).isEmpty()) {
                classGroupId = null;
            }
        }
        List<User> savedList = new ArrayList<>();
        for (Map<String, String> s : studentsList) {
            if (userRepository.findByUsername(s.get("username")).isEmpty()) {
                User student = new User();
                student.setUsername(s.get("username"));
                student.setDisplayName(s.get("displayName"));
                student.setPasswordHash(passwordEncoder.encode(s.get("password")));
                student.setRole("STUDENT");
                student.setTeacherId(teacherId);
                if (classGroupId != null && !classGroupId.isEmpty()) {
                    student.setClassGroupId(classGroupId);
                }
                savedList.add(userRepository.save(student));
            }
        }
        return ResponseEntity.ok(Map.of("success", true, "count", savedList.size()));
    }

    @PutMapping("/students/{studentId}")
    public ResponseEntity<?> updateStudent(@PathVariable String studentId, @RequestBody Map<String, Object> body) {
        String teacherId = getTeacherId();
        User student = userRepository.findById(studentId).orElseThrow();
        if (!student.getTeacherId().equals(teacherId)) {
            return ResponseEntity.status(403).build();
        }
        if (body.containsKey("displayName")) {
            student.setDisplayName((String) body.get("displayName"));
        }
        if (body.containsKey("isActive") && body.get("isActive") != null) {
            student.setIsActive((Boolean) body.get("isActive"));
        }
        if (body.containsKey("password") && body.get("password") != null) {
            String pwd = (String) body.get("password");
            if (!pwd.trim().isEmpty()) {
                student.setPasswordHash(passwordEncoder.encode(pwd));
            }
        }
        if (body.containsKey("classGroupId")) {
            Object cgVal = body.get("classGroupId");
            if (cgVal == null || ((String) cgVal).isEmpty()) {
                student.setClassGroupId(null);
            } else {
                String cgId = (String) cgVal;
                if (classGroupRepository.findByIdAndTeacherId(cgId, teacherId).isPresent()) {
                    student.setClassGroupId(cgId);
                }
            }
        }
        User saved = userRepository.save(student);
        saved.setPasswordHash(null);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/students/batch-move")
    public ResponseEntity<?> batchMoveStudents(@RequestBody Map<String, Object> body) {
        String teacherId = getTeacherId();
        @SuppressWarnings("unchecked")
        List<String> studentIds = (List<String>) body.get("studentIds");
        Object cgVal = body.get("classGroupId");
        String classGroupId = cgVal != null ? cgVal.toString() : null;

        if (classGroupId != null && !classGroupId.isEmpty()) {
            if (classGroupRepository.findByIdAndTeacherId(classGroupId, teacherId).isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "班级不存在"));
            }
        }

        int count = 0;
        for (String sid : studentIds) {
            User student = userRepository.findById(sid).orElse(null);
            if (student != null && student.getTeacherId().equals(teacherId)) {
                student.setClassGroupId(classGroupId != null && !classGroupId.isEmpty() ? classGroupId : null);
                userRepository.save(student);
                count++;
            }
        }
        return ResponseEntity.ok(Map.of("success", true, "count", count));
    }

    @DeleteMapping("/students/{studentId}")
    public ResponseEntity<?> deleteStudent(@PathVariable String studentId) {
        User student = userRepository.findById(studentId).orElseThrow();
        if (!student.getTeacherId().equals(getTeacherId())) {
            return ResponseEntity.status(403).build();
        }
        userRepository.delete(student);
        return ResponseEntity.ok().build();
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
    // --- MODELS ---
    @PostMapping("/models/sync")
    public ResponseEntity<Map<String, Object>> syncModels() {
        try {
            return ResponseEntity.ok(gatewayModelSyncService.syncModels());
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : e.toString();
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", msg));
        }
    }

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
            map.put("config", ModelConfigUtil.normalizeConfig(m.getModelId(), m.getType(), m.getApiFormat(), m.getConfig()));
            map.put("isActive", m.getIsActive());
            map.put("sortOrder", m.getSortOrder());
            map.put("createdAt", m.getCreatedAt());
            result.add(map);
        }
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/models")
    public ResponseEntity<com.smartlearning.backend.entity.Model> createModel(@RequestBody com.smartlearning.backend.entity.Model model) {
        model.setApiFormat("openai");
        model.setApiEndpointId(null);
        model.setConfig(ModelConfigUtil.normalizeConfig(model.getModelId(), model.getType(), model.getApiFormat(), model.getConfig()));
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
        model.setIsActive(modelDetails.getIsActive());
        model.setSortOrder(modelDetails.getSortOrder());
        model.setApiFormat("openai");
        model.setApiEndpointId(null);
        model.setConfig(ModelConfigUtil.normalizeConfig(model.getModelId(), model.getType(), model.getApiFormat(), modelDetails.getConfig()));
        return ResponseEntity.ok(modelRepository.save(model));
    }

    @PostMapping("/models/batch")
    public ResponseEntity<Map<String, Object>> batchCreateModels(@RequestBody List<com.smartlearning.backend.entity.Model> models) {
        List<com.smartlearning.backend.entity.Model> savedModels = new ArrayList<>();
        for (com.smartlearning.backend.entity.Model model : models) {
            if (!modelRepository.existsByModelId(model.getModelId())) {
                model.setApiFormat("openai");
                model.setApiEndpointId(null);
                model.setConfig(ModelConfigUtil.normalizeConfig(model.getModelId(), model.getType(), model.getApiFormat(), model.getConfig()));
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

    // --- PROFILE ---
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body) {
        User teacher = userRepository.findById(getTeacherId()).orElseThrow();
        if (body.containsKey("displayName")) {
            teacher.setDisplayName(body.get("displayName"));
        }
        if (body.containsKey("password") && !body.get("password").trim().isEmpty()) {
            teacher.setPasswordHash(passwordEncoder.encode(body.get("password")));
        }
        User saved = userRepository.save(teacher);
        
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", saved.getId());
        userData.put("username", saved.getUsername());
        userData.put("displayName", saved.getDisplayName());
        userData.put("role", saved.getRole());
        
        return ResponseEntity.ok(Map.of("success", true, "user", userData));
    }
}
