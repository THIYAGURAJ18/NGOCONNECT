package com.ngoconnect.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "material_pledges")
@Data
@NoArgsConstructor
public class MaterialPledge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "disaster_relief_id", nullable = false)
    private DisasterRelief disasterRelief;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contributor_id", nullable = false)
    private User contributor;

    @Column(nullable = false)
    private String itemName;

    private Integer quantity;
    private String unit;

    @Enumerated(EnumType.STRING)
    private PledgeStatus status = PledgeStatus.PLEDGED;

    private LocalDateTime pledgedAt = LocalDateTime.now();

    public enum PledgeStatus {
        PLEDGED, COLLECTED, DISTRIBUTED
    }
}
