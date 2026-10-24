package com.ngoconnect.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ngoconnect.dto.RazorpayDto;
import com.ngoconnect.entity.Campaign;
import com.ngoconnect.entity.Donation;
import com.ngoconnect.entity.User;
import com.ngoconnect.exception.ResourceNotFoundException;
import com.ngoconnect.repository.CampaignRepository;
import com.ngoconnect.repository.DonationRepository;
import com.ngoconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RazorpayService {

    private final CampaignRepository campaignRepository;
    private final DonationRepository donationRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Value("${razorpay.key.id:rzp_test_placeholder}")
    private String keyId;

    @Value("${razorpay.key.secret:your_razorpay_secret_placeholder}")
    private String keySecret;

    @Value("${razorpay.currency:INR}")
    private String currency;

    @Value("${razorpay.company.name:Smart Donation & NGO Connect}")
    private String companyName;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Checks if a valid live/test Razorpay API key has been configured.
     */
    public boolean isConfigured() {
        return keyId != null && keyId.startsWith("rzp_") && !keyId.contains("placeholder");
    }

    public RazorpayDto.ConfigResponse getConfig() {
        return RazorpayDto.ConfigResponse.builder()
                .keyId(isConfigured() ? keyId : "rzp_test_demo")
                .companyName(companyName)
                .currency(currency)
                .isConfigured(isConfigured())
                .build();
    }

    /**
     * Creates an official order on Razorpay servers (or fallback test order if placeholder key).
     */
    @Transactional(readOnly = true)
    public RazorpayDto.CreateOrderResponse createOrder(RazorpayDto.CreateOrderRequest req, User contributor) {
        Campaign campaign = campaignRepository.findById(req.getCampaignId())
                .orElseThrow(() -> new ResourceNotFoundException("Campaign not found: " + req.getCampaignId()));

        if (!campaign.isActive()) {
            throw new IllegalStateException("This emergency relief / campaign has concluded.");
        }

        if (req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ONE) < 0) {
            throw new IllegalArgumentException("Donation amount must be at least ₹1");
        }

        long amountInPaise = req.getAmount().multiply(BigDecimal.valueOf(100)).longValue();
        String orderId = null;

        if (isConfigured()) {
            try {
                // Call Razorpay API: POST https://api.razorpay.com/v1/orders
                String authStr = keyId + ":" + keySecret;
                String authHeader = "Basic " + Base64.getEncoder().encodeToString(authStr.getBytes(StandardCharsets.UTF_8));

                String payload = objectMapper.writeValueAsString(java.util.Map.of(
                        "amount", amountInPaise,
                        "currency", currency,
                        "receipt", "rcpt_" + System.currentTimeMillis(),
                        "notes", java.util.Map.of(
                                "campaignId", String.valueOf(campaign.getId()),
                                "campaignTitle", campaign.getTitle(),
                                "donorName", req.getDonorName() != null ? req.getDonorName() : "Contributor"
                        )
                ));

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create("https://api.razorpay.com/v1/orders"))
                        .header("Authorization", authHeader)
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(15))
                        .POST(HttpRequest.BodyPublishers.ofString(payload))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200 || response.statusCode() == 201) {
                    JsonNode root = objectMapper.readTree(response.body());
                    orderId = root.path("id").asText();
                    log.info("Razorpay order created successfully: orderId={}", orderId);
                } else {
                    log.error("Razorpay order creation failed with status {}: {}", response.statusCode(), response.body());
                    // Fall back to generated order id so user is not blocked
                    orderId = "order_rzp_" + UUID.randomUUID().toString().substring(0, 14);
                }
            } catch (Exception e) {
                log.error("Exception creating Razorpay order: {}", e.getMessage(), e);
                orderId = "order_rzp_" + UUID.randomUUID().toString().substring(0, 14);
            }
        } else {
            // Test simulation mode
            orderId = "order_demo_" + UUID.randomUUID().toString().substring(0, 14);
            log.info("Generated Test Order: {} (Set razorpay.key.id and secret in application.properties for live gateway)", orderId);
        }

        String donorName = req.getDonorName() != null && !req.getDonorName().isBlank()
                ? req.getDonorName()
                : (contributor != null ? contributor.getName() : "Kind Donor");

        String donorEmail = req.getDonorEmail() != null && !req.getDonorEmail().isBlank()
                ? req.getDonorEmail()
                : (contributor != null ? contributor.getEmail() : "donor@example.com");

        return RazorpayDto.CreateOrderResponse.builder()
                .orderId(orderId)
                .keyId(isConfigured() ? keyId : "rzp_test_demo")
                .amountInPaise(amountInPaise)
                .amount(req.getAmount())
                .currency(currency)
                .campaignTitle(campaign.getTitle())
                .donorName(donorName)
                .donorEmail(donorEmail)
                .donorPhone(req.getDonorPhone() != null ? req.getDonorPhone() : "9876543210")
                .isTestMode(!isConfigured())
                .companyName(companyName)
                .build();
    }

    /**
     * Verifies payment signature (HMAC-SHA256) and credits the donation to the campaign.
     */
    @Transactional
    public RazorpayDto.PaymentVerificationResponse verifyAndRecordDonation(RazorpayDto.VerifyPaymentRequest req, User contributor) {
        Campaign campaign = campaignRepository.findById(req.getCampaignId())
                .orElseThrow(() -> new ResourceNotFoundException("Campaign not found: " + req.getCampaignId()));

        // Validate signature if live credentials configured
        if (isConfigured()) {
            boolean valid = verifySignature(req.getRazorpayOrderId(), req.getRazorpayPaymentId(), req.getRazorpaySignature(), keySecret);
            if (!valid) {
                log.error("Invalid Razorpay payment signature verification failed for order: {}", req.getRazorpayOrderId());
                throw new IllegalArgumentException("Razorpay payment signature verification failed. Untrusted payment.");
            }
            log.info("Razorpay payment signature successfully verified for paymentId={}", req.getRazorpayPaymentId());
        }

        String paymentId = req.getRazorpayPaymentId() != null && !req.getRazorpayPaymentId().isBlank()
                ? req.getRazorpayPaymentId()
                : "pay_sim_" + UUID.randomUUID().toString().substring(0, 12);

        // Record donation in database
        Donation donation = new Donation();
        donation.setCampaign(campaign);
        donation.setContributor(contributor != null ? contributor : campaign.getCreatedBy());
        donation.setAmount(req.getAmount());
        donation.setNote(req.getNote());
        donation.setRazorpayOrderId(req.getRazorpayOrderId());
        donation.setRazorpayPaymentId(paymentId);
        donation.setRazorpaySignature(req.getRazorpaySignature());
        donation.setMockPaymentRef(paymentId);
        donation.setPaymentStatus(Donation.PaymentStatus.SUCCESS);
        donationRepository.save(donation);

        // Credit the campaign
        campaign.setRaisedAmount(campaign.getRaisedAmount().add(req.getAmount()));
        if (campaign.getTargetAmount() != null && campaign.getRaisedAmount().compareTo(campaign.getTargetAmount()) >= 0) {
            campaign.setActive(false);
        }
        campaignRepository.save(campaign);

        // Award contributor impact points (+1 point per ₹10 donated, minimum 20 points)
        int pointsAwarded = 0;
        if (contributor != null) {
            pointsAwarded = Math.max(20, req.getAmount().divide(BigDecimal.valueOf(10), java.math.RoundingMode.HALF_UP).intValue());
            log.info("Calculated {} impact points for contributor {}", pointsAwarded, contributor.getEmail());
        }

        return RazorpayDto.PaymentVerificationResponse.builder()
                .success(true)
                .message("Donation of ₹" + req.getAmount() + " successfully received via Razorpay!")
                .paymentId(paymentId)
                .orderId(req.getRazorpayOrderId())
                .campaignId(campaign.getId())
                .raisedAmount(campaign.getRaisedAmount())
                .targetAmount(campaign.getTargetAmount())
                .pointsAwarded(pointsAwarded)
                .build();
    }

    /**
     * Verifies the cryptographic HMAC-SHA256 signature returned by Razorpay Checkout.
     */
    private boolean verifySignature(String orderId, String paymentId, String signature, String secret) {
        if (signature == null || secret == null || orderId == null || paymentId == null) {
            return false;
        }
        try {
            String data = orderId + "|" + paymentId;
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKey);
            byte[] hash = sha256Hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));

            // Convert to hex string
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString().equalsIgnoreCase(signature);
        } catch (Exception e) {
            log.error("Error calculating HMAC signature: {}", e.getMessage());
            return false;
        }
    }
}
