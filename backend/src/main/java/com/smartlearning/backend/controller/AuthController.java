package com.smartlearning.backend.controller;

import com.smartlearning.backend.entity.GatewayConfig;
import com.smartlearning.backend.entity.Model;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.repository.GatewayConfigRepository;
import com.smartlearning.backend.repository.ModelRepository;
import com.smartlearning.backend.repository.UserRepository;
import com.smartlearning.backend.security.JwtUtil;
import com.smartlearning.backend.util.ModelConfigUtil;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ModelRepository modelRepository;

    @Autowired
    private GatewayConfigRepository gatewayConfigRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            User user = userRepository.findByUsername(loginRequest.getUsername()).orElseThrow();
            
            if (!user.getIsActive()) {
                return ResponseEntity.status(403).body("User is deactivated");
            }

            final String jwt = jwtUtil.generateToken(user.getUsername(), user.getRole(), user.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("token", jwt);
            response.put("user", Map.of(
                    "id", user.getId(),
                    "username", user.getUsername(),
                    "displayName", user.getDisplayName(),
                    "role", user.getRole()
            ));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Invalid credentials");
        }
    }

    @Data
    static class LoginRequest {
        private String username;
        private String password;
    }

    @GetMapping("/system-status")
    public ResponseEntity<Map<String, Object>> systemStatus() {
        boolean initialized = userRepository.count() > 0;
        return ResponseEntity.ok(Map.of("initialized", initialized));
    }

    @PostMapping("/setup")
    @Transactional
    public ResponseEntity<?> initialSetup(@RequestBody SetupRequest request) {
        if (userRepository.count() > 0) {
            return ResponseEntity.status(403).body(Map.of("error", "System already initialized"));
        }

        User teacher = new User();
        teacher.setUsername(request.getUsername());
        teacher.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        teacher.setDisplayName(request.getDisplayName());
        teacher.setRole("TEACHER");
        teacher.setIsActive(true);
        userRepository.save(teacher);

        GatewayConfig config = new GatewayConfig();
        config.setId("default");
        config.setEnabled(true);
        config.setBaseUrl(request.getApiBaseUrl());
        config.setApiKey(request.getApiKey());
        gatewayConfigRepository.save(config);

        if (request.getModels() != null) {
            for (ModelSetupItem item : request.getModels()) {
                Model m = new Model();
                m.setName(item.getName());
                m.setModelId(item.getModelId());
                m.setType(item.getType());
                m.setProvider(item.getProvider());
                m.setDescription(item.getDescription());
                m.setApiFormat("openai");
                m.setConfig(ModelConfigUtil.normalizeConfig(
                        item.getModelId(), item.getType(), "openai", null));
                modelRepository.save(m);
            }
        }

        String jwt = jwtUtil.generateToken(teacher.getUsername(), teacher.getRole(), teacher.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("token", jwt);
        response.put("user", Map.of(
                "id", teacher.getId(),
                "username", teacher.getUsername(),
                "displayName", teacher.getDisplayName(),
                "role", teacher.getRole()
        ));
        return ResponseEntity.ok(response);
    }

    @Data
    static class SetupRequest {
        private String username;
        private String password;
        private String displayName;
        private String apiBaseUrl;
        private String apiKey;
        private List<ModelSetupItem> models;
    }

    @Data
    static class ModelSetupItem {
        private String name;
        private String modelId;
        private String type;
        private String provider;
        private String description;
    }
}
