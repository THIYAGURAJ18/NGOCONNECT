package com.ngoconnect.repository;

import com.ngoconnect.entity.DonationPost;
import com.ngoconnect.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DonationPostRepository extends JpaRepository<DonationPost, Long> {

    List<DonationPost> findByContributorOrderByCreatedAtDesc(User contributor);

    List<DonationPost> findByStatusOrderByCreatedAtDesc(DonationPost.Status status);

    @Query("SELECT d FROM DonationPost d WHERE " +
           "(:category IS NULL OR LOWER(d.category) = LOWER(:category)) AND " +
           "(:city IS NULL OR LOWER(d.city) = LOWER(:city)) AND " +
           "(:status IS NULL OR d.status = :status) " +
           "ORDER BY d.createdAt DESC")
    List<DonationPost> findWithFilters(
        @Param("category") String category,
        @Param("city") String city,
        @Param("status") DonationPost.Status status
    );

    // For matching: find POSTED donations in a city with a given category
    @Query("SELECT d FROM DonationPost d WHERE d.status = 'POSTED' AND " +
           "LOWER(d.category) = LOWER(:category) AND LOWER(d.city) = LOWER(:city)")
    List<DonationPost> findMatchingDonations(
        @Param("category") String category,
        @Param("city") String city
    );

    long countByStatus(DonationPost.Status status);

    @Query("SELECT d.category, COUNT(d) FROM DonationPost d GROUP BY d.category")
    List<Object[]> countByCategory();
}
