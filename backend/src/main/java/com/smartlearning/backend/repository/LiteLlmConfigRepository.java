package com.smartlearning.backend.repository;

import com.smartlearning.backend.entity.LiteLlmConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LiteLlmConfigRepository extends JpaRepository<LiteLlmConfig, String> {
}
