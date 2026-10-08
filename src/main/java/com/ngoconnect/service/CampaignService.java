package com.ngoconnect.service;

import com.ngoconnect.dto.CampaignDto;
import com.ngoconnect.entity.Campaign;
import com.ngoconnect.entity.Donation;
import com.ngoconnect.entity.User;
import com.ngoconnect.exception.ResourceNotFoundException;
import com.ngoconnect.repository.CampaignRepository;
import com.ngoconnect.repository.DonationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final DonationRepository donationRepository;

    @Transactional
    public CampaignDto.Response create(CampaignDto.CreateRequest req, User creator) {
        // Only verified NGOs and Consumers can create campaigns
        if (creator.getRole() == User.Role.NGO && !creator.isVerified()) {
            throw new IllegalStateException("NGO must be verified by admin before creating campaigns");
        }

        Campaign campaign = new Campaign();
        campaign.setCreatedBy(creator);
        campaign.setTitle(req.getTitle());
        campaign.setDescription(req.getDescription());
        campaign.setTargetAmount(req.getTargetAmount());
        campaign.setCity(req.getCity());
        if (req.getDeadline() != null && !req.getDeadline().isBlank()) {
            campaign.setDeadline(LocalDateTime.parse(req.getDeadline() + "T00:00:00"));
        }
        return CampaignDto.Response.from(campaignRepository.save(campaign));
    }

    public List<CampaignDto.Response> getAll() {
        return campaignRepository.findByActiveOrderByCreatedAtDesc(true)
            .stream().map(CampaignDto.Response::from).collect(Collectors.toList());
    }

    public CampaignDto.Response getById(Long id) {
        return CampaignDto.Response.from(findEntityById(id));
    }

    public List<CampaignDto.Response> getMyCampaigns(User user) {
        return campaignRepository.findByCreatedByOrderByCreatedAtDesc(user)
            .stream().map(CampaignDto.Response::from).collect(Collectors.toList());
    }

    /**
     * MOCK PAYMENT: No real payment gateway.
     * In production, integrate Razorpay here:
     * 1. Create Razorpay order server-side
     * 2. Return order_id to frontend
     * 3. Frontend opens Razorpay checkout
     * 4. On success, frontend sends razorpay_payment_id + signature here for verification
     * 5. Verify signature with HMAC-SHA256, then credit the campaign
     */
    @Transactional
    public CampaignDto.Response donate(Long campaignId, CampaignDto.DonateRequest req, User contributor) {
        Campaign campaign = findEntityById(campaignId);
        if (!campaign.isActive()) {
            throw new IllegalStateException("Campaign is no longer active");
        }

        // MOCK: Generate a fake payment reference (replace with Razorpay payment ID)
        String mockRef = "MOCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Donation donation = new Donation();
        donation.setCampaign(campaign);
        donation.setContributor(contributor);
        donation.setAmount(req.getAmount());
        donation.setNote(req.getNote());
        donation.setMockPaymentRef(mockRef);
        donation.setPaymentStatus(Donation.PaymentStatus.SUCCESS);
        donationRepository.save(donation);

        // Update campaign raised amount
        campaign.setRaisedAmount(campaign.getRaisedAmount().add(req.getAmount()));
        // Auto-close if target reached
        if (campaign.getRaisedAmount().compareTo(campaign.getTargetAmount()) >= 0) {
            campaign.setActive(false);
        }
        return CampaignDto.Response.from(campaignRepository.save(campaign));
    }

    public Campaign findEntityById(Long id) {
        return campaignRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Campaign not found: " + id));
    }
}
