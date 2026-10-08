# Smart Donation and NGO Connect

## Project Overview
"Smart Donation and NGO Connect" is an end-to-end community logistics and disaster relief platform that bridges the gap between Contributors, Non-Governmental Organizations (NGOs), and Consumers (shelters, orphanages, and care centers).

## Key Modules
1. **User Management & Authentication**:
   - Role-Based Access Control: CONTRIBUTOR, NGO, CONSUMER, ADMIN.
   - Session-based authentication with BCrypt password encryption.
   - Admin verification workflow for NGOs.

2. **In-Kind Donation Post Management**:
   - Item details (Category, Quantity, Unit, Condition, Address, City, Photo).
   - Local disk storage for uploaded photos.
   - 4-stage tracking status: `POSTED` -> `ACCEPTED` -> `COLLECTED` -> `DISTRIBUTED`.

3. **Care Center Community Requirements**:
   - Needs posting with item name, quantity, target group ("for whom"), urgency level, and city.
   - Urgency-prioritized listing.

4. **Smart Logistics Matching**:
   - Automatic matching between incoming donations and open requirements based on city, category, and quantity.

5. **Fundraising Campaigns & Mock Payments**:
   - Financial goal tracking with progress bars.
   - Preset amounts (₹500, ₹1000, ₹5000) and custom amounts.
   - Mock payment processor with reference generation (Razorpay ready).

6. **Emergency Disaster Relief**:
   - Emergency banner broadcast on the home page.
   - Supplies pledge tracker (needed vs pledged counts).
   - Emergency relief fund integration.

7. **Admin Operations**:
   - NGO verification portal.
   - Aggregate telemetry and analytics.
