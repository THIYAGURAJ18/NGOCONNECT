package com.ngoconnect.service;

import com.ngoconnect.dto.DonationPostDto;
import com.ngoconnect.entity.DonationPost;
import com.ngoconnect.entity.DistributionUpdate;
import com.ngoconnect.entity.User;
import com.ngoconnect.exception.ResourceNotFoundException;
import com.ngoconnect.repository.DonationPostRepository;
import com.ngoconnect.repository.DistributionUpdateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DonationPostService {

    private final DonationPostRepository donationPostRepository;
    private final DistributionUpdateRepository distributionUpdateRepository;

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
        // If not logged in, contributor posts are protected from general public
        if (currentUser == null) {
            return java.util.Collections.emptyList();
        }

        // If Contributor, they only see their own posts
        if (currentUser.getRole() == User.Role.CONTRIBUTOR) {
            return getMyPosts(currentUser);
        }

        // Only NGOs and Orphanages/Care Centers (CONSUMER) and ADMIN see all available community donation posts
        DonationPost.Status statusEnum = null;
        if (status != null && !status.isBlank()) {
            try { statusEnum = DonationPost.Status.valueOf(status.toUpperCase()); } catch (Exception ignored) {}
        }
        return donationPostRepository.findWithFilters(
            (category != null && category.isBlank()) ? null : category,
            (city != null && city.isBlank()) ? null : city,
            statusEnum
        ).stream().map(DonationPostDto.Response::from).collect(Collectors.toList());
    }

    public List<DonationPostDto.Response> browse(String category, String city, String status) {
        return browse(category, city, status, null);
    }

    public DonationPostDto.Response getById(Long id) {
        return DonationPostDto.Response.from(findEntityById(id));
    }

    public List<DonationPostDto.Response> getMyPosts(User contributor) {
        return donationPostRepository.findByContributorOrderByCreatedAtDesc(contributor)
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
