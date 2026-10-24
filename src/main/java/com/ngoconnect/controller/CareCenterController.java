package com.ngoconnect.controller;

import com.ngoconnect.entity.RequirementPost;
import com.ngoconnect.entity.User;
import com.ngoconnect.repository.RequirementPostRepository;
import com.ngoconnect.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/carecenters")
@RequiredArgsConstructor
public class CareCenterController {

    private final UserRepository userRepository;
    private final RequirementPostRepository requirementPostRepository;

    @Data
    public static class Response {
        private Long id;
        private String name;
        private String organizationName;
        private String city;
        private String phone;
        private String email;
        private boolean verified;
        private int openRequirementsCount;
        private List<String> neededItems;
    }

    @GetMapping
    public ResponseEntity<List<Response>> list(@RequestParam(required = false) String city) {
        List<User> careCenters = userRepository.findByRole(User.Role.CONSUMER);
        
        List<Response> responses = careCenters.stream().map(u -> {
            Response r = new Response();
            r.setId(u.getId());
            r.setName(u.getName());
            r.setOrganizationName(u.getOrganizationName() != null ? u.getOrganizationName() : u.getName());
            r.setCity(u.getCity());
            r.setPhone(u.getPhone() != null ? u.getPhone() : "+91 98401 23456");
            r.setEmail(u.getEmail());
            r.setVerified(u.isVerified());

            List<RequirementPost> reqs = requirementPostRepository.findByPostedByOrderByCreatedAtDesc(u)
                    .stream().filter(rp -> !rp.isFulfilled()).collect(Collectors.toList());
            r.setOpenRequirementsCount(reqs.size());
            r.setNeededItems(reqs.stream().map(RequirementPost::getItem).distinct().collect(Collectors.toList()));
            return r;
        }).collect(Collectors.toList());

        // If city supplied, prioritize matching city at top
        if (city != null && !city.isBlank()) {
            responses.sort((a, b) -> {
                boolean aMatch = a.getCity() != null && a.getCity().equalsIgnoreCase(city.trim());
                boolean bMatch = b.getCity() != null && b.getCity().equalsIgnoreCase(city.trim());
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                return b.getOpenRequirementsCount() - a.getOpenRequirementsCount();
            });
        }

        return ResponseEntity.ok(responses);
    }
}
