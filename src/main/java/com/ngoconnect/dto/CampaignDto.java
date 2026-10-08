package com.ngoconnect.dto;

import com.ngoconnect.entity.Campaign;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

public class CampaignDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "Title is required")
        private String title;

        private String description;

        @NotNull(message = "Target amount is required")
        @DecimalMin(value = "1.0", message = "Target amount must be positive")
        private BigDecimal targetAmount;

        private String city;
        private String deadline; // ISO date string
    }

    @Data
    public static class DonateRequest {
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "1.0", message = "Amount must be positive")
        private BigDecimal amount;

        private String note;
        // MOCK PAYMENT: In production, replace with Razorpay payment verification
        // TODO: Add razorpay_order_id, razorpay_payment_id, razorpay_signature here
    }

    @Data
    public static class Response {
        private Long id;
        private Long createdById;
        private String createdByName;
        private String title;
        private String description;
        private BigDecimal targetAmount;
        private BigDecimal raisedAmount;
        private double progressPercent;
        private String type;
        private String city;
        private boolean active;
        private boolean isDisasterRelief;
        private String deadline;
        private String createdAt;

        public static Response from(Campaign c) {
            Response r = new Response();
            r.setId(c.getId());
            r.setCreatedById(c.getCreatedBy().getId());
            r.setCreatedByName(c.getCreatedBy().getName());
            r.setTitle(c.getTitle());
            r.setDescription(c.getDescription());
            r.setTargetAmount(c.getTargetAmount());
            r.setRaisedAmount(c.getRaisedAmount());
            if (c.getTargetAmount() != null && c.getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
                r.setProgressPercent(c.getRaisedAmount().multiply(BigDecimal.valueOf(100))
                    .divide(c.getTargetAmount(), 2, java.math.RoundingMode.HALF_UP).doubleValue());
            }
            r.setType(c.getType() != null ? c.getType().name() : null);
            r.setCity(c.getCity());
            r.setActive(c.isActive());
            r.setDisasterRelief(c.isDisasterRelief());
            r.setDeadline(c.getDeadline() != null ? c.getDeadline().toString() : null);
            r.setCreatedAt(c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
            return r;
        }
    }
}
