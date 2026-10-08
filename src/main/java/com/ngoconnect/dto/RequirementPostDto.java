package com.ngoconnect.dto;

import com.ngoconnect.entity.RequirementPost;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

public class RequirementPostDto {

    @Data
    public static class CreateRequest {
        @NotBlank(message = "Item is required")
        private String item;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantityNeeded;

        private String unit;
        private String forWhom;
        private RequirementPost.Urgency urgency;

        @NotBlank(message = "City is required")
        private String city;

        private String address;
        private String description;
    }

    @Data
    public static class Response {
        private Long id;
        private Long postedById;
        private String postedByName;
        private String postedByRole;
        private String item;
        private Integer quantityNeeded;
        private String unit;
        private String forWhom;
        private String urgency;
        private String city;
        private String address;
        private String description;
        private boolean fulfilled;
        private String createdAt;

        public static Response from(RequirementPost r) {
            Response res = new Response();
            res.setId(r.getId());
            res.setPostedById(r.getPostedBy().getId());
            res.setPostedByName(r.getPostedBy().getName());
            res.setPostedByRole(r.getPostedBy().getRole().name());
            res.setItem(r.getItem());
            res.setQuantityNeeded(r.getQuantityNeeded());
            res.setUnit(r.getUnit());
            res.setForWhom(r.getForWhom());
            res.setUrgency(r.getUrgency() != null ? r.getUrgency().name() : null);
            res.setCity(r.getCity());
            res.setAddress(r.getAddress());
            res.setDescription(r.getDescription());
            res.setFulfilled(r.isFulfilled());
            res.setCreatedAt(r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
            return res;
        }
    }
}
