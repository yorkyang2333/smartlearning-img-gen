package com.smartlearning.backend.repository;

import com.smartlearning.backend.entity.Model;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ModelRepository extends JpaRepository<Model, String> {
    java.util.List<Model> findAllByOrderBySortOrderAsc();
    long countByApiEndpointId(String apiEndpointId);
}
