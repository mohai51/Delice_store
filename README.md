# DÉLICE — Quiet Luxury Perfumery E-Commerce Platform

> Haute Parfumerie distilled in Grasse and delivered with white-glove care across Bangladesh.

DÉLICE is a complete, production-ready, full-stack luxury perfume boutique built with **Node.js, Express.js, MongoDB (with Mongoose)** and a refined **HTML5, CSS3, Vanilla JavaScript** frontend.

---

## 💎 Brand & Design Philosophy

- **Brand Name:** DÉLICE
- **Market:** Bangladesh
- **Official Currency:** BDT (৳)
- **Aesthetic:** Quiet luxury, refined, editorial, and minimal.
- **Palette:** Warm ivory background (`#FAF7F2`), deep obsidian black (`#121212`), and restrained champagne gold accents (`#C5A880`).
- **Typography:** *Cormorant Garamond* (editorial serif headings) paired with *Plus Jakarta Sans* (humanist sans-serif body).
- **Core Principles:** No intrusive popups, no fake countdown timers, no exaggerated longevity claims, and no autoplay audio.

---

## 🏛 System Architecture & Technology Stack

- **Frontend:** Pure HTML5, CSS3, and Vanilla JavaScript. (Zero React, Next.js, Vue, Angular, Bootstrap, or Tailwind).
- **Backend:** Node.js with Express.js REST APIs.
- **Database:** MongoDB with Mongoose Schemas & Models. Includes an automatic persistent server-side JSON fallback (`data/delice_db.json`) that enables turnkey local development even before a MongoDB daemon is initialized.
- **Image Processing:** **Sharp** high-performance raster optimization (generating progressive WebP, responsive mobile formats, and crisp 320x320 thumbnails while validating genuine MIME types).
- **Authentication & Security:** Bcrypt hashing (12 salt rounds), secure HttpOnly session cookies, CSRF protection for mutations, rate limiting, atomic stock management, and audit logging.

---

## 🚀 Quick Start Guide

### 1. Installation
Clone or navigate to the project directory and install the Node dependencies:

```bash
cd "f:/Delice System"
npm install
```

### 2. Environment Configuration
Verify or adjust your `.env` file (copied from `.env.example`):

```ini
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/delice_db
SESSION_SECRET=delice_quiet_luxury_secret_key_bangladesh_2026_randomized_8943721094
ADMIN_COOKIE_NAME=delice_admin_sess
```

### 3. Setup Initial Administrator
Run the documented secure setup command to create or update your administrator credentials:

```bash
npm run setup-admin -- --username admin --email concierge@deliceparfums.com --password DeliceAdmin2026!
```

> **Default Seeded Admin Credentials:**
> - **Portal URL:** `http://localhost:4000/admin`
> - **Username:** `admin`
> - **Password:** `DeliceAdmin2026!`

### 4. Start the Application
Run the server:

```bash
npm start
```
Or with auto-reload during development:
```bash
npm run dev
```

