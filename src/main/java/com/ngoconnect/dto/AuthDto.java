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
        private String aadhaarNumber; // for Contributor
    }

    @Data
    public static class AadhaarOtpRequest {
        @NotBlank(message = "Aadhaar number is required")
        private String aadhaarNumber;

        @NotBlank(message = "Name is required")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Valid email required")
        private String email;

        private String phone;
    }

    @Data
    public static class AadhaarOtpResponse {
        private String txnId;
        private String maskedAadhaar;
        private String maskedMobile;
        private String message;
        private String demoOtp;
    }

    @Data
    public static class AadhaarSignupRequest {
        @NotBlank(message = "Transaction ID is required")
        private String txnId;

        @NotBlank(message = "OTP is required")
        private String otp;

        @NotBlank(message = "Name is required")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Valid email required")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        @NotBlank(message = "Aadhaar number is required")
        private String aadhaarNumber;

        private String city;
        private String phone;
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
        private String aadhaarNumber;
        private boolean aadhaarVerified;
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
            if (user.getAadhaarNumber() != null && user.getAadhaarNumber().length() >= 4) {
                String full = user.getAadhaarNumber().replaceAll("\\s+", "");
                r.setAadhaarNumber("XXXX-XXXX-" + full.substring(full.length() - 4));
            }
            r.setAadhaarVerified(user.isAadhaarVerified());
            r.setCreatedAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
            return r;
        }
    }
}
