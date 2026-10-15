package com.ngoconnect.service;

import com.ngoconnect.dto.AuthDto;
import com.ngoconnect.entity.User;
import com.ngoconnect.exception.ResourceNotFoundException;
import com.ngoconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AadhaarVerificationService aadhaarVerificationService;

    public AuthDto.UserResponse signup(AuthDto.SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalStateException("Email already registered: " + request.getEmail());
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail().toLowerCase().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setCity(request.getCity());
        user.setPhone(request.getPhone());
        user.setOrganizationName(request.getOrganizationName());
        if (request.getAadhaarNumber() != null && !request.getAadhaarNumber().isBlank()) {
            user.setAadhaarNumber(AadhaarVerificationService.sanitizeAadhaar(request.getAadhaarNumber()));
        }

        // All accounts are verified automatically (admin UI removed)
        user.setVerified(true);

        User saved = userRepository.save(user);
        return AuthDto.UserResponse.from(saved);
    }

    public AuthDto.UserResponse signupWithAadhaar(AuthDto.AadhaarSignupRequest request) {
        // Validate OTP and Aadhaar
        AadhaarVerificationService.OtpSession session = aadhaarVerificationService.validateOtp(
            request.getTxnId(), request.getOtp(), request.getAadhaarNumber()
        );

        if (userRepository.existsByEmail(request.getEmail().toLowerCase().trim())) {
            throw new IllegalStateException("Email already registered: " + request.getEmail());
        }

        String cleanAadhaar = AadhaarVerificationService.sanitizeAadhaar(request.getAadhaarNumber());
        if (userRepository.existsByAadhaarNumber(cleanAadhaar)) {
            throw new IllegalStateException("An account is already registered with this Aadhaar number.");
        }

        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(request.getEmail().toLowerCase().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(User.Role.CONTRIBUTOR); // Aadhaar registration is specifically for Contributor
        user.setCity(request.getCity());
        user.setPhone(request.getPhone() != null ? request.getPhone() : session.getPhone());
        user.setAadhaarNumber(cleanAadhaar);
        user.setAadhaarVerified(true);
        user.setVerified(true);

        User saved = userRepository.save(user);
        return AuthDto.UserResponse.from(saved);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    public User findById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }
}
