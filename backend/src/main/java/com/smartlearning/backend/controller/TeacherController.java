package com.smartlearning.backend.controller;

import com.smartlearning.backend.entity.Assignment;
import com.smartlearning.backend.repository.AssignmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import com.smartlearning.backend.entity.TutorConfig;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.entity.Template;
import com.smartlearning.backend.repository.TutorConfigRepository;
import com.smartlearning.backend.repository.UserRepository;
import com.smartlearning.backend.repository.TemplateRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/teacher")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherController {

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TutorConfigRepository tutorConfigRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TemplateRepository templateRepository;

    private String getTeacherId() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByUsername(userDetails.getUsername()).orElseThrow().getId();
    }

    // --- ASSIGNMENTS ---
    @GetMapping("/assignments")
    public ResponseEntity<List<Assignment>> getAssignments() {
        return ResponseEntity.ok(assignmentRepository.findByTeacherIdOrderByCreatedAtDesc(getTeacherId()));
    }

    @PostMapping("/assignments")
    public ResponseEntity<Assignment> createAssignment(@RequestBody Assignment assignment) {
        assignment.setTeacherId(getTeacherId());
        return ResponseEntity.ok(assignmentRepository.save(assignment));
    }

    // --- TUTOR CONFIG (MODELS) ---
    @GetMapping("/config")
    public ResponseEntity<TutorConfig> getConfig() {
        String teacherId = getTeacherId();
        return ResponseEntity.ok(tutorConfigRepository.findByTeacherId(teacherId)
            .orElseGet(() -> {
                TutorConfig newConfig = new TutorConfig();
                newConfig.setTeacherId(teacherId);
                return tutorConfigRepository.save(newConfig);
            }));
    }

    @PutMapping("/config")
    public ResponseEntity<TutorConfig> updateConfig(@RequestBody TutorConfig configDetails) {
        TutorConfig config = tutorConfigRepository.findByTeacherId(getTeacherId())
            .orElseThrow(() -> new RuntimeException("Config not found"));
        
        config.setEnabled(configDetails.getEnabled());
        config.setSystemPrompt(configDetails.getSystemPrompt());
        config.setModelName(configDetails.getModelName());
        
        return ResponseEntity.ok(tutorConfigRepository.save(config));
    }

    // --- STUDENTS ---
    @GetMapping("/students")
    public ResponseEntity<List<User>> getStudents() {
        List<User> students = userRepository.findByTeacherId(getTeacherId());
        // Clean password hash before sending to frontend
        students.forEach(s -> s.setPasswordHash(null));
        return ResponseEntity.ok(students);
    }

    @PutMapping("/students/{studentId}/quota")
    public ResponseEntity<User> updateQuota(@PathVariable String studentId, @RequestBody Map<String, Integer> body) {
        User student = userRepository.findById(studentId).orElseThrow();
        if (!student.getTeacherId().equals(getTeacherId())) {
            return ResponseEntity.status(403).build();
        }
        student.setTokenQuota(body.get("quota"));
        User saved = userRepository.save(student);
        saved.setPasswordHash(null);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/students/{studentId}/status")
    public ResponseEntity<User> updateStatus(@PathVariable String studentId, @RequestBody Map<String, Boolean> body) {
        User student = userRepository.findById(studentId).orElseThrow();
        if (!student.getTeacherId().equals(getTeacherId())) {
            return ResponseEntity.status(403).build();
        }
        student.setIsActive(body.get("isActive"));
        User saved = userRepository.save(student);
        saved.setPasswordHash(null);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/students/{studentId}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable String studentId, @RequestBody Map<String, String> body) {
        User student = userRepository.findById(studentId).orElseThrow();
        if (!student.getTeacherId().equals(getTeacherId())) {
            return ResponseEntity.status(403).build();
        }
        student.setPasswordHash(passwordEncoder.encode(body.get("newPassword")));
        userRepository.save(student);
        return ResponseEntity.ok().build();
    }

    // --- TEMPLATES ---
    @GetMapping("/templates")
    public ResponseEntity<List<Template>> getTemplates() {
        return ResponseEntity.ok(templateRepository.findByTeacherIdOrderByCreatedAtDesc(getTeacherId()));
    }

    @PostMapping("/templates")
    public ResponseEntity<Template> createTemplate(@RequestBody Template template) {
        template.setTeacherId(getTeacherId());
        return ResponseEntity.ok(templateRepository.save(template));
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<?> deleteTemplate(@PathVariable String id) {
        Template template = templateRepository.findById(id).orElseThrow();
        if (!template.getTeacherId().equals(getTeacherId())) {
            return ResponseEntity.status(403).build();
        }
        templateRepository.delete(template);
        return ResponseEntity.ok().build();
    }
}
