package com.ngoconnect.repository;

import com.ngoconnect.entity.DistributionUpdate;
import com.ngoconnect.entity.DonationPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DistributionUpdateRepository extends JpaRepository<DistributionUpdate, Long> {
    List<DistributionUpdate> findByDonationPostOrderByUpdatedAtDesc(DonationPost donationPost);
}
