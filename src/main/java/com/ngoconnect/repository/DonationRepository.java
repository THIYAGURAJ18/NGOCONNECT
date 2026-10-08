package com.ngoconnect.repository;

import com.ngoconnect.entity.Donation;
import com.ngoconnect.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface DonationRepository extends JpaRepository<Donation, Long> {

    List<Donation> findByContributorOrderByDonatedAtDesc(User contributor);

    List<Donation> findByCampaignIdOrderByDonatedAtDesc(Long campaignId);

    @Query("SELECT SUM(d.amount) FROM Donation d WHERE d.paymentStatus = 'SUCCESS'")
    BigDecimal sumTotalMoney();

    long countByPaymentStatus(Donation.PaymentStatus status);
}
