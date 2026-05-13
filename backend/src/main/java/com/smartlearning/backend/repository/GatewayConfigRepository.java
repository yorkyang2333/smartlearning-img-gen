package com.smartlearning.backend.repository;

import com.smartlearning.backend.entity.GatewayConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GatewayConfigRepository extends JpaRepository<GatewayConfig, String> {
}
