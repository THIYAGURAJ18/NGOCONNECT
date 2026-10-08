package com.ngoconnect.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "relief_needs")
@Data
@NoArgsConstructor
public class ReliefNeed {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "disaster_relief_id", nullable = false)
    private DisasterRelief disasterRelief;

    @Column(nullable = false)
    private String itemName; // e.g. food packets, water, blankets, medical kits

    private Integer quantityNeeded;
    private Integer quantityPledged = 0;

    private String unit; // e.g. packets, litres, pieces
}
