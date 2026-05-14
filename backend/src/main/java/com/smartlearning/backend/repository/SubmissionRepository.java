package com.smartlearning.backend.repository;

import com.smartlearning.backend.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, String> {
    List<Submission> findByAssignmentId(String assignmentId);
    List<Submission> findByStudentId(String studentId);
    List<Submission> findByAssignmentIdAndStudentId(String assignmentId, String studentId);
    List<Submission> findByAssignmentIdInAndStudentId(List<String> assignmentIds, String studentId);
}
