package com.ngoconnect.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private String city;
    private String phone;

    // NGOs need admin verification before creating campaigns
    private boolean verified = false;

    private String organizationName; // for NGOs

    private String aadhaarNumber;
    private boolean aadhaarVerified = false;

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Role {
        CONTRIBUTOR, NGO, CONSUMER, ADMIN
    }
}
