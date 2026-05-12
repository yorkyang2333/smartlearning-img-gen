package com.smartlearning.backend.repository;

import com.smartlearning.backend.entity.TutorConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TutorConfigRepository extends JpaRepository<TutorConfig, String> {
    Optional<TutorConfig> findByTeacherId(String teacherId);
}
