package com.smartlearning.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "generations")
public class Generation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "model_id", nullable = false)
    private String modelId;

    @Column(nullable = false)
    private String type; // TEXT_TO_IMAGE | IMAGE_TO_IMAGE

    @Column(columnDefinition = "TEXT", nullable = false)
    private String prompt;

    @Column(columnDefinition = "LONGTEXT")
    private String inputImageUrl;

    @Column(columnDefinition = "LONGTEXT")
    private String outputImageUrl;

    private String size;
    private String quality;
    private Integer durationMs;

    @Column(columnDefinition = "LONGTEXT")
    private String apiResponse; // JSON string

    @Column(name = "conversation_id")
    private String conversationId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
