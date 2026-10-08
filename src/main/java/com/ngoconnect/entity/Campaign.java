package com.ngoconnect.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "campaigns")
@Data
@NoArgsConstructor
public class Campaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy; // NGO or Consumer

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal targetAmount;

    @Column(precision = 12, scale = 2)
    private BigDecimal raisedAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    private CampaignType type = CampaignType.GENERAL;

    private String city;

    private boolean active = true;

    private LocalDateTime deadline;

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Set to true for disaster relief campaigns
    private boolean isDisasterRelief = false;

    public enum CampaignType {
        GENERAL, DISASTER
    }
}
