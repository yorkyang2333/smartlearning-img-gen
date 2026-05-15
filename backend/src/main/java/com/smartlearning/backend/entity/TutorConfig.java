package com.smartlearning.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "tutor_configs")
public class TutorConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "teacher_id", unique = true, nullable = false)
    private String teacherId;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(columnDefinition = "TEXT")
    private String systemPrompt;

    @Column(nullable = false)
    private String modelName = "qwen-vl-max";

    @Column(name = "api_endpoint_id")
    private String apiEndpointId;
}
