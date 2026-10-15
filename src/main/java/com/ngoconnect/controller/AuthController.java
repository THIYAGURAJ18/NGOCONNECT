package com.ngoconnect.controller;

import com.ngoconnect.dto.AuthDto;
import com.ngoconnect.entity.User;
import com.ngoconnect.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthenticationManager authenticationManager;
    private final com.ngoconnect.service.AadhaarVerificationService aadhaarVerificationService;

    @PostMapping("/aadhaar/send-otp")
    public ResponseEntity<AuthDto.AadhaarOtpResponse> sendAadhaarOtp(@Valid @RequestBody AuthDto.AadhaarOtpRequest request) {
        return ResponseEntity.ok(aadhaarVerificationService.analyzeAadhaarAndSendOtp(request));
    }

    @PostMapping("/aadhaar/verify-signup")
    public ResponseEntity<AuthDto.UserResponse> verifyAadhaarAndSignup(@Valid @RequestBody AuthDto.AadhaarSignupRequest request) {
        return ResponseEntity.status(201).body(authService.signupWithAadhaar(request));
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthDto.UserResponse> signup(@Valid @RequestBody AuthDto.SignupRequest request) {
        return ResponseEntity.status(201).body(authService.signup(request));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthDto.LoginRequest request,
                                   HttpServletRequest httpRequest) {
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail().toLowerCase().trim(), request.getPassword())
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);

        HttpSession session = httpRequest.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

        User user = authService.findByEmail(request.getEmail().toLowerCase().trim());
        return ResponseEntity.ok(AuthDto.UserResponse.from(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Not logged in"));
        }
        User user = authService.findByEmail(userDetails.getUsername());
        return ResponseEntity.ok(AuthDto.UserResponse.from(user));
    }
}
