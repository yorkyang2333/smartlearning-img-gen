package com.smartlearning.backend.controller;

import com.smartlearning.backend.entity.Generation;
import com.smartlearning.backend.repository.GenerationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gallery")
public class GalleryController {

    @Autowired
    private GenerationRepository generationRepository;

    @GetMapping
    public ResponseEntity<List<Generation>> getGalleryImages() {
        // Return all generations for the public gallery (in a real app, only "public" or "liked" ones)
        return ResponseEntity.ok(generationRepository.findAll());
    }

    @PostMapping("/{generationId}/like")
    public ResponseEntity<?> likeImage(@PathVariable String generationId) {
        // Mock liking logic
        return ResponseEntity.ok().build();
    }
}
