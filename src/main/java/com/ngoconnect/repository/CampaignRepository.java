package com.ngoconnect.repository;

import com.ngoconnect.entity.Campaign;
import com.ngoconnect.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface CampaignRepository extends JpaRepository<Campaign, Long> {

    List<Campaign> findByCreatedByOrderByCreatedAtDesc(User createdBy);

    List<Campaign> findByActiveOrderByCreatedAtDesc(boolean active);

    List<Campaign> findByIsDisasterReliefAndActiveOrderByCreatedAtDesc(boolean isDisasterRelief, boolean active);

    @Query("SELECT SUM(c.raisedAmount) FROM Campaign c WHERE c.active = true")
    BigDecimal sumTotalRaised();

    long countByActive(boolean active);
}
