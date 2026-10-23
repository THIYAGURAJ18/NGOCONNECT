# Smart Donation — Community Logistics & Disaster Relief Platform

A comprehensive full-stack web application connecting **Contributors**, **NGOs**, and **Care Centers / Orphanages** with an integrated **Disaster Relief module**, 4-stage logistics pipeline, smart matching suggestions, transparent money campaigns with mock payments, and admin verification. Contributor donation posts are routed directly to registered NGOs and Orphanages for pickup and distribution.

---

## Quick Start (Windows)

### Prerequisites
- **Java 17+** installed and available on PATH (`java -version`)
- Maven is **NOT** required (Maven Wrapper is included!)

### 1. Run the Application
Open PowerShell or Command Prompt in the `e:\NGOCONNECT` directory and run:

```powershell
.\mvnw.cmd spring-boot:run
```
*(Or if you have Maven installed: `mvn spring-boot:run`)*

### 2. Open in Browser
Navigate to:
**[http://localhost:8080](http://localhost:8080)**

---

## Pre-seeded Demo Accounts

The database is pre-seeded with ready-to-test accounts on startup:

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `admin@ngoconnect.com` | `admin123` | Platform analytics & NGO verification |
| **Contributor** | `contributor@demo.com` | `demo123` | Can post donations, pledge relief items, donate money |
| **NGO (Verified)** | `ngo@helphand.org` | `demo123` | Can accept donations, upload proof, launch campaigns & disaster relief |
| **NGO (Unverified)** | `ngo2@newlife.org` | `demo123` | Pending verification in Admin queue |
| **Care Center / Consumer** | `consumer@orphanage.com` | `demo123` | Can post requirements & beneficiary campaigns |

> **Tip:** You can also use the **1-Click Quick Demo Login** buttons located at the top banner and in the login modal to switch between roles instantly!

---

## Key Features

1. **Role-Based Authentication & Route Protection**:
   - Four distinct user roles: `CONTRIBUTOR`, `NGO`, `CONSUMER`, `ADMIN`.
   - BCrypt password hashing and Spring Security session-based authentication.
   - Dedicated dashboard tailored to each role.

2. **Donation Posts (Contributor)**:
   - Category (`Food`, `Clothes`, `Medicine`, `Books`, `Electronics`, `Other`), quantity, condition, location, and optional photo upload.
   - Uploaded photos saved securely in the local `uploads/` directory.
   - Interactive 4-stage Status Stepper: `POSTED` -> `ACCEPTED` -> `COLLECTED` -> `DISTRIBUTED`.

3. **Community Requirements (Shelters & NGOs)**:
   - Item requests with quantity, target beneficiaries ("for whom"), location, and urgency (`HIGH`, `MEDIUM`, `LOW`).
   - High-urgency community needs automatically sorted first.

4. **Donation Workflow & Proof of Distribution**:
   - NGOs review available donations in their city and accept them.
   - NGOs mark items as `COLLECTED` and then `DISTRIBUTED`.
   - NGOs upload photographic proof and distribution notes upon handover.

5. **Smart Matching Algorithm**:
   - Automatically suggests matches between available donation posts and consumer requirements having matching categories, similar quantities, and matching cities.
   - 1-click connect/accept for NGOs.

6. **Fundraising Campaigns & Mock Payments**:
   - Verified NGOs and care centers create campaigns with target amounts.
   - Real-time animated progress bars (`₹15,000 / ₹20,000 (75%)`).
   - Mock payment modal with preset chips (₹500, ₹1,000, ₹5,000, Custom) simulating a gateway step (clearly marked for Razorpay integration).

7. **Disaster Relief Command Hub**:
   - Verified NGOs can launch emergency relief campaigns (e.g. *"Chennai Cyclone & Flood Relief"*).
   - Supplies tracker with dynamic checklists (food packets, drinking water, blankets, medical kits) showing pledged vs needed counts.
   - Highlighted emergency banner displayed prominently at the top of the application.
   - Contributors can pledge supplies or donate relief funds directly.

8. **Admin Panel & Telemetry**:
   - NGO verification queue (unverified NGOs cannot launch campaigns until verified).
   - Real-time KPI cards: Total Users, Total Donations, Completed Campaigns, Total Money Raised.
   - Community donation breakdown by category.

---

## Technology Stack

- **Backend**: Java 17, Spring Boot 3.2.5 (Maven)
  - `spring-boot-starter-web`: RESTful endpoints
  - `spring-boot-starter-data-jpa`: Hibernate ORM
  - `spring-boot-starter-security`: BCrypt + Session management
  - `spring-boot-starter-validation`: DTO input validation
- **Database**: H2 in file mode (`jdbc:h2:file:./data/ngoconnect`)
  - Can switch to MySQL by uncommenting properties in `application.properties`.
- **Frontend**: Single Page Application in `src/main/resources/static`
  - HTML5 semantic structure
  - Modern CSS design system (warm teal & orange palette, glassmorphism, responsive cards, micro-animations)
  - Vanilla JavaScript ES6+ with `fetch()` API and credentials handling
