package com.smartlearning.backend.controller;

import com.smartlearning.backend.entity.Generation;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.repository.GenerationRepository;
import com.smartlearning.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/teacher/live")
@PreAuthorize("hasRole('TEACHER')")
public class LiveController {

    @Autowired
    private GenerationRepository generationRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/feed")
    public ResponseEntity<Map<String, Object>> getLiveFeed() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User teacher = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();

        // Get all student IDs for this teacher
        List<User> students = userRepository.findByTeacherId(teacher.getId());
        List<String> studentIds = students.stream().map(User::getId).collect(Collectors.toList());

        if (studentIds.isEmpty()) {
            return ResponseEntity.ok(Map.of("success", true, "data", List.of(), "totalCount", 0));
        }

        // Fetch top 50 generations
        List<Generation> generations = generationRepository.findTop50ByUserIdInOrderByCreatedAtDesc(studentIds);

        // Map userId to displayName for the frontend
        Map<String, String> userNames = students.stream()
                .collect(Collectors.toMap(User::getId, User::getDisplayName));

        List<Map<String, Object>> enrichedGens = generations.stream().map(g -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", g.getId());
            map.put("outputImageUrl", g.getOutputImageUrl());
            map.put("prompt", g.getPrompt());
            map.put("createdAt", g.getCreatedAt());
            map.put("user", Map.of("displayName", userNames.getOrDefault(g.getUserId(), "Unknown")));
            return map;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", enrichedGens);
        // We could run a count query, but for now we just return the size or mock it
        response.put("totalCount", generations.size());

        return ResponseEntity.ok(response);
    }
}
