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

        // Admins and Contributors are auto-verified; NGOs require admin approval
        if (request.getRole() == User.Role.ADMIN ||
            request.getRole() == User.Role.CONTRIBUTOR ||
            request.getRole() == User.Role.CONSUMER) {
            user.setVerified(true);
        }

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
