package com.ngoconnect.controller;

import com.ngoconnect.dto.RequirementPostDto;
import com.ngoconnect.entity.User;
import com.ngoconnect.service.AuthService;
import com.ngoconnect.service.RequirementPostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requirements")
@RequiredArgsConstructor
public class RequirementPostController {

    private final RequirementPostService requirementPostService;
    private final AuthService authService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CONSUMER', 'NGO')")
    public ResponseEntity<RequirementPostDto.Response> create(
        @Valid @RequestBody RequirementPostDto.CreateRequest request,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.status(201).body(requirementPostService.create(request, user));
    }

    @GetMapping
    public ResponseEntity<List<RequirementPostDto.Response>> browse(
        @RequestParam(required = false) String item,
        @RequestParam(required = false) String city,
        @RequestParam(required = false) String urgency
    ) {
        return ResponseEntity.ok(requirementPostService.browse(item, city, urgency));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequirementPostDto.Response> getById(@PathVariable Long id) {
        return ResponseEntity.ok(requirementPostService.getById(id));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('CONSUMER', 'NGO')")
    public ResponseEntity<List<RequirementPostDto.Response>> getMyPosts(
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.ok(requirementPostService.getMyPosts(user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('CONSUMER', 'NGO', 'ADMIN')")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = authService.findByEmail(userDetails.getUsername());
        requirementPostService.delete(id, user);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/fulfill")
    @PreAuthorize("hasAnyRole('CONSUMER', 'NGO', 'ADMIN')")
    public ResponseEntity<RequirementPostDto.Response> toggleFulfilled(
        @PathVariable Long id,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.ok(requirementPostService.toggleFulfilled(id, user));
    }
}
