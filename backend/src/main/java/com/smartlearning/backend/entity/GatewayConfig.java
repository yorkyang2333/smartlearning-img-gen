package com.smartlearning.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "gateway_configs")
public class GatewayConfig {
    @Id
    @Column(nullable = false, length = 64)
    private String id = "default";

    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(nullable = false)
    private String baseUrl = "https://ai-generating.com";

    @Column(columnDefinition = "TEXT")
    private String apiKey;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
