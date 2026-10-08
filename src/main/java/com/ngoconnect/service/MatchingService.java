package com.ngoconnect.service;

import com.ngoconnect.dto.DonationPostDto;
import com.ngoconnect.dto.RequirementPostDto;
import com.ngoconnect.entity.DonationPost;
import com.ngoconnect.entity.RequirementPost;
import com.ngoconnect.repository.DonationPostRepository;
import com.ngoconnect.repository.RequirementPostRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MatchingService {

    private final DonationPostRepository donationPostRepository;
    private final RequirementPostRepository requirementPostRepository;

    @Data
    public static class Match {
        private DonationPostDto.Response donation;
        private RequirementPostDto.Response requirement;
        private int matchScore; // 0-100
        private String matchReason;
    }

    /**
     * Find donation-requirement matches for NGO review.
     * Matching criteria: same category/item, same city, quantity within 2x range.
     */
    public List<Match> findMatches() {
        List<DonationPost> donations = donationPostRepository.findByStatusOrderByCreatedAtDesc(DonationPost.Status.POSTED);
        List<Match> matches = new ArrayList<>();

        for (DonationPost donation : donations) {
            List<RequirementPost> requirements = requirementPostRepository.findMatchingRequirements(
                donation.getCategory(), donation.getCity()
            );

            for (RequirementPost req : requirements) {
                int score = calculateScore(donation, req);
                if (score > 0) {
                    Match match = new Match();
                    match.setDonation(DonationPostDto.Response.from(donation));
                    match.setRequirement(RequirementPostDto.Response.from(req));
                    match.setMatchScore(score);
                    match.setMatchReason(buildReason(donation, req, score));
                    matches.add(match);
                }
            }
        }

        // Sort by score descending, then by urgency
        matches.sort((a, b) -> {
            int scoreDiff = b.getMatchScore() - a.getMatchScore();
            if (scoreDiff != 0) return scoreDiff;
            // HIGH urgency first
            String urgA = a.getRequirement().getUrgency();
            String urgB = b.getRequirement().getUrgency();
            return urgencyRank(urgB) - urgencyRank(urgA);
        });

        return matches;
    }

    private int calculateScore(DonationPost donation, RequirementPost req) {
        int score = 50; // base score for category + city match

        // Quantity match bonus (within 2x either way)
        if (donation.getQuantity() != null && req.getQuantityNeeded() != null) {
            double ratio = (double) donation.getQuantity() / req.getQuantityNeeded();
            if (ratio >= 0.5 && ratio <= 2.0) {
                score += 30;
                if (ratio >= 0.8 && ratio <= 1.2) score += 20; // near-exact
            }
        }

        // Urgency bonus
        if (req.getUrgency() == RequirementPost.Urgency.HIGH) score = Math.min(100, score + 10);

        return score;
    }

    private String buildReason(DonationPost donation, RequirementPost req, int score) {
        return String.format(
            "Category match: %s | City: %s | Donation qty: %d, Need qty: %d | Score: %d%%",
            donation.getCategory(), donation.getCity(),
            donation.getQuantity(), req.getQuantityNeeded(), score
        );
    }

    private int urgencyRank(String urgency) {
        if ("HIGH".equals(urgency)) return 3;
        if ("MEDIUM".equals(urgency)) return 2;
        return 1;
    }
}
