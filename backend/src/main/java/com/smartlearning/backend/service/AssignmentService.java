package com.smartlearning.backend.service;

import com.smartlearning.backend.entity.Assignment;
import com.smartlearning.backend.entity.Generation;
import com.smartlearning.backend.entity.Submission;
import com.smartlearning.backend.repository.AssignmentRepository;
import com.smartlearning.backend.repository.GenerationRepository;
import com.smartlearning.backend.repository.SubmissionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AssignmentService {

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private GenerationRepository generationRepository;

    public List<Assignment> getTeacherAssignments(String teacherId) {
        return assignmentRepository.findByTeacherIdOrderByCreatedAtDesc(teacherId);
    }

    public Assignment createAssignment(Assignment assignment, String teacherId) {
        assignment.setTeacherId(teacherId);
        return assignmentRepository.save(assignment);
    }

    public Assignment updateAssignment(String id, String teacherId, Map<String, Object> updates) {
        Assignment assignment = assignmentRepository.findById(id).orElseThrow();
        if (!assignment.getTeacherId().equals(teacherId)) {
            throw new SecurityException("无权操作此任务");
        }
        if (updates.containsKey("isActive")) {
            assignment.setIsActive((Boolean) updates.get("isActive"));
        }
        if (updates.containsKey("status")) {
            String status = (String) updates.get("status");
            assignment.setStatus(status);
            if ("ACTIVE".equals(status) && assignment.getStartedAt() == null) {
                assignment.setStartedAt(LocalDateTime.now());
            }
            if ("ENDED".equals(status)) {
                assignment.setEndedAt(LocalDateTime.now());
                assignment.setIsActive(false);
            }
        }
        return assignmentRepository.save(assignment);
    }

    public List<Submission> getSubmissions(String assignmentId, String teacherId) {
        Assignment assignment = assignmentRepository.findById(assignmentId).orElseThrow();
        if (!assignment.getTeacherId().equals(teacherId)) {
            throw new SecurityException("无权查看此任务的提交");
        }
        List<Submission> submissions = submissionRepository.findByAssignmentId(assignmentId);
        enrichSubmissionsWithPrompt(submissions);
        return submissions;
    }

    private void enrichSubmissionsWithPrompt(List<Submission> submissions) {
        List<String> genIds = submissions.stream()
                .map(Submission::getGenerationId)
                .filter(id -> id != null && !id.isEmpty())
                .collect(Collectors.toList());
        if (!genIds.isEmpty()) {
            List<Generation> gens = generationRepository.findAllById(genIds);
            Map<String, String> promptMap = gens.stream()
                    .collect(Collectors.toMap(Generation::getId, Generation::getPrompt));
            submissions.forEach(s -> {
                if (s.getGenerationId() != null) {
                    s.setPrompt(promptMap.get(s.getGenerationId()));
                }
            });
        }
    }

    public Submission reviewSubmission(String submissionId, String teacherId, Integer score, String feedback) {
        Submission submission = submissionRepository.findById(submissionId).orElseThrow();
        Assignment assignment = assignmentRepository.findById(submission.getAssignmentId()).orElseThrow();
        if (!assignment.getTeacherId().equals(teacherId)) {
            throw new SecurityException("无权评阅此提交");
        }
        submission.setStatus("REVIEWED");
        if (score != null) {
            submission.setScore(score);
        }
        if (feedback != null) {
            submission.setFeedback(feedback);
        }
        return submissionRepository.save(submission);
    }

    public List<Assignment> getStudentAssignments(String teacherId, String studentId) {
        List<Assignment> list = assignmentRepository.findByTeacherIdOrderByCreatedAtDesc(teacherId);
        if (!list.isEmpty()) {
            List<String> assignmentIds = list.stream().map(Assignment::getId).collect(Collectors.toList());
            List<Submission> allSubmissions = submissionRepository.findByAssignmentIdInAndStudentId(assignmentIds, studentId);
            Map<String, List<Submission>> subMap = allSubmissions.stream()
                    .collect(Collectors.groupingBy(Submission::getAssignmentId));
            list.forEach(a -> a.setSubmissions(subMap.getOrDefault(a.getId(), List.of())));
        }
        return list;
    }

    public Assignment getAssignmentById(String id, String studentId) {
        Assignment assignment = assignmentRepository.findById(id).orElseThrow();
        List<Submission> submissions = submissionRepository.findByAssignmentIdAndStudentId(id, studentId);
        assignment.setSubmissions(submissions);
        return assignment;
    }

    public Submission submitWork(String assignmentId, String studentId, String generationId, String imageUrl) {
        Assignment assignment = assignmentRepository.findById(assignmentId).orElseThrow();

        List<Submission> existing = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, studentId);
        if (existing.size() >= assignment.getMaxSubmissions()) {
            throw new IllegalStateException("已达到最大提交次数");
        }

        if (assignment.getDeadline() != null && LocalDateTime.now().isAfter(assignment.getDeadline())) {
            throw new IllegalStateException("已超过截止时间");
        }

        if ("CHALLENGE".equals(assignment.getType()) && assignment.getStartedAt() != null && assignment.getDurationMin() != null) {
            LocalDateTime expiry = assignment.getStartedAt().plusMinutes(assignment.getDurationMin());
            if (LocalDateTime.now().isAfter(expiry)) {
                throw new IllegalStateException("挑战时间已结束");
            }
        }

        Submission submission = new Submission();
        submission.setAssignmentId(assignmentId);
        submission.setStudentId(studentId);
        submission.setGenerationId(generationId);
        submission.setImageUrl(imageUrl);
        submission.setStatus("PENDING");
        return submissionRepository.save(submission);
    }
}
