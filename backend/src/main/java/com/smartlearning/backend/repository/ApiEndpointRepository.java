package com.smartlearning.backend.repository;

import com.smartlearning.backend.entity.ApiEndpoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApiEndpointRepository extends JpaRepository<ApiEndpoint, String> {
}
