package com.smartlearning.backend.controller;

import com.smartlearning.backend.entity.Assignment;
import com.smartlearning.backend.repository.AssignmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teacher")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherController {

    @Autowired
    private AssignmentRepository assignmentRepository;

    @GetMapping("/assignments")
    public ResponseEntity<List<Assignment>> getAssignments() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        // Mock getting teacher ID from username for now
        String teacherId = "mock-teacher-id"; 
        return ResponseEntity.ok(assignmentRepository.findByTeacherIdOrderByCreatedAtDesc(teacherId));
    }

    @PostMapping("/assignments")
    public ResponseEntity<Assignment> createAssignment(@RequestBody Assignment assignment) {
        // Mock getting teacher ID
        assignment.setTeacherId("mock-teacher-id");
        return ResponseEntity.ok(assignmentRepository.save(assignment));
    }
}
