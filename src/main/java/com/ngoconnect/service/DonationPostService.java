package com.ngoconnect.service;

import com.ngoconnect.dto.DonationPostDto;
import com.ngoconnect.entity.DonationPost;
import com.ngoconnect.entity.DistributionUpdate;
import com.ngoconnect.entity.User;
import com.ngoconnect.exception.ResourceNotFoundException;
import com.ngoconnect.repository.DonationPostRepository;
import com.ngoconnect.repository.DistributionUpdateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DonationPostService {

    private final DonationPostRepository donationPostRepository;
    private final DistributionUpdateRepository distributionUpdateRepository;

    /**
     * Automatically deletes distributed posts after 2 days (48 hours).
     * Runs periodically every minute to keep database and website clean.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void cleanupOldDistributedPosts() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(2);
        List<DonationPost> expired = donationPostRepository.findByStatusAndDistributedAtBefore(
            DonationPost.Status.DISTRIBUTED, cutoff
        );
        if (!expired.isEmpty()) {
            for (DonationPost post : expired) {
                List<DistributionUpdate> updates = distributionUpdateRepository.findByDonationPostOrderByUpdatedAtDesc(post);
                distributionUpdateRepository.deleteAll(updates);
                donationPostRepository.delete(post);
            }
            log.info("Auto-cleanup: Deleted {} distributed donation post(s) older than 2 days.", expired.size());
        }
    }

    @Transactional
    public DonationPostDto.Response create(DonationPostDto.CreateRequest req, User contributor, String photoPath) {
        DonationPost post = new DonationPost();
        post.setContributor(contributor);
        post.setCategory(req.getCategory());
        post.setQuantity(req.getQuantity());
        post.setUnit(req.getUnit());
        post.setCondition(req.getCondition() != null ? req.getCondition() : DonationPost.Condition.GOOD);
        post.setCity(req.getCity());
        post.setAddress(req.getAddress());
        post.setDescription(req.getDescription());
        post.setPhotoPath(photoPath);
        return DonationPostDto.Response.from(donationPostRepository.save(post));
    }

    public List<DonationPostDto.Response> browse(String category, String city, String status, User currentUser) {
        cleanupOldDistributedPosts();
        DonationPost.Status statusEnum = null;
        if (status != null && !status.isBlank()) {
            try { statusEnum = DonationPost.Status.valueOf(status.toUpperCase().trim()); } catch (Exception ignored) {}
        }
        String cleanCategory = (category != null && !category.isBlank()) ? category.trim() : null;
        String cleanCity = (city != null && !city.isBlank()) ? city.trim() : null;
        LocalDateTime activeCutoff = LocalDateTime.now().minusDays(2);

        return donationPostRepository.findWithFilters(
            cleanCategory,
            cleanCity,
            statusEnum,
            activeCutoff
        ).stream().map(DonationPostDto.Response::from).collect(Collectors.toList());
    }

    public List<DonationPostDto.Response> browse(String category, String city, String status) {
        return browse(category, city, status, null);
    }

    public DonationPostDto.Response getById(Long id) {
        DonationPost post = findEntityById(id);
        if (post.getStatus() == DonationPost.Status.DISTRIBUTED && 
            post.getDistributedAt() != null && 
            post.getDistributedAt().isBefore(LocalDateTime.now().minusDays(2))) {
            cleanupOldDistributedPosts();
            throw new ResourceNotFoundException("Donation post has expired and was deleted: " + id);
        }
        return DonationPostDto.Response.from(post);
    }

    public List<DonationPostDto.Response> getMyPosts(User contributor) {
        cleanupOldDistributedPosts();
        LocalDateTime activeCutoff = LocalDateTime.now().minusDays(2);
        return donationPostRepository.findActiveByContributor(contributor, activeCutoff)
            .stream().map(DonationPostDto.Response::from).collect(Collectors.toList());
    }

    public List<DonationPostDto.Response> getMyAcceptedPosts(User ngo) {
        cleanupOldDistributedPosts();
        LocalDateTime activeCutoff = LocalDateTime.now().minusDays(2);
        return donationPostRepository.findActiveByAcceptedByNgo(ngo, activeCutoff)
            .stream().map(DonationPostDto.Response::from).collect(Collectors.toList());
    }

    @Transactional
    public DonationPostDto.Response acceptDonation(Long id, User ngo) {
        DonationPost post = findEntityById(id);
        if (post.getStatus() != DonationPost.Status.POSTED) {
            throw new IllegalStateException("Donation is not in POSTED state");
        }
        post.setStatus(DonationPost.Status.ACCEPTED);
        post.setAcceptedByNgo(ngo);
        post.setAcceptedAt(LocalDateTime.now());
        return DonationPostDto.Response.from(donationPostRepository.save(post));
    }

    @Transactional
    public DonationPostDto.Response markCollected(Long id, User ngo) {
        DonationPost post = findEntityById(id);
        if (post.getStatus() != DonationPost.Status.ACCEPTED) {
            throw new IllegalStateException("Donation must be ACCEPTED before marking COLLECTED");
        }
        if (!post.getAcceptedByNgo().getId().equals(ngo.getId())) {
            throw new IllegalArgumentException("Only the accepting NGO can update this donation");
        }
        post.setStatus(DonationPost.Status.COLLECTED);
        post.setCollectedAt(LocalDateTime.now());
        return DonationPostDto.Response.from(donationPostRepository.save(post));
    }

    @Transactional
    public DonationPostDto.Response markDistributed(Long id, User ngo, String note, String photoPath) {
        DonationPost post = findEntityById(id);
        if (post.getStatus() != DonationPost.Status.COLLECTED) {
            throw new IllegalStateException("Donation must be COLLECTED before marking DISTRIBUTED");
        }
        if (!post.getAcceptedByNgo().getId().equals(ngo.getId())) {
            throw new IllegalArgumentException("Only the accepting NGO can update this donation");
        }
        post.setStatus(DonationPost.Status.DISTRIBUTED);
        post.setDistributedAt(LocalDateTime.now());
        donationPostRepository.save(post);

        // Save distribution proof
        DistributionUpdate update = new DistributionUpdate();
        update.setDonationPost(post);
        update.setNgo(ngo);
        update.setNote(note);
        update.setPhotoPath(photoPath);
        distributionUpdateRepository.save(update);

        return DonationPostDto.Response.from(post);
    }

    public DonationPost findEntityById(Long id) {
        return donationPostRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Donation post not found: " + id));
    }
}
