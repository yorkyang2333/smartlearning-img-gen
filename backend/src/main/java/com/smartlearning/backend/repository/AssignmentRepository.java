package com.smartlearning.backend.repository;

import com.smartlearning.backend.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, String> {
    List<Assignment> findByTeacherIdOrderByCreatedAtDesc(String teacherId);
}
