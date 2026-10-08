package com.ngoconnect.config;

import com.ngoconnect.entity.User;
import com.ngoconnect.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds demo accounts on startup with zero default posts.
 * Real posts will be created dynamically by Contributors, NGOs, and Care Centers.
 * Demo accounts:
 *   admin@ngoconnect.com    / admin123   (ADMIN)
 *   contributor@demo.com    / demo123    (CONTRIBUTOR)
 *   ngo@helphand.org        / demo123    (NGO, verified)
 *   ngo2@newlife.org        / demo123    (NGO, unverified)
 *   consumer@orphanage.com  / demo123    (CONSUMER / Orphanage)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Users already exist, skipping account seed.");
            return;
        }

        log.info("Seeding clean initial demo accounts (zero default posts)...");

        // ── Initial Demo Users ─────────────────────────────────
        createUser("Admin", "admin@ngoconnect.com", "admin123", User.Role.ADMIN, "Chennai", true, null);
        createUser("Ravi Kumar", "contributor@demo.com", "demo123", User.Role.CONTRIBUTOR, "Chennai", true, null);
        createUser("Priya Sharma", "priya@demo.com", "demo123", User.Role.CONTRIBUTOR, "Mumbai", true, null);
        createUser("HelpHand Foundation", "ngo@helphand.org", "demo123", User.Role.NGO, "Chennai", true, "HelpHand Foundation");
        createUser("New Life NGO", "ngo2@newlife.org", "demo123", User.Role.NGO, "Mumbai", false, "New Life NGO");
        createUser("Sunshine Orphanage", "consumer@orphanage.com", "demo123", User.Role.CONSUMER, "Chennai", true, "Sunshine Orphanage");
        createUser("Elder Care Centre", "eldercare@demo.com", "demo123", User.Role.CONSUMER, "Mumbai", true, "Elder Care Centre");

        log.info("Clean demo accounts initialized with 0 default posts!");
    }

    private User createUser(String name, String email, String password, User.Role role,
                            String city, boolean verified, String orgName) {
        User u = new User();
        u.setName(name);
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode(password));
        u.setRole(role);
        u.setCity(city);
        u.setVerified(verified);
        u.setOrganizationName(orgName);
        return userRepository.save(u);
    }
}