Visit the application in your browser:
- **Storefront:** [http://localhost:4000](http://localhost:4000)
- **Admin Concierge Panel:** [http://localhost:4000/admin](http://localhost:4000/admin)

---

## 👑 Features & Capabilities

### 🛍 Customer Storefront
1. **Curated Editorial Homepage:**
   - Admin-controlled announcement bar.
   - Hero banner with desktop & mobile assets and focal-point adjustment to prevent flacon cropping.
   - Signature collection display with BDT pricing, notes, and sold-out badges.
   - Concise brand philosophy and atelier craftsmanship story.
   - Customer reflections (only displayed when genuine patron reviews are approved).
2. **Product Details Page (`/product/:slug`):**
   - High-resolution gallery with thumbnail switcher.
   - Structured Olfactory Architecture (Top, Heart, and Base notes).
   - Variant selector (e.g. 50ml, 100ml) with live stock counters and genuine sale pricing.
   - Sticky mobile "Add to Bag" bar for one-thumb purchasing.
   - Expandable accordions for IFRA-compliant ingredients, delivery, and return policies.
3. **Shopping Bag & Discreet Checkout (`/cart`, `/checkout`):**
   - Flyout drawer and dedicated bag review page.
   - Guest checkout (no mandatory account creation).
   - Validated Bangladesh mobile phone format (`01XXXXXXXXX`) and district zones (Inside Dhaka ৳80, Outside Dhaka ৳150, Complimentary over ৳5,000).
   - Server-side price, coupon, and atomic inventory validation.
   - Unpredictable order references (e.g. `DEL-2026-XXXXX`) and cryptographic tracking tokens preventing sequential ID scraping.
4. **Payment Workflows:**
   - **Cash on Delivery (COD)**: Configurable in admin.
   - **Manual bKash Send Money**: Configurable bKash concierge number and clear TrxID submission. Never prompts for PINs or OTPs. Marked *Pending verification* until approved by finance desk.
5. **Private Tracking (`/track-order`):**
   - Token-based order tracking displaying status milestones (Order Received &rarr; Confirmed &rarr; Sealed & Bottled &rarr; In Transit &rarr; Delivered).

---

### 🛡 Secure Admin Concierge Workspace (`/admin`)

The admin panel is organized into 7 distinct functional menus:

1. **Dashboard:**
   - Configurable date filters (Today, 7D, 30D, 90D).
   - KPI metrics: Delivered Net Sales (excluding cancelled/refunded), Order Counts, Pending Orders, Low Stock Alerts.
   - First-party telemetry: Unique visitors and page views.
2. **Homepage Editor:**
   - Real-time controls for announcement bar, hero copy, focal-point sliders, and brand story.
   - Patron reflection review moderation.
   - Section reordering and visibility toggles.
   - Desktop and mobile preview frames (previewing a draft never prematurely publishes).
   - Snapshot-based revision history with 1-click restore.
3. **Products & Inventory:**
   - Create, edit, archive, and publish perfumes.
   - Multi-variant sizing with independent stock levels and SKUs.
   - Atomic stock adjustments with mandatory audit reason logging.
   - 1-click publishing for initial demo products.
4. **Media Library:**
   - Safe raster uploads validated for genuine MIME type and size limits.
   - Automatic Sharp generation of progressive WebP and square thumbnails.
   - Asset dependency checks: warns if an image is in use before deletion.
5. **Orders Management:**
   - Search by order reference, patron name, or phone.
   - Filter by fulfillment status and payment status.
   - Independent fulfillment and payment tracking.
   - Courier waybill recording.
   - Order cancellation atomically returns reserved stock once.
   - Printable order invoice.
6. **Analytics & Visitor Map:**
   - First-party tracking endpoint (`/api/storefront/analytics/collect`).
   - Funnel metrics: Product views &rarr; Bag adds &rarr; Checkout starts &rarr; Purchases.
   - Device breakdown (Mobile, Desktop, Tablet).
   - Approximate Bangladesh district clusters (Dhaka, Chittagong, Sylhet, etc.) with honest "Unknown" fallback.
   - Deduplicated purchase telemetry.
7. **Referrals & Patrons:**
   - Ambassador referral code generator with configurable commission % and referee discount %.
   - Commission lifecycle: *Pending* &rarr; *Eligible* (after delivery confirmation + return window) &rarr; *Paid*.
   - Commission payout ledger preventing duplicate disbursements.
   - Self-referral / phone fraud flags.
8. **Store Settings & Security:**
   - Delivery zone charges and free delivery threshold.
   - bKash instructions and payment toggles.
   - Policy texts (Delivery, Returns, Privacy, Terms).
   - Admin password change with Bcrypt salting.
   - Full JSON database backup export.
   - Administrative audit log viewer.

---

## 🔒 Security Best Practices Implemented

- **No Public Registration:** Admins are created solely through CLI scripts.
- **Cookie-Based Sessions:** `HttpOnly`, `SameSite=Lax`, and `Secure` (in production).
- **CSRF Defense:** `x-csrf-token` header validation on all administrative state mutations.
- **Rate Limiting:** Protects `/api/auth/login`, `/api/storefront/orders`, and `/api/storefront/track/:token`.
- **Atomic Operations:** Stock is decremented on order creation and restocked if cancelled.
- **Privacy Discretion:** No raw IPs or home GPS coordinates collected or stored.

---

## 📄 License & Attribution
Formulated and designed exclusively for **DÉLICE Parfums**, Bangladesh. All rights reserved.
