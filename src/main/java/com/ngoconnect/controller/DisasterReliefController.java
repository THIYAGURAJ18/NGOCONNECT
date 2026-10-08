package com.ngoconnect.controller;

import com.ngoconnect.dto.CampaignDto;
import com.ngoconnect.dto.DisasterReliefDto;
import com.ngoconnect.entity.User;
import com.ngoconnect.service.AuthService;
import com.ngoconnect.service.CampaignService;
import com.ngoconnect.service.DisasterReliefService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/disaster")
@RequiredArgsConstructor
public class DisasterReliefController {

    private final DisasterReliefService disasterReliefService;
    private final CampaignService campaignService;
    private final AuthService authService;

    @PostMapping
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<DisasterReliefDto.Response> create(
        @Valid @RequestBody DisasterReliefDto.CreateRequest request,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User ngo = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.status(201).body(disasterReliefService.create(request, ngo));
    }

    @GetMapping("/active")
    public ResponseEntity<List<DisasterReliefDto.Response>> getActive() {
        return ResponseEntity.ok(disasterReliefService.getActive());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DisasterReliefDto.Response> getById(@PathVariable Long id) {
        return ResponseEntity.ok(disasterReliefService.getById(id));
    }

    // Contributor pledges materials
    @PostMapping("/{id}/pledge")
    @PreAuthorize("hasRole('CONTRIBUTOR')")
    public ResponseEntity<DisasterReliefDto.Response> pledge(
        @PathVariable Long id,
        @Valid @RequestBody DisasterReliefDto.PledgeRequest request,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User contributor = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.ok(disasterReliefService.pledge(id, request, contributor));
    }

    // Contributor donates money to disaster relief
    @PostMapping("/{id}/donate")
    @PreAuthorize("hasRole('CONTRIBUTOR')")
    public ResponseEntity<CampaignDto.Response> donateMoney(
        @PathVariable Long id,
        @Valid @RequestBody CampaignDto.DonateRequest request,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User contributor = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.ok(disasterReliefService.donateMoney(id, request, contributor, campaignService));
    }
}
