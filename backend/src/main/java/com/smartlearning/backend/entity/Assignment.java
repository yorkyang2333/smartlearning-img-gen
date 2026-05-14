package com.smartlearning.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "assignments")
public class Assignment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "teacher_id", nullable = false)
    private String teacherId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(columnDefinition = "TEXT")
    private String requirements; // JSON string

    @Column(columnDefinition = "TEXT")
    private String allowedModelIds; // JSON string

    @Column(columnDefinition = "TEXT")
    private String allowedSizes; // JSON string

    @Column(nullable = false)
    private Integer maxSubmissions = 1;

    private LocalDateTime deadline;

    @Column(nullable = false)
    private String type = "STANDARD"; // STANDARD | CHALLENGE

    private Integer durationMin;
    private String status; // PENDING | ACTIVE | ENDED
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;

    @Column(nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Transient
    private List<Submission> submissions;
}
