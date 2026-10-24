package com.ngoconnect.dto;

import com.ngoconnect.entity.DonationPost;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

public class DonationPostDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "Category is required")
        private String category;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;

        private String unit;
        private DonationPost.Condition condition;

        @NotBlank(message = "City is required")
        private String city;

        @NotBlank(message = "Address is required")
        private String address;

        private String description;
    }

    @Data
    public static class Response {
        private Long id;
        private Long contributorId;
        private String contributorName;
        private String category;
        private Integer quantity;
        private String unit;
        private String condition;
        private String city;
        private String address;
        private String description;
        private String photoPath;
        private String status;
        private Long acceptedByNgoId;
        private String acceptedByNgoName;
        private String createdAt;
        private String acceptedAt;
        private String collectedAt;
        private String distributedAt;
        private String autoDeleteAt;

        public static Response from(DonationPost p) {
            Response r = new Response();
            r.setId(p.getId());
            r.setContributorId(p.getContributor().getId());
            r.setContributorName(p.getContributor().getName());
            r.setCategory(p.getCategory());
            r.setQuantity(p.getQuantity());
            r.setUnit(p.getUnit());
            r.setCondition(p.getCondition() != null ? p.getCondition().name() : null);
            r.setCity(p.getCity());
            r.setAddress(p.getAddress());
            r.setDescription(p.getDescription());
            r.setPhotoPath(p.getPhotoPath());
            r.setStatus(p.getStatus() != null ? p.getStatus().name() : null);
            if (p.getAcceptedByNgo() != null) {
                r.setAcceptedByNgoId(p.getAcceptedByNgo().getId());
                r.setAcceptedByNgoName(p.getAcceptedByNgo().getName());
            }
            r.setCreatedAt(p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
            r.setAcceptedAt(p.getAcceptedAt() != null ? p.getAcceptedAt().toString() : null);
            r.setCollectedAt(p.getCollectedAt() != null ? p.getCollectedAt().toString() : null);
            r.setDistributedAt(p.getDistributedAt() != null ? p.getDistributedAt().toString() : null);
            if (p.getStatus() == DonationPost.Status.DISTRIBUTED && p.getDistributedAt() != null) {
                r.setAutoDeleteAt(p.getDistributedAt().plusDays(2).toString());
            }
            return r;
        }
    }
}
