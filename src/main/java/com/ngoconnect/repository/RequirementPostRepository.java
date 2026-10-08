package com.ngoconnect.repository;

import com.ngoconnect.entity.RequirementPost;
import com.ngoconnect.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequirementPostRepository extends JpaRepository<RequirementPost, Long> {

    List<RequirementPost> findByPostedByOrderByCreatedAtDesc(User postedBy);

    @Query("SELECT r FROM RequirementPost r WHERE " +
           "(:item IS NULL OR LOWER(r.item) = LOWER(:item)) AND " +
           "(:city IS NULL OR LOWER(r.city) = LOWER(:city)) AND " +
           "(:urgency IS NULL OR r.urgency = :urgency) AND " +
           "r.fulfilled = false " +
           "ORDER BY CASE r.urgency WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, r.createdAt DESC")
    List<RequirementPost> findWithFilters(
        @Param("item") String item,
        @Param("city") String city,
        @Param("urgency") RequirementPost.Urgency urgency
    );

    // For matching: find unfulfilled requirements in a city with a given item category
    @Query("SELECT r FROM RequirementPost r WHERE r.fulfilled = false AND " +
           "LOWER(r.item) = LOWER(:item) AND LOWER(r.city) = LOWER(:city)")
    List<RequirementPost> findMatchingRequirements(
        @Param("item") String item,
        @Param("city") String city
    );
}
