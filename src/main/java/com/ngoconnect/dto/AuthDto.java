package com.ngoconnect.dto;

import com.ngoconnect.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthDto {

    @Data
    public static class SignupRequest {
        @NotBlank(message = "Name is required")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Valid email required")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        @NotNull(message = "Role is required")
        private User.Role role;

        private String city;
        private String phone;
        private String organizationName; // for NGOs
    }

    @Data
    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Valid email required")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    public static class UserResponse {
        private Long id;
        private String name;
        private String email;
        private User.Role role;
        private String city;
        private String phone;
        private String organizationName;
        private boolean verified;
        private String createdAt;

        public static UserResponse from(User user) {
            UserResponse r = new UserResponse();
            r.setId(user.getId());
            r.setName(user.getName());
            r.setEmail(user.getEmail());
            r.setRole(user.getRole());
            r.setCity(user.getCity());
            r.setPhone(user.getPhone());
            r.setOrganizationName(user.getOrganizationName());
            r.setVerified(user.isVerified());
            r.setCreatedAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
            return r;
        }
    }
}
