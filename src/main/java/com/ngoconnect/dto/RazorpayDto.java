package com.ngoconnect.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

public class RazorpayDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateOrderRequest {
        private Long campaignId;
        private BigDecimal amount;
        private String donorName;
        private String donorEmail;
        private String donorPhone;
        private String note;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateOrderResponse {
        private String orderId;
        private String keyId;
        private Long amountInPaise;
        private BigDecimal amount;
        private String currency;
        private String campaignTitle;
        private String donorName;
        private String donorEmail;
        private String donorPhone;
        private boolean isTestMode;
        private String companyName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VerifyPaymentRequest {
        private String razorpayOrderId;
        private String razorpayPaymentId;
        private String razorpaySignature;
        private Long campaignId;
        private BigDecimal amount;
        private String donorName;
        private String note;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentVerificationResponse {
        private boolean success;
        private String message;
        private String paymentId;
        private String orderId;
        private Long campaignId;
        private BigDecimal raisedAmount;
        private BigDecimal targetAmount;
        private int pointsAwarded;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConfigResponse {
        private String keyId;
        private String companyName;
        private String currency;
        private boolean isConfigured;
    }
}
