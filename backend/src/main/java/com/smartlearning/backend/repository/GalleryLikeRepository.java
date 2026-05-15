package com.smartlearning.backend.repository;

import com.smartlearning.backend.entity.GalleryLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GalleryLikeRepository extends JpaRepository<GalleryLike, String> {
    Optional<GalleryLike> findByUserIdAndGenerationId(String userId, String generationId);
    List<GalleryLike> findByGenerationIdIn(List<String> generationIds);
    long countByGenerationId(String generationId);
}
