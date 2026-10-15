package com.ngoconnect.repository;

import com.ngoconnect.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByAadhaarNumber(String aadhaarNumber);
    boolean existsByAadhaarNumber(String aadhaarNumber);
    long countByRole(User.Role role);
}
