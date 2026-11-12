# DÉLICE — Premium Fragrance E-Commerce Platform

> **"MAKE IT YOURS."**  
> Romantic in feeling. Bold in self-expression. Alive with youthful energy.  
> An attainable luxury fragrance brand tailored for university students and young adults across Bangladesh.

---

## 1. Project Overview

**DÉLICE** is a modern, fully-responsive, full-stack e-commerce boutique engineered from the official **DÉLICE Brand Book v1.0**. 

The platform adheres strictly to the brand visual identity:
- **Ivory (50%)**: `#F6F0E8` (Canvas & Backdrops)
- **Burgundy (30%)**: `#4A102A` (Primary Actions, Headings & Key Accents)
- **Ink (15%)**: `#181619` (High-contrast typography)
- **Gold & Coral (5% combined)**: `#C5A46D` (Restrained luxury foil) & `#FF665C` (Sparks of energy)
- **Typography**: Bodoni Moda (Headings), Manrope (Body), Hind Siliguri (Bangla)

---

## 2. Technology Stack

- **Frontend**: Vanilla HTML5, Modern CSS3 (Grid, Flexbox, CSS Variables), Vanilla JavaScript (ES6+), Responsive Mobile-First Architecture. (No heavy React/Vue runtime bloat).
- **Backend**: Node.js & Express.js.
- **Database**: MongoDB Atlas / MongoDB with Mongoose ODM.
- **Payment Architecture**: Official bKash & Nagad Send Money Architecture (100% Online Advance vs COD with Advance Delivery Fee, Sender Number & TrxID Verification, Admin Instant Verification).
- **Security**: Helmet HTTP Headers, CORS, Express-Rate-Limit, BCrypt Password Hashing, JWT Authentication.

---

## 3. Product Catalog (Official 30ml Editions)

1. **DÉLICE BLOOM (30ml)**
   - *Regular Price*: ৳850 | *Opening Offer Price*: ৳799
   - *Profile*: A sweet, soft fragrance for everyday use and formal occasions.
   - *Recommended for*: Everyday use, University, Formal occasions, Daytime outings.
2. **DÉLICE MOMENTUM (30ml)**
   - *Regular Price*: ৳850 | *Opening Offer Price*: ৳799
   - *Profile*: A bold, strong fragrance for busy days, outdoor activities, demanding workdays, and heat/motion.
   - *Recommended for*: Busy schedules, Outdoor activities, Workdays, Active lifestyles.
3. **DÉLICE ENIGMA (30ml)**
   - *Regular Price*: ৳850 | *Opening Offer Price*: ৳799
   - *Profile*: A sophisticated fragrance for evenings, romantic occasions, dates, and formal events.
   - *Recommended for*: Evening occasions, Dates, Romantic moments, Formal events.

---

## 4. Key Features & Workflows

### Storefront Experience
- **Editorial Hero Slideshow**: Automatic and touch-swipe slides with smooth transitions and curated Brand Book taglines.
- **Dynamic Scent & Mood Guide**: Interactive discovery matching moods (Campus & Everyday, Motion & Work, Evening & Romance) to recommended fragrances.
- **Slide-Out Shopping Bag**: Instant cart drawer persisting items in `localStorage`, calculating subtotal, opening offer savings, and item counts.
- **Authoritative Checkout**:
  - Bangladesh 64-district selector with automatic delivery charge calculation:
    - **Inside Dhaka**: ৳60 (1–2 days delivery)
    - **Outside Dhaka**: ৳120 (2–4 days delivery)
  - Explicit separation of product subtotal and courier charge.
  - 100% online payment enforcement (No Cash on Delivery).
- **Verified Payment Receipts**:
  - `payment-success.html` displays verified transaction reference, delivery address breakdown, and printable receipt.
  - `payment-failed.html` displays helpful retry mechanisms and customer service channels.

### Executive Admin Dashboard (`/admin`)
Nine specialized management sections:
1. **Overview**: Real-time database statistics (Total Orders, Bottles Sold, Gross Revenue, Delivery Fees Collected, Total Expenses, and True Net Profit).
2. **Orders**: Full order details with customer contact, transaction ID, payment status, fulfillment tracking, and per-order financial cost adjustment.
3. **Products**: Add, edit, deactivate products, update 30ml pricing, and manage scent descriptions.
4. **Inventory**: Real-time stock counts, low-stock warnings, and warehouse valuation (Cost vs. Retail).
5. **Sales & Revenue**: Average Order Value (AOV) and fragrance-wise sales volume breakdowns.
6. **Expenses**: Ledger for actual courier payments, product COGS, unboxing cartons/packaging, and marketing spend.
7. **Profit & Loss**: Audited financial breakdown adhering to strict accounting principles (unpaid orders excluded from revenue, separate delivery fees, and COGS deductions).
8. **Fund Allocation**: Configurable percentage distribution of true net profit (Business Reinvestment, Personal Withdrawal, Marketing Budget, Emergency Fund, Future Stock).
9. **Settings**: Configurable delivery rates, default COGS baseline, gateway fee %, and support contacts.

---

## 5. Directory Structure

