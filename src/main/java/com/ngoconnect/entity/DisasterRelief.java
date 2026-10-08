package com.ngoconnect.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "disaster_reliefs")
@Data
@NoArgsConstructor
public class DisasterRelief {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_ngo_id", nullable = false)
    private User createdByNgo;

    @Column(nullable = false)
    private String title; // e.g. "Chennai Flood Relief 2024"

    @Column(length = 2000)
    private String description;

    @Column(nullable = false)
    private String city;

    private String state;

    // Linked money campaign
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id")
    private Campaign campaign;

    @OneToMany(mappedBy = "disasterRelief", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReliefNeed> needs = new ArrayList<>();

    @OneToMany(mappedBy = "disasterRelief", cascade = CascadeType.ALL)
    private List<MaterialPledge> pledges = new ArrayList<>();

    private boolean active = true;

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
