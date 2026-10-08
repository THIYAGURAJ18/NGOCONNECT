package com.ngoconnect.service;

import com.ngoconnect.dto.AuthDto;
import com.ngoconnect.entity.User;
import com.ngoconnect.exception.ResourceNotFoundException;
import com.ngoconnect.repository.*;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final DonationPostRepository donationPostRepository;
    private final CampaignRepository campaignRepository;
    private final DonationRepository donationRepository;

    @Transactional
    public AuthDto.UserResponse verifyNgo(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (user.getRole() != User.Role.NGO) {
            throw new IllegalArgumentException("Only NGO accounts can be verified");
        }
        user.setVerified(true);
        return AuthDto.UserResponse.from(userRepository.save(user));
    }

    public List<AuthDto.UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
            .map(AuthDto.UserResponse::from).collect(Collectors.toList());
    }

    public List<AuthDto.UserResponse> getPendingNgos() {
        return userRepository.findAll().stream()
            .filter(u -> u.getRole() == User.Role.NGO && !u.isVerified())
            .map(AuthDto.UserResponse::from)
            .collect(Collectors.toList());
    }

    @Data
    public static class AnalyticsResponse {
        private long totalContributors;
        private long totalNgos;
        private long totalConsumers;
        private long totalDonationPosts;
        private long postedDonations;
        private long acceptedDonations;
        private long collectedDonations;
        private long distributedDonations;
        private long totalCampaigns;
        private long activeCampaigns;
        private BigDecimal totalMoneyRaised;
        private long totalMoneyDonations;
        private Map<String, Long> donationsByCategory;
    }

    public AnalyticsResponse getAnalytics() {
        AnalyticsResponse a = new AnalyticsResponse();
        a.setTotalContributors(userRepository.countByRole(User.Role.CONTRIBUTOR));
        a.setTotalNgos(userRepository.countByRole(User.Role.NGO));
        a.setTotalConsumers(userRepository.countByRole(User.Role.CONSUMER));
        a.setTotalDonationPosts(donationPostRepository.count());

        // Cast safely using Status enum
        a.setPostedDonations(donationPostRepository.countByStatus(com.ngoconnect.entity.DonationPost.Status.POSTED));
        a.setAcceptedDonations(donationPostRepository.countByStatus(com.ngoconnect.entity.DonationPost.Status.ACCEPTED));
        a.setCollectedDonations(donationPostRepository.countByStatus(com.ngoconnect.entity.DonationPost.Status.COLLECTED));
        a.setDistributedDonations(donationPostRepository.countByStatus(com.ngoconnect.entity.DonationPost.Status.DISTRIBUTED));

        a.setTotalCampaigns(campaignRepository.count());
        a.setActiveCampaigns(campaignRepository.countByActive(true));

        BigDecimal totalRaised = campaignRepository.sumTotalRaised();
        a.setTotalMoneyRaised(totalRaised != null ? totalRaised : BigDecimal.ZERO);
        a.setTotalMoneyDonations(donationRepository.countByPaymentStatus(com.ngoconnect.entity.Donation.PaymentStatus.SUCCESS));

        // Category breakdown
        List<Object[]> categoryData = donationPostRepository.countByCategory();
        Map<String, Long> byCategory = categoryData.stream()
            .collect(Collectors.toMap(
                row -> (String) row[0],
                row -> (Long) row[1]
            ));
        a.setDonationsByCategory(byCategory);

        return a;
    }
}
