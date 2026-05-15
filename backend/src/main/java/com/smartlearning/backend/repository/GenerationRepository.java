package com.smartlearning.backend.repository;

import com.smartlearning.backend.entity.Generation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GenerationRepository extends JpaRepository<Generation, String> {
    List<Generation> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Generation> findByUserIdAndPromptContainingOrderByCreatedAtDesc(String userId, String keyword);
    List<Generation> findTop50ByUserIdInOrderByCreatedAtDesc(List<String> userIds);
    List<Generation> findByCreatedAtAfter(java.time.LocalDateTime date);
    List<Generation> findAllByOrderByCreatedAtDesc();
    List<Generation> findByConversationIdOrderByCreatedAtAsc(String conversationId);
    long countByUserId(String userId);
    long countByUserIdAndCreatedAtAfter(String userId, java.time.LocalDateTime date);
}
