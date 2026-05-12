package com.smartlearning.backend.repository;

import com.smartlearning.backend.entity.Generation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GenerationRepository extends JpaRepository<Generation, String> {
    List<Generation> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Generation> findTop50ByUserIdInOrderByCreatedAtDesc(List<String> userIds);
}
