package com.smartlearning.backend.controller;

import com.smartlearning.backend.entity.GalleryLike;
import com.smartlearning.backend.entity.Generation;
import com.smartlearning.backend.entity.Model;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.repository.GalleryLikeRepository;
import com.smartlearning.backend.repository.GenerationRepository;
import com.smartlearning.backend.repository.ModelRepository;
import com.smartlearning.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/class-gallery")
public class GalleryController {

    @Autowired
    private GenerationRepository generationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ModelRepository modelRepository;

    @Autowired
    private GalleryLikeRepository galleryLikeRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getClassGallery(
            @RequestParam(defaultValue = "all") String filter,
            Authentication authentication) {

        User currentUser = userRepository.findByUsername(authentication.getName()).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.ok(Map.of("success", false, "data", List.of()));
        }

        // Find classmates: students with the same teacherId
        String teacherId = "TEACHER".equals(currentUser.getRole())
                ? currentUser.getId()
                : currentUser.getTeacherId();

        List<String> classUserIds;
        if ("my".equals(filter)) {
            classUserIds = List.of(currentUser.getId());
        } else {
            List<User> classmates = userRepository.findByTeacherId(teacherId);
            classUserIds = classmates.stream().map(User::getId).collect(Collectors.toList());
            if (!classUserIds.contains(currentUser.getId())) {
                classUserIds.add(currentUser.getId());
            }
        }

        // Get generations with output images only
        List<Generation> generations = generationRepository.findTop50ByUserIdInOrderByCreatedAtDesc(classUserIds);
        generations = generations.stream()
                .filter(g -> g.getOutputImageUrl() != null && !g.getOutputImageUrl().isEmpty())
                .collect(Collectors.toList());

        if (generations.isEmpty()) {
            return ResponseEntity.ok(Map.of("success", true, "data", List.of()));
        }

        // Batch load users and models
        Set<String> userIds = generations.stream().map(Generation::getUserId).collect(Collectors.toSet());
        Set<String> modelIds = generations.stream().map(Generation::getModelId).collect(Collectors.toSet());

        Map<String, User> userMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        Map<String, Model> modelMap = modelRepository.findAllById(modelIds).stream()
                .collect(Collectors.toMap(Model::getId, m -> m));
        // Also try matching by modelId field
        List<Model> allModels = modelRepository.findAll();
        Map<String, Model> modelByModelId = allModels.stream()
                .collect(Collectors.toMap(Model::getModelId, m -> m, (a, b) -> a));

        // Batch load likes
        List<String> genIds = generations.stream().map(Generation::getId).collect(Collectors.toList());
        List<GalleryLike> allLikes = galleryLikeRepository.findByGenerationIdIn(genIds);
        Map<String, Long> likeCounts = allLikes.stream()
                .collect(Collectors.groupingBy(GalleryLike::getGenerationId, Collectors.counting()));
        Set<String> currentUserLiked = allLikes.stream()
                .filter(l -> l.getUserId().equals(currentUser.getId()))
                .map(GalleryLike::getGenerationId)
                .collect(Collectors.toSet());

        // Build response
        List<Map<String, Object>> data = new ArrayList<>();
        for (Generation g : generations) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", g.getId());
            item.put("prompt", g.getPrompt());
            item.put("outputImageUrl", g.getOutputImageUrl());
            item.put("createdAt", g.getCreatedAt());

            User author = userMap.get(g.getUserId());
            if (author != null) {
                Map<String, String> userInfo = new LinkedHashMap<>();
                userInfo.put("displayName", author.getDisplayName());
                userInfo.put("username", author.getUsername());
                item.put("user", userInfo);
            }

            Model model = modelMap.get(g.getModelId());
            if (model == null) {
                model = modelByModelId.get(g.getModelId());
            }
            if (model != null) {
                item.put("model", Map.of("name", model.getName()));
            }

            item.put("likeCount", likeCounts.getOrDefault(g.getId(), 0L));
            item.put("hasLiked", currentUserLiked.contains(g.getId()));
            data.add(item);
        }

        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }

    @PostMapping("/{generationId}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable String generationId,
            Authentication authentication) {

        User currentUser = userRepository.findByUsername(authentication.getName()).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.ok(Map.of("success", false));
        }

        Optional<GalleryLike> existing = galleryLikeRepository.findByUserIdAndGenerationId(
                currentUser.getId(), generationId);

        if (existing.isPresent()) {
            galleryLikeRepository.delete(existing.get());
        } else {
            GalleryLike like = new GalleryLike();
            like.setUserId(currentUser.getId());
            like.setGenerationId(generationId);
            galleryLikeRepository.save(like);
        }

        return ResponseEntity.ok(Map.of("success", true));
    }
}
