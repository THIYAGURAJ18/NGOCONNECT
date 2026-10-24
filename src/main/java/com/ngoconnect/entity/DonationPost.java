package com.ngoconnect.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "donation_posts")
@Data
@NoArgsConstructor
public class DonationPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contributor_id", nullable = false)
    private User contributor;

    @Column(nullable = false)
    private String category; // Food, Clothes, Medicine, Books, Electronics, Other

    @Column(nullable = false)
    private Integer quantity;

    private String unit; // kg, pieces, litres, etc.

    @Enumerated(EnumType.STRING)
    private Condition condition = Condition.GOOD;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private String address;

    @Column(length = 1000)
    private String description;

    private String photoPath;

    @Enumerated(EnumType.STRING)
    private Status status = Status.POSTED;

    // NGO that accepted this donation
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accepted_by_ngo_id")
    private User acceptedByNgo;

    private LocalDateTime acceptedAt;
    private LocalDateTime collectedAt;
    private LocalDateTime distributedAt;

    @OneToMany(mappedBy = "donationPost", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DistributionUpdate> distributionUpdates = new ArrayList<>();

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Status {
        POSTED, ACCEPTED, COLLECTED, DISTRIBUTED
    }

    public enum Condition {
        NEW, GOOD, FAIR, POOR
    }
}
