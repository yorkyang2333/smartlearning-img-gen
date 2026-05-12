package com.smartlearning.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "models")
public class Model {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String modelId;

    @Column(nullable = false)
    private String type; // TEXT_TO_IMAGE | IMAGE_TO_IMAGE | BOTH

    @Column(nullable = false)
    private String provider;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String config; // JSON string

    @Column(nullable = false)
    private Boolean isActive = true;

    @Column(nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "api_endpoint_id")
    private String apiEndpointId;

    @Column(nullable = false)
    private String apiFormat = "openai"; // openai | gemini

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @org.hibernate.annotations.UpdateTimestamp
    private LocalDateTime updatedAt;
}
