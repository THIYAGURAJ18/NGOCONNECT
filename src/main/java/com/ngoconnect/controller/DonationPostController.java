package com.ngoconnect.controller;

import com.ngoconnect.dto.DonationPostDto;
import com.ngoconnect.entity.User;
import com.ngoconnect.service.AuthService;
import com.ngoconnect.service.DonationPostService;
import com.ngoconnect.service.FileStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/donations")
@RequiredArgsConstructor
public class DonationPostController {

    private final DonationPostService donationPostService;
    private final AuthService authService;
    private final FileStorageService fileStorageService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CONTRIBUTOR')")
    public ResponseEntity<DonationPostDto.Response> create(
        @Valid @ModelAttribute DonationPostDto.CreateRequest request,
        @RequestPart(value = "photo", required = false) MultipartFile photo,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = authService.findByEmail(userDetails.getUsername());
        String photoPath = fileStorageService.store(photo);
        return ResponseEntity.status(201).body(donationPostService.create(request, user, photoPath));
    }

    @GetMapping
    public ResponseEntity<List<DonationPostDto.Response>> browse(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String city,
        @RequestParam(required = false) String status,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User currentUser = userDetails != null ? authService.findByEmail(userDetails.getUsername()) : null;
        return ResponseEntity.ok(donationPostService.browse(category, city, status, currentUser));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DonationPostDto.Response> getById(@PathVariable Long id) {
        return ResponseEntity.ok(donationPostService.getById(id));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('CONTRIBUTOR')")
    public ResponseEntity<List<DonationPostDto.Response>> getMyPosts(
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.ok(donationPostService.getMyPosts(user));
    }

    // NGO gets only their own accepted donations
    @GetMapping("/accepted")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<List<DonationPostDto.Response>> getMyAcceptedDonations(
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User ngo = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.ok(donationPostService.getMyAcceptedPosts(ngo));
    }

    // NGO accepts a donation
    @PutMapping("/{id}/accept")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<DonationPostDto.Response> accept(
        @PathVariable Long id,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User ngo = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.ok(donationPostService.acceptDonation(id, ngo));
    }

    // NGO marks as collected
    @PutMapping("/{id}/collect")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<DonationPostDto.Response> collect(
        @PathVariable Long id,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User ngo = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.ok(donationPostService.markCollected(id, ngo));
    }

    // NGO updates status (accept or collect)
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<DonationPostDto.Response> updateStatus(
        @PathVariable Long id,
        @RequestParam String status,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User ngo = authService.findByEmail(userDetails.getUsername());
        if ("ACCEPTED".equalsIgnoreCase(status)) {
            return ResponseEntity.ok(donationPostService.acceptDonation(id, ngo));
        } else if ("COLLECTED".equalsIgnoreCase(status)) {
            return ResponseEntity.ok(donationPostService.markCollected(id, ngo));
        } else {
            throw new IllegalArgumentException("Unsupported status update: " + status);
        }
    }

    // NGO marks as distributed with proof
    @PostMapping(value = "/{id}/distribute", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<DonationPostDto.Response> distribute(
        @PathVariable Long id,
        @RequestParam(required = false) String note,
        @RequestPart(value = "photo", required = false) MultipartFile photo,
        @RequestPart(value = "proofPhoto", required = false) MultipartFile proofPhoto,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User ngo = authService.findByEmail(userDetails.getUsername());
        MultipartFile fileToSave = photo != null ? photo : proofPhoto;
        String photoPath = fileStorageService.store(fileToSave);
        return ResponseEntity.ok(donationPostService.markDistributed(id, ngo, note, photoPath));
    }
}
