package com.ngoconnect.controller;

import com.ngoconnect.dto.CampaignDto;
import com.ngoconnect.entity.User;
import com.ngoconnect.service.AuthService;
import com.ngoconnect.service.CampaignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;
    private final AuthService authService;

    @PostMapping
    @PreAuthorize("hasAnyRole('NGO', 'CONSUMER')")
    public ResponseEntity<CampaignDto.Response> create(
        @Valid @RequestBody CampaignDto.CreateRequest request,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.status(201).body(campaignService.create(request, user));
    }

    @GetMapping
    public ResponseEntity<List<CampaignDto.Response>> getAll() {
        return ResponseEntity.ok(campaignService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CampaignDto.Response> getById(@PathVariable Long id) {
        return ResponseEntity.ok(campaignService.getById(id));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('NGO', 'CONSUMER')")
    public ResponseEntity<List<CampaignDto.Response>> getMyCampaigns(
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.ok(campaignService.getMyCampaigns(user));
    }

    // MOCK PAYMENT: Contributor donates to a campaign
    @PostMapping("/{id}/donate")
    @PreAuthorize("hasRole('CONTRIBUTOR')")
    public ResponseEntity<CampaignDto.Response> donate(
        @PathVariable Long id,
        @Valid @RequestBody CampaignDto.DonateRequest request,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User contributor = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.ok(campaignService.donate(id, request, contributor));
    }
}
