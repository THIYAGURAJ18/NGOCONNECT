package com.ngoconnect.controller;

import com.ngoconnect.service.MatchingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchingController {

    private final MatchingService matchingService;

    @GetMapping
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<List<MatchingService.Match>> getMatches() {
        return ResponseEntity.ok(matchingService.findMatches());
    }
}
