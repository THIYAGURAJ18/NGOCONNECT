package com.ngoconnect.repository;

import com.ngoconnect.entity.DisasterRelief;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DisasterReliefRepository extends JpaRepository<DisasterRelief, Long> {
    List<DisasterRelief> findByActiveOrderByCreatedAtDesc(boolean active);
    List<DisasterRelief> findByActiveTrueAndCreatedAtBefore(LocalDateTime cutoff);
    List<DisasterRelief> findByActiveTrueAndExpiresAtBefore(LocalDateTime now);
}
