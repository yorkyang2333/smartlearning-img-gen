package com.smartlearning.backend.repository;

import com.smartlearning.backend.entity.ClassGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassGroupRepository extends JpaRepository<ClassGroup, String> {
    List<ClassGroup> findByTeacherIdOrderBySortOrderAsc(String teacherId);
    Optional<ClassGroup> findByIdAndTeacherId(String id, String teacherId);
}
