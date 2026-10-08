package com.ngoconnect.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "requirement_posts")
@Data
@NoArgsConstructor
public class RequirementPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posted_by_id", nullable = false)
    private User postedBy; // Consumer or NGO

    @Column(nullable = false)
    private String item; // matches DonationPost.category

    @Column(nullable = false)
    private Integer quantityNeeded;

    private String unit;

    private String forWhom; // e.g. "30 orphan children", "elderly patients"

    @Enumerated(EnumType.STRING)
    private Urgency urgency = Urgency.MEDIUM;

    @Column(nullable = false)
    private String city;

    private String address;

    @Column(length = 1000)
    private String description;

    private boolean fulfilled = false;

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Urgency {
        LOW, MEDIUM, HIGH
    }
}
