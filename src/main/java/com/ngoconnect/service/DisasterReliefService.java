package com.ngoconnect.service;

import com.ngoconnect.dto.CampaignDto;
import com.ngoconnect.dto.DisasterReliefDto;
import com.ngoconnect.entity.*;
import com.ngoconnect.exception.ResourceNotFoundException;
import com.ngoconnect.repository.CampaignRepository;
import com.ngoconnect.repository.DisasterReliefRepository;
import com.ngoconnect.repository.MaterialPledgeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DisasterReliefService {

    private final DisasterReliefRepository disasterReliefRepository;
    private final CampaignRepository campaignRepository;
    private final MaterialPledgeRepository materialPledgeRepository;

    /**
     * Automatically deactivates disaster relief campaigns that have exceeded their 7-day active window.
     * Runs every minute to keep disaster relief active strictly for 7 days.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void autoDeactivateExpiredDisasters() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        List<DisasterRelief> expired = disasterReliefRepository.findByActiveTrueAndCreatedAtBefore(cutoff);
        if (!expired.isEmpty()) {
            for (DisasterRelief dr : expired) {
                dr.setActive(false);
                if (dr.getCampaign() != null) {
                    dr.getCampaign().setActive(false);
                }
            }
            disasterReliefRepository.saveAll(expired);
            log.info("Auto-deactivated {} disaster relief campaign(s) exceeding the 7-day active window.", expired.size());
        }
    }

    @Transactional
    public DisasterReliefDto.Response create(DisasterReliefDto.CreateRequest req, User ngo) {
        if (!ngo.isVerified()) {
            throw new IllegalStateException("NGO must be verified to create disaster relief campaigns");
        }

        // Create linked money campaign
        Campaign campaign = new Campaign();
        campaign.setCreatedBy(ngo);
        campaign.setTitle(req.getTitle() + " - Emergency Fund");
        campaign.setDescription(req.getDescription());
        BigDecimal moneyTarget = req.getMoneyTarget() != null && req.getMoneyTarget().compareTo(java.math.BigDecimal.ZERO) > 0
            ? req.getMoneyTarget() : java.math.BigDecimal.valueOf(50000);
        campaign.setTargetAmount(moneyTarget);
        campaign.setCity(req.getCity());
        campaign.setType(Campaign.CampaignType.DISASTER);
        campaign.setDisasterRelief(true);
        campaign = campaignRepository.save(campaign);

        LocalDateTime now = LocalDateTime.now();
        DisasterRelief dr = new DisasterRelief();
        dr.setCreatedByNgo(ngo);
        dr.setTitle(req.getTitle());
        dr.setDescription(req.getDescription());
        dr.setCity(req.getCity());
        dr.setState(req.getState());
        dr.setCampaign(campaign);
        dr.setCreatedAt(now);
        // Disaster relief is active for exactly 7 days
        dr.setExpiresAt(now.plusDays(7));

        // Add needs
        if (req.getNeeds() != null) {
            for (DisasterReliefDto.ReliefNeedRequest n : req.getNeeds()) {
                ReliefNeed need = new ReliefNeed();
                need.setDisasterRelief(dr);
                need.setItemName(n.getItemName());
                need.setQuantityNeeded(n.getQuantityNeeded());
                need.setUnit(n.getUnit());
                dr.getNeeds().add(need);
            }
        }

        return DisasterReliefDto.Response.from(disasterReliefRepository.save(dr));
    }

    @Transactional
    public List<DisasterReliefDto.Response> getActive() {
        autoDeactivateExpiredDisasters();
        return disasterReliefRepository.findByActiveOrderByCreatedAtDesc(true)
            .stream().map(DisasterReliefDto.Response::from).collect(Collectors.toList());
    }

    public DisasterReliefDto.Response getById(Long id) {
        return DisasterReliefDto.Response.from(findEntityById(id));
    }

    @Transactional
    public DisasterReliefDto.Response pledge(Long id, DisasterReliefDto.PledgeRequest req, User contributor) {
        DisasterRelief dr = findEntityById(id);
        if (dr.getCreatedAt() != null && dr.getCreatedAt().plusDays(7).isBefore(LocalDateTime.now())) {
            dr.setActive(false);
            if (dr.getCampaign() != null) dr.getCampaign().setActive(false);
            disasterReliefRepository.save(dr);
            throw new IllegalStateException("This disaster relief has concluded (active for 7 days only).");
        }
        if (!dr.isActive()) throw new IllegalStateException("This disaster relief is no longer active");

        MaterialPledge pledge = new MaterialPledge();
        pledge.setDisasterRelief(dr);
        pledge.setContributor(contributor);
        pledge.setItemName(req.getItemName());
        pledge.setQuantity(req.getQuantity());
        pledge.setUnit(req.getUnit());
        materialPledgeRepository.save(pledge);

        // Update matching need if found
        dr.getNeeds().stream()
            .filter(n -> n.getItemName().equalsIgnoreCase(req.getItemName()))
            .findFirst()
            .ifPresent(n -> n.setQuantityPledged(n.getQuantityPledged() + req.getQuantity()));

        return DisasterReliefDto.Response.from(disasterReliefRepository.save(dr));
    }

    @Transactional
    public CampaignDto.Response donateMoney(Long id, CampaignDto.DonateRequest req, User contributor,
                                             CampaignService campaignService) {
        DisasterRelief dr = findEntityById(id);
        if (dr.getCreatedAt() != null && dr.getCreatedAt().plusDays(7).isBefore(LocalDateTime.now())) {
            dr.setActive(false);
            if (dr.getCampaign() != null) dr.getCampaign().setActive(false);
            disasterReliefRepository.save(dr);
            throw new IllegalStateException("This disaster relief has concluded (active for 7 days only).");
        }
        if (!dr.isActive()) throw new IllegalStateException("This disaster relief is no longer active");
        if (dr.getCampaign() == null) throw new ResourceNotFoundException("No money campaign linked");
        return campaignService.donate(dr.getCampaign().getId(), req, contributor);
    }

    public DisasterRelief findEntityById(Long id) {
        return disasterReliefRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Disaster relief not found: " + id));
    }
}
