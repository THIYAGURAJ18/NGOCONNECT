package com.ngoconnect.service;

import com.ngoconnect.dto.AuthDto;
import com.ngoconnect.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AadhaarVerificationService {

    private final UserRepository userRepository;

    // In-memory cache for OTP sessions with expiration
    private final Map<String, OtpSession> otpCache = new ConcurrentHashMap<>();

    private static final Pattern AADHAAR_PATTERN = Pattern.compile("^[2-9][0-9]{11}$");

    @Data
    public static class OtpSession {
        private String txnId;
        private String aadhaarNumber;
        private String email;
        private String name;
        private String phone;
        private String otp;
        private Instant expiresAt;
    }

    /**
     * Analyzes the Aadhaar number, performs validation, generates OTP,
     * and sends simulated OTP to the registered mobile number.
     */
    public AuthDto.AadhaarOtpResponse analyzeAadhaarAndSendOtp(AuthDto.AadhaarOtpRequest request) {
        String cleanAadhaar = sanitizeAadhaar(request.getAadhaarNumber());

        // 1. Structural & Format Validation
        if (!AADHAAR_PATTERN.matcher(cleanAadhaar).matches()) {
            throw new IllegalArgumentException("Invalid Aadhaar number. It must be exactly 12 digits and cannot start with 0 or 1.");
        }

        // Check for invalid repetitive sequences like 111111111111 or 999999999999
        if (cleanAadhaar.matches("(\\d)\\1{11}")) {
            throw new IllegalArgumentException("Invalid Aadhaar number sequence.");
        }

        // 2. Uniqueness Checks
        if (userRepository.existsByAadhaarNumber(cleanAadhaar)) {
            throw new IllegalStateException("An account is already registered with this Aadhaar number.");
        }
        if (userRepository.existsByEmail(request.getEmail().toLowerCase().trim())) {
            throw new IllegalStateException("Email is already registered: " + request.getEmail());
        }

        // 3. Resolve Registered Mobile Number linked with Aadhaar
        String mobile = resolveRegisteredMobile(cleanAadhaar, request.getPhone());
        String maskedMobile = maskMobile(mobile);
        String maskedAadhaar = "XXXX-XXXX-" + cleanAadhaar.substring(8);

        // 4. Generate 6-digit OTP
        String otp = String.format("%06d", ThreadLocalRandom.current().nextInt(100000, 999999));
        String txnId = "UIDAI-TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // 5. Cache OTP session (valid for 5 minutes)
        OtpSession session = new OtpSession();
        session.setTxnId(txnId);
        session.setAadhaarNumber(cleanAadhaar);
        session.setEmail(request.getEmail().toLowerCase().trim());
        session.setName(request.getName());
        session.setPhone(mobile);
        session.setOtp(otp);
        session.setExpiresAt(Instant.now().plusSeconds(300)); // 5 minutes

        otpCache.put(txnId, session);

        log.info("Aadhaar OTP generated for Aadhaar {} (Txn: {}): OTP is {}", maskedAadhaar, txnId, otp);

        // 6. Build response
        AuthDto.AadhaarOtpResponse response = new AuthDto.AadhaarOtpResponse();
        response.setTxnId(txnId);
        response.setMaskedAadhaar(maskedAadhaar);
        response.setMaskedMobile(maskedMobile);
        response.setMessage("Aadhaar verified successfully! OTP sent to registered mobile " + maskedMobile);
        response.setDemoOtp(otp); // Provided for seamless sandbox/demo testing
        return response;
    }

    /**
     * Validates the entered OTP against the active session.
     */
    public OtpSession validateOtp(String txnId, String enteredOtp, String rawAadhaar) {
        if (txnId == null || !otpCache.containsKey(txnId)) {
            throw new IllegalArgumentException("Invalid or expired OTP session. Please request a new OTP.");
        }

        OtpSession session = otpCache.get(txnId);
        if (Instant.now().isAfter(session.getExpiresAt())) {
            otpCache.remove(txnId);
            throw new IllegalArgumentException("OTP has expired. Please request a fresh OTP.");
        }

        String cleanAadhaar = sanitizeAadhaar(rawAadhaar);
        if (!session.getAadhaarNumber().equals(cleanAadhaar)) {
            throw new IllegalArgumentException("Aadhaar number mismatch for this verification session.");
        }

        if (!session.getOtp().equals(enteredOtp.trim())) {
            throw new IllegalArgumentException("Incorrect OTP. Please enter the valid 6-digit code sent to your registered mobile.");
        }

        // OTP is valid - remove from cache to prevent reuse
        otpCache.remove(txnId);
        return session;
    }

    public static String sanitizeAadhaar(String raw) {
        if (raw == null) return "";
        return raw.replaceAll("[\\s-]+", "").trim();
    }

    private String resolveRegisteredMobile(String aadhaar, String userPhone) {
        if (userPhone != null && userPhone.replaceAll("[^0-9]", "").length() >= 10) {
            return userPhone.replaceAll("[^0-9]", "");
        }
        // Realistic simulated registered phone: 98xxxx + last 4 digits of Aadhaar
        return "98" + aadhaar.substring(4, 8) + aadhaar.substring(8);
    }

    private String maskMobile(String mobile) {
        if (mobile == null || mobile.length() < 4) {
            return "+91 ******" + "4589";
        }
        String last4 = mobile.substring(mobile.length() - 4);
        return "+91 ******" + last4;
    }
}
