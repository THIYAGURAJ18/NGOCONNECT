package com.ngoconnect.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "donations")
@Data
@NoArgsConstructor
public class Donation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contributor_id", nullable = false)
    private User contributor;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    private String note;

    // MOCK payment reference - replace with Razorpay order ID in production
    // TODO: Razorpay integration point - replace mockPaymentRef with razorpay_order_id
    private String mockPaymentRef;

    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus = PaymentStatus.SUCCESS; // Mock: always success

    @Column(updatable = false)
    private LocalDateTime donatedAt = LocalDateTime.now();

    public enum PaymentStatus {
        PENDING, SUCCESS, FAILED
    }
}
