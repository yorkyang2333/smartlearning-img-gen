package com.smartlearning.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "templates")
public class Template {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "teacher_id", nullable = false)
    private String teacherId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column
    private String category;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String templateContent;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
