package com.ngoconnect.controller;

import com.ngoconnect.dto.AuthDto;
import com.ngoconnect.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<List<AuthDto.UserResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @GetMapping("/ngos/pending")
    public ResponseEntity<List<AuthDto.UserResponse>> getPendingNgos() {
        return ResponseEntity.ok(adminService.getPendingNgos());
    }

    @PutMapping("/users/{id}/verify")
    public ResponseEntity<AuthDto.UserResponse> verifyNgo(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.verifyNgo(id));
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminService.AnalyticsResponse> getStats() {
        return ResponseEntity.ok(adminService.getAnalytics());
    }
}
