package com.smartlearning.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "gallery_likes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "generation_id"})
})
public class GalleryLike {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "generation_id", nullable = false)
    private String generationId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
