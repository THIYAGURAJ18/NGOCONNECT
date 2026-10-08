package com.ngoconnect.dto;

import com.ngoconnect.entity.DisasterRelief;
import com.ngoconnect.entity.ReliefNeed;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

public class DisasterReliefDto {

    @Data
    public static class ReliefNeedRequest {
        @NotBlank private String itemName;
        private Integer quantityNeeded;
        private String unit;
    }

    @Data
    public static class CreateRequest {
        @NotBlank(message = "Title is required")
        private String title;

        private String description;

        @NotBlank(message = "City is required")
        private String city;

        private String state;

        @NotNull(message = "Money target is required")
        @DecimalMin(value = "1.0")
        private BigDecimal moneyTarget;

        private List<ReliefNeedRequest> needs;
    }

    @Data
    public static class PledgeRequest {
        @NotBlank private String itemName;
        @NotNull private Integer quantity;
        private String unit;
    }

    @Data
    public static class UpdateRequest {
        private String note;
        // photo handled via multipart
    }

    @Data
    public static class ReliefNeedResponse {
        private Long id;
        private String itemName;
        private Integer quantityNeeded;
        private Integer quantityPledged;
        private String unit;

        public static ReliefNeedResponse from(ReliefNeed n) {
            ReliefNeedResponse r = new ReliefNeedResponse();
            r.setId(n.getId());
            r.setItemName(n.getItemName());
            r.setQuantityNeeded(n.getQuantityNeeded());
            r.setQuantityPledged(n.getQuantityPledged());
            r.setUnit(n.getUnit());
            return r;
        }
    }

    @Data
    public static class Response {
        private Long id;
        private Long createdByNgoId;
        private String createdByNgoName;
        private String title;
        private String description;
        private String city;
        private String state;
        private Long campaignId;
        private BigDecimal moneyTarget;
        private BigDecimal moneyRaised;
        private double moneyProgress;
        private List<ReliefNeedResponse> needs;
        private boolean active;
        private String createdAt;

        public static Response from(DisasterRelief dr) {
            Response r = new Response();
            r.setId(dr.getId());
            r.setCreatedByNgoId(dr.getCreatedByNgo().getId());
            r.setCreatedByNgoName(dr.getCreatedByNgo().getName());
            r.setTitle(dr.getTitle());
            r.setDescription(dr.getDescription());
            r.setCity(dr.getCity());
            r.setState(dr.getState());
            r.setActive(dr.isActive());
            r.setCreatedAt(dr.getCreatedAt() != null ? dr.getCreatedAt().toString() : null);
            if (dr.getCampaign() != null) {
                r.setCampaignId(dr.getCampaign().getId());
                r.setMoneyTarget(dr.getCampaign().getTargetAmount());
                r.setMoneyRaised(dr.getCampaign().getRaisedAmount());
                if (dr.getCampaign().getTargetAmount() != null && dr.getCampaign().getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
                    r.setMoneyProgress(dr.getCampaign().getRaisedAmount()
                        .multiply(BigDecimal.valueOf(100))
                        .divide(dr.getCampaign().getTargetAmount(), 2, java.math.RoundingMode.HALF_UP)
                        .doubleValue());
                }
            }
            if (dr.getNeeds() != null) {
                r.setNeeds(dr.getNeeds().stream().map(ReliefNeedResponse::from).collect(Collectors.toList()));
            }
            return r;
        }
    }
}
