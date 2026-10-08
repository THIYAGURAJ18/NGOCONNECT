package com.ngoconnect.repository;

import com.ngoconnect.entity.MaterialPledge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaterialPledgeRepository extends JpaRepository<MaterialPledge, Long> {
}
