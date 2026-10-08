package com.ngoconnect.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "distribution_updates")
@Data
@NoArgsConstructor
public class DistributionUpdate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "donation_post_id", nullable = false)
    private DonationPost donationPost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ngo_id", nullable = false)
    private User ngo;

    @Column(length = 2000)
    private String note;

    private String photoPath;

    private LocalDateTime updatedAt = LocalDateTime.now();
}