```
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection & configuration
│   ├── controllers/
│   │   ├── adminController.js    # Statistics, P&L, Inventory, Expenses, Allocations
│   │   ├── authController.js     # Admin login & JWT verification
│   │   ├── orderController.js    # Order fulfillment & status updates
│   │   ├── productController.js  # Product catalog CRUD
│   │   └── settingController.js  # Public & Admin system settings
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT protection for Admin endpoints
│   │   ├── errorHandler.js       # Centralized error handler
│   │   └── rateLimiter.js        # Brute force & DDoS protection
│   ├── models/
│   │   ├── AdminUser.js          # Admin account schema with bcrypt
│   │   ├── Expense.js            # Operational and shipping expenses
│   │   ├── FundAllocation.js     # Profit distribution rules
│   │   ├── Order.js              # Complete order with financial snapshot
│   │   ├── Product.js            # Product catalog with COGS
│   │   └── Setting.js            # System-wide configurable settings
│   ├── routes/                   # Modular Express routers
│   ├── services/
│   │   └── financialService.js   # Audited accounting & P&L calculation
│   ├── seed.js                   # Initial database seeder
│   └── server.js                 # Express server entry point
├── frontend/
│   ├── admin/                    # Admin Portal
│   │   ├── index.html            # 9-section executive dashboard
│   │   ├── admin.css             # Brand-aligned dashboard styling
│   │   └── admin.js              # Interactive client-side dashboard controller
│   ├── assets/
│   │   └── images/               # High-res SVG flacons, logos, and hero slides
│   ├── css/
│   │   └── style.css             # Comprehensive design system
│   ├── js/
│   │   ├── app.js                # Hero slideshow, mood finder, modals
│   │   ├── cart.js               # Cart drawer & localStorage management
│   │   └── checkout.js           # Form validation & payment initiation
│   ├── cart.html                 # Dedicated shopping bag page
│   ├── checkout.html             # Delivery details & online payment
│   ├── index.html                # Editorial homepage
│   ├── payment-failed.html       # Transaction failure page
│   ├── payment-success.html      # Verified receipt & confirmation
│   └── product.html              # Dedicated fragrance details page
├── .env.example                  # Environment configuration template
├── package.json                  # Dependencies & start scripts
└── README.md                     # Documentation
```

---

## 6. Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (or a local MongoDB instance)

### Installation
1. Clone or navigate to the repository directory:
   ```bash
   cd "f:\Download\Delice\Delice System"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your MongoDB Atlas connection string in `MONGODB_URI`:
   ```ini
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/delice_fragrance?retryWrites=true&w=majority
   ```

4. Seed the Database:
   ```bash
   npm run seed
   ```
   *Creates the default superadmin user, 3 official fragrances, system settings, and initial allocations.*

5. Start the Server:
   ```bash
   npm start
   ```
   Open your browser:
   - **Customer Storefront**: [http://localhost:5000/](http://localhost:5000/)
   - **Admin Management Portal**: [http://localhost:5000/admin](http://localhost:5000/admin)

### Default Admin Credentials
- **Username**: `admin`
- **Password**: `Admin@Delice2026`

---

## 7. Payment Architecture (bKash & Nagad Send Money)

The system supports Bangladesh's two primary shopping models via direct bKash and Nagad Personal Send Money:

1. **100% Online Payment (Advance):**
   - Customer sends the full order amount (Products + Delivery charge) to the official bKash/Nagad number (`01731101780`).
   - Customer enters their sender number and Transaction ID (TrxID) in the checkout form.
   - Upon parcel delivery, customer has ৳0 cash due to the courier.

2. **Cash on Delivery with Advance Delivery Charge:**
   - Customer sends only the courier charge (৳60 inside Dhaka or ৳120 outside Dhaka) in advance via bKash/Nagad.
   - Customer enters sender number and TrxID to confirm their booking.
   - The remaining perfume cost is collected in cash by the courier rider upon parcel handover.

3. **Admin Verification & Financial Reconciliation:**
   - Orders arrive with status `awaiting_verification`.
   - Admin checks the TrxID and Sender Number against their bKash/Nagad account.
   - One-click verification marks the order `paid` and advances status to `processing` / `dispatched`.

---

## 8. Financial Accounting Rules Implemented

- **No Premature Revenue**: Unpaid and pending orders are strictly isolated from all revenue and profit calculations.
- **Segregated Courier Funds**: Delivery fees collected (৳60/৳120) are tracked separately and compared against actual courier expenses.
- **Snapshot Immutability**: Historical order item costs (`cogs`) and selling prices are snapshotted at the second of checkout, ensuring past accounting books remain accurate when product prices change in the future.
- **True Net Profit**:
  $$\text{Net Profit} = \text{Total Paid} - \text{Product COGS} - \text{Actual Courier Expense} - \text{Payment Fees} - \text{General Expenses}$$
- **Real-Time Fund Distribution**: Net profit is dynamically apportioned across configured allocations (Reinvestment, Withdrawals, Marketing, Emergency, Stock).

---

## 9. Brand Governance Checklist

- [x] Correct DÉLICE spelling with acute accent on É.
- [x] Tagline: MAKE IT YOURS.
- [x] Official HEX palette applied: Burgundy `#4A102A`, Ivory `#F6F0E8`, Ink `#181619`, Gold `#C5A46D`, Coral `#FF665C`.
- [x] Accurate 30ml volume indication and opening price of ৳799.
- [x] No invented notes, artificial claims, or fake scarcity timers.
- [x] Beginner-friendly, modular, properly documented codebase.
