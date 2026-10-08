package com.ngoconnect.service;

import com.ngoconnect.dto.RequirementPostDto;
import com.ngoconnect.entity.RequirementPost;
import com.ngoconnect.entity.User;
import com.ngoconnect.exception.ResourceNotFoundException;
import com.ngoconnect.repository.RequirementPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RequirementPostService {

    private final RequirementPostRepository requirementPostRepository;

    @Transactional
    public RequirementPostDto.Response create(RequirementPostDto.CreateRequest req, User user) {
        RequirementPost post = new RequirementPost();
        post.setPostedBy(user);
        post.setItem(req.getItem());
        post.setQuantityNeeded(req.getQuantityNeeded());
        post.setUnit(req.getUnit());
        post.setForWhom(req.getForWhom());
        post.setUrgency(req.getUrgency() != null ? req.getUrgency() : RequirementPost.Urgency.MEDIUM);
        post.setCity(req.getCity());
        post.setAddress(req.getAddress());
        post.setDescription(req.getDescription());
        return RequirementPostDto.Response.from(requirementPostRepository.save(post));
    }

    public List<RequirementPostDto.Response> browse(String item, String city, String urgency) {
        RequirementPost.Urgency urgencyEnum = null;
        if (urgency != null && !urgency.isBlank()) {
            try { urgencyEnum = RequirementPost.Urgency.valueOf(urgency.toUpperCase()); } catch (Exception ignored) {}
        }
        return requirementPostRepository.findWithFilters(
            (item != null && item.isBlank()) ? null : item,
            (city != null && city.isBlank()) ? null : city,
            urgencyEnum
        ).stream().map(RequirementPostDto.Response::from).collect(Collectors.toList());
    }

    public RequirementPostDto.Response getById(Long id) {
        return RequirementPostDto.Response.from(findEntityById(id));
    }

    public List<RequirementPostDto.Response> getMyPosts(User user) {
        return requirementPostRepository.findByPostedByOrderByCreatedAtDesc(user)
            .stream().map(RequirementPostDto.Response::from).collect(Collectors.toList());
    }

    public RequirementPost findEntityById(Long id) {
        return requirementPostRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Requirement post not found: " + id));
    }
}
