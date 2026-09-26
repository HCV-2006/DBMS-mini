# Product Requirements Document (PRD)
## Inventory Management System — Web Application
**Version:** 2.0 (Revised)
**Date:** 26 September 2026
**Status:** Draft for review

---

## 1. Overview

The Inventory Management System (IMS) is a web-based application that helps a small business manage products, inventory, categories, suppliers, sales, and stock levels from a single dashboard.

The system replaces manual inventory registers with a digital solution where an authorized user can:

- Log in securely and operate under a defined role (Admin or Staff).
- Add, edit, and deactivate products.
- Organize products into categories.
- Manage suppliers.
- Track available stock in real time.
- Record incoming stock (purchases/restocking) and stock adjustments (damage, loss, correction).
- Record customer sales and automatically reduce stock.
- View low-stock and out-of-stock products.
- Monitor sales and inventory statistics through dashboards.
- Search and filter products.
- View reports, export data, and review transaction/audit history.

The application remains a **CRUD-based system with an auditable transaction trail**, so it is easy to understand, demonstrate, maintain, and present in an academic or small-business setting, while avoiding the data-integrity gaps common in "toy" inventory projects (e.g., untracked stock changes, unprotected deletes, race conditions on concurrent sales).

There are no advertisements, monetization systems, or public-facing storefronts.

### 1.1 What changed from v1
This revision closes several gaps identified in the original draft:
- Adds a **stock movement ledger** so every quantity change (sale, restock, adjustment) is traceable — not just the current quantity.
- Adds a **soft-delete** model for products/categories/suppliers instead of hard deletes, preserving referential integrity for historical sales.
- Adds an **activity/audit log** for accountability.
- Makes **Settings** database-backed instead of a static file, since the UI implies runtime editing.
- Adds explicit **concurrency handling** for simultaneous sales against the same product.
- Strengthens **security** (CSRF protection, rate limiting on login, secrets via environment variables, security headers).
- Adds **pagination, filtering, and sorting** as explicit, standardized API query parameters.
- Adds a standardized **API error response format**.
- Adds **role-based permission** detail for the optional Staff role instead of leaving it undefined.
- Adds supplier delete protection (previously only categories were protected).

---

## 2. Project Goals

- Provide a simple digital inventory management solution.
- Eliminate the need for manual stock registers.
- Allow authorized users to manage products efficiently, under appropriate role permissions.
- Automatically and reliably update product quantities when stock is purchased, sold, or adjusted.
- Preserve a complete, auditable history of every stock change and user action.
- Quickly identify low-stock and out-of-stock products.
- Maintain a reliable record of sales, protected against partial/corrupted transactions.
- Provide useful dashboards for inventory and sales.
- Keep CRUD operations easy to demonstrate.
- Keep the database simple, normalized, and constraint-enforced.
- Provide a responsive interface for desktop, tablet, and mobile.
- Make the application easy to deploy and run locally, with secrets kept out of source control.
- Keep the architecture understandable for students and project evaluators.

---

## 3. Target Users

- Small retail stores, kirana/general stores, small warehouses.
- Electronics, clothing, and stationery shops.
- Small e-commerce businesses (back-office inventory only).
- Academic/project demonstrations.

### 3.1 User Roles & Permissions

| Role | Description | Permissions |
|---|---|---|
| **Admin** | Full system owner | Full access: manage users, products, categories, suppliers, stock, sales, settings, reports, and view audit logs |
| **Staff** | Day-to-day operator (optional, if enabled) | Can create sales, add stock, view products/categories/suppliers, view own sales history. **Cannot** delete records, manage users, edit settings, or view other staff's audit logs |

The system ships with **one Admin account** by default to keep the initial project simple. The Staff role and its permission checks should exist in the schema and middleware from day one (even if the seed data only creates an Admin), so enabling multi-user access later does not require a redesign.

The public has no access to the system — there is no customer-facing storefront.

---

## 4. Core Application Workflow

```text
                ┌─────────────────┐
                │     Login       │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │    Dashboard    │
                └────────┬────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     Products        Suppliers       Categories
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  Inventory Stock
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   Stock Added      Product Sold     Stock Adjusted
        │                │                │
        ▼                ▼                ▼
  Stock Increases  Stock Decreases   Correction (+/-)
        │                │                │
        │                ▼                │
        │          Sales Record           │
        └────────────────┼────────────────┘
                         ▼
                 Stock Movement Ledger
                         │
                         ▼
              Dashboards & Reports
```

### 4.1 Example

```text
Product: Parle-G Biscuits
Current Stock: 50

Customer purchases: 5
50 - 5 = 45   → logged as a SALE movement

New stock received: 20
45 + 20 = 65  → logged as a RESTOCK movement

Stock count corrected after audit: -2 (damaged)
65 - 2 = 63   → logged as an ADJUSTMENT movement
```

Every one of these changes is written to a `stock_movements` record, so the product's current `quantity` is always reconstructable and explainable from history — not just a mutable counter.

---

## 5. Recommended Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5 |
| Styling | CSS3 / Tailwind CSS |
| Frontend Logic | Vanilla JavaScript |
| Icons | Lucide Icons |
| Backend | Node.js |
| Server Framework | Express.js |
| Database | SQLite |
| Database Library | better-sqlite3 |
| Authentication | express-session + bcrypt |
| Security Middleware | helmet, csurf (or double-submit CSRF token), express-rate-limit |
| File Upload | Multer |
| Charts | Chart.js |
| Config/Secrets | dotenv (`.env`, never committed) |
| API Style | REST API |
| Package Manager | npm |
| Dev Environment | VS Code |
| Hosting | Localhost / cPanel Node.js hosting |

**Why this stack?** The project doesn't need React, Angular, MongoDB, or a complex cloud architecture. A simple `HTML/CSS/JS → Node.js + Express → SQLite` pipeline is sufficient, and adding a thin layer of security middleware (helmet, rate limiting, CSRF) keeps the app safe without adding real architectural complexity.

---

## 6. Application Architecture

```text
                    USER
                     │
                     ▼
              ┌─────────────┐
              │  Web Browser│
              └──────┬──────┘
                     │
                 HTTP Requests
                     │
                     ▼
              ┌─────────────┐
              │   Express   │
              │   Server    │
              └──────┬──────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
   Routes        Services      Middleware
      │                          (auth, role
      │                           check, CSRF,
      │                           rate-limit)
      ▼
  Database Layer
      │
      ▼
   ┌────────┐
   │ SQLite │
   └────────┘
```

The Express server provides: static frontend files, authentication & authorization, REST APIs, CRUD operations, inventory calculations with audit logging, sales processing (as DB transactions), and dashboard statistics.

---

## 7. Project Folder Structure

```text
inventory-management-system/
│
├── server.js
├── package.json
├── .env.example
├── .gitignore
├── config.json
├── README.md
│
├── database/
│   ├── database.sqlite
│   ├── schema.sql
│   ├── seed.sql
│   └── db.js
│
├── public/
│   ├── index.html
│   ├── login.html
│   │
│   ├── pages/
│   │   ├── dashboard.html
│   │   ├── products.html
│   │   ├── product-form.html
│   │   ├── categories.html
│   │   ├── suppliers.html
│   │   ├── sales.html
│   │   ├── stock.html
│   │   ├── reports.html
│   │   └── settings.html
│   │
│   ├── css/
│   │   ├── style.css
│   │   ├── dashboard.css
│   │   ├── forms.css
│   │   └── responsive.css
│   │
│   ├── js/
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── products.js
│   │   ├── categories.js
│   │   ├── suppliers.js
│   │   ├── sales.js
│   │   ├── stock.js
│   │   ├── reports.js
│   │   └── settings.js
│   │
│   └── assets/
│       └── icons/
│
├── routes/
│   ├── authRoutes.js
│   ├── productRoutes.js
│   ├── categoryRoutes.js
│   ├── supplierRoutes.js
│   ├── salesRoutes.js
│   ├── stockRoutes.js
│   ├── dashboardRoutes.js
│   └── settingsRoutes.js
│
├── middleware/
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   ├── csrfMiddleware.js
│   ├── rateLimitMiddleware.js
│   └── errorHandler.js
│
├── tests/
│   └── (unit/integration tests)
│
└── storage/
    └── product-images/
```

Exact folder names may be adjusted during implementation, but the app must keep a clear separation between frontend, backend, database, and storage, and **secrets must live only in `.env`**, never in `config.json` or source control.

---

## 8. Database Design

The database now contains **9 tables** — three more than the original draft, added specifically to close integrity and auditability gaps:

```text
users
categories
suppliers
products
sales
sale_items
stock_movements   (new — full audit trail of every quantity change)
activity_logs     (new — who did what, when)
settings          (new — runtime-editable app settings, replacing static config)
```

This is still small and easy to explain in a presentation, while giving the system a real audit trail.

---

## 9. Database Tables

### 9.1 users
| Field | Type | Description |
|---|---|---|
| id | INTEGER PK | Unique user ID |
| name | TEXT NOT NULL | User name |
| username | TEXT UNIQUE NOT NULL | Login username |
| password_hash | TEXT NOT NULL | Bcrypt hash |
| role | TEXT NOT NULL CHECK(role IN ('admin','staff')) | Role |
| is_active | INTEGER NOT NULL DEFAULT 1 | Disable account without deleting it |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | Account creation time |

Passwords must never be stored as plain text. A disabled (`is_active = 0`) user cannot log in but their historical sales/activity remain intact.

### 9.2 categories
| Field | Type | Description |
|---|---|---|
| id | INTEGER PK | Category ID |
| name | TEXT UNIQUE NOT NULL | Category name |
| is_active | INTEGER NOT NULL DEFAULT 1 | Soft-delete flag |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | Creation date |

### 9.3 suppliers
| Field | Type | Description |
|---|---|---|
| id | INTEGER PK | Supplier ID |
| name | TEXT NOT NULL | Supplier name |
| phone | TEXT | Contact number |
| email | TEXT | Optional email |
| address | TEXT | Supplier address |
| is_active | INTEGER NOT NULL DEFAULT 1 | Soft-delete flag |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | Creation date |

### 9.4 products
| Field | Type | Description |
|---|---|---|
| id | INTEGER PK | Product ID |
| name | TEXT NOT NULL | Product name |
| category_id | INTEGER FK → categories.id | Product category |
| supplier_id | INTEGER FK → suppliers.id, NULLABLE | Supplier |
| sku | TEXT UNIQUE NOT NULL | Product identifier |
| price | REAL NOT NULL CHECK(price >= 0) | Selling price |
| cost_price | REAL CHECK(cost_price >= 0) | Purchase price |
| quantity | INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0) | Current stock |
| minimum_stock | INTEGER NOT NULL DEFAULT 10 CHECK(minimum_stock >= 0) | Low-stock threshold |
| unit | TEXT DEFAULT 'piece' | Piece, kg, litre, etc. |
| image | TEXT | Optional product image path |
| is_active | INTEGER NOT NULL DEFAULT 1 | Soft-delete flag (see §26) |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | Creation date |
| updated_at | DATETIME DEFAULT CURRENT_TIMESTAMP | Last update |

### 9.5 sales
| Field | Type | Description |
|---|---|---|
| id | INTEGER PK | Sale ID |
| total_amount | REAL NOT NULL CHECK(total_amount >= 0) | Total sale value |
| status | TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','voided')) | Sale status |
| created_by | INTEGER FK → users.id | User who created sale |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | Sale date/time |

### 9.6 sale_items
| Field | Type | Description |
|---|---|---|
| id | INTEGER PK | Sale item ID |
| sale_id | INTEGER FK → sales.id | Related sale |
| product_id | INTEGER FK → products.id | Product sold |
| quantity | INTEGER NOT NULL CHECK(quantity > 0) | Quantity sold |
| price | REAL NOT NULL CHECK(price >= 0) | Selling price at time of sale |
| subtotal | REAL NOT NULL | quantity × price |

### 9.7 stock_movements *(new)*
Records every change to a product's quantity, so current stock is always auditable.

| Field | Type | Description |
|---|---|---|
| id | INTEGER PK | Movement ID |
| product_id | INTEGER FK → products.id | Affected product |
| type | TEXT NOT NULL CHECK(type IN ('restock','sale','adjustment')) | Reason for change |
| quantity_change | INTEGER NOT NULL | Positive or negative delta |
| quantity_after | INTEGER NOT NULL | Resulting stock level |
| reference_id | INTEGER | e.g. related sale_id, nullable |
| note | TEXT | Optional reason (e.g. "damaged in transit") |
| created_by | INTEGER FK → users.id | Who made the change |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | When |

### 9.8 activity_logs *(new)*
Lightweight audit log for accountability (who created/edited/deleted what).

| Field | Type | Description |
|---|---|---|
| id | INTEGER PK | Log ID |
| user_id | INTEGER FK → users.id | Actor |
| action | TEXT NOT NULL | e.g. "PRODUCT_CREATE", "CATEGORY_DELETE" |
| entity_type | TEXT | "product", "category", "supplier", etc. |
| entity_id | INTEGER | Affected record ID |
| details | TEXT | Optional JSON snippet of what changed |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | When |

### 9.9 settings *(new)*
Replaces the static `config.json` for values the Admin edits at runtime via the Settings page.

| Field | Type | Description |
|---|---|---|
| key | TEXT PK | Setting key, e.g. `app_name`, `currency`, `default_minimum_stock`, `items_per_page` |
| value | TEXT | Setting value (stored as text, parsed by type) |
| updated_at | DATETIME DEFAULT CURRENT_TIMESTAMP | Last change |

`config.json` remains for **deployment-level** settings only (port, database path, session secret reference) — never for values the UI lets an Admin change, to avoid the two sources of truth drifting apart.

---

## 10. Database Relationships

```text
USERS
  │
  │ creates
  ▼
SALES ─────────► STOCK_MOVEMENTS (reference_id)
  │
  │ contains
  ▼
SALE_ITEMS
  │
  │ references
  ▼
PRODUCTS ──────► STOCK_MOVEMENTS (product_id)
  │
  ├──────────────► CATEGORIES
  │
  └──────────────► SUPPLIERS

USERS ─────────► ACTIVITY_LOGS
```

### Relationship Summary
```text
Category 1 ──────── * Products
Supplier 1 ──────── * Products
User 1 ──────────── * Sales
User 1 ──────────── * Stock Movements
User 1 ──────────── * Activity Logs
Sale 1 ──────────── * Sale Items
Product 1 ───────── * Sale Items
Product 1 ───────── * Stock Movements
```

---

## 11. Authentication & Authorization System

### 11.1 Login Flow
```text
Login Page
    │
    ▼
Username + Password
    │
    ▼
Rate-limit check (max attempts per IP/username)
    │
    ├── Too many attempts ──► Temporary lockout message
    │
    ▼
Validate Credentials
    │
    ├── Invalid ──► Generic "Invalid username or password" (no user enumeration)
    │
    ▼
Password Hash Verification (bcrypt)
    │
    ▼
Check account is_active
    │
    ▼
Create Session + CSRF token
    │
    ▼
Dashboard (role-appropriate view)
```

### 11.2 Requirements
- Username/password authentication.
- Passwords stored using bcrypt hashing (cost factor ≥ 10).
- Session-based authentication with `httpOnly`, `secure` (in production), `sameSite=strict` cookies.
- **Rate limiting** on the login endpoint to slow down brute-force attempts.
- **Role-based authorization middleware**: routes/actions restricted by `admin`/`staff` as defined in §3.1.
- CSRF protection on all state-changing requests (POST/PUT/DELETE).
- Unauthorized users cannot access admin pages or protected APIs (redirect to login / 401 JSON response).
- Logout functionality that destroys the server-side session.
- Session expiration/timeout after a configurable period of inactivity.
- All login attempts (success/failure) are written to `activity_logs`.

### 11.3 Public Access
There is no public-facing product website. All inventory operations require authentication.

---

## 12. Dashboard System

A single **Inventory & Sales Dashboard** with two logical areas, rather than several separate dashboards:

```text
MAIN DASHBOARD
│
├── Inventory Overview
│
└── Sales Overview
```

---

## 13. Inventory Dashboard

**Summary Cards:** Total Products · Total Stock · Low Stock · Out of Stock

**Additional Information:**
- Recently added products.
- Recently updated products.
- Recent stock movements (last N entries from `stock_movements`), giving visibility that a plain "current quantity" view can't.

---

## 14. Sales Dashboard

**Summary:** Today's sales · Total sales · Number of transactions · Average sale value

**Charts (Chart.js, kept simple and readable):**
- Sales by day.
- Sales by month.
- Top-selling products.

---

## 15. Dashboard API

```text
GET /api/dashboard
```

```json
{
  "totalProducts": 125,
  "totalStock": 2450,
  "lowStock": 12,
  "outOfStock": 4,
  "todaySales": 12500,
  "totalSales": 485000,
  "totalTransactions": 325
}
```

```text
GET /api/dashboard/sales?range=week|month
GET /api/dashboard/top-products?limit=5
GET /api/dashboard/recent-movements?limit=10
```

---

## 16. Product Management

The Products module is the core of the IMS.

| Product | Category | Price | Stock | Status | Actions |
|---|---|---|---|---|---|
| Parle-G | Groceries | ₹10 | 50 | In Stock | Edit / Deactivate |
| Tata Salt | Groceries | ₹30 | 5 | Low Stock | Edit / Deactivate |
| Rice | Groceries | ₹60 | 0 | Out of Stock | Edit / Deactivate |

(Note: "Delete" is renamed **Deactivate** in the UI to reflect the soft-delete model in §26/§42.)

---

## 17. Product Features

Admin (and Staff, view-only where noted) can:
- Add product *(Admin)*
- Edit product *(Admin)*
- Deactivate/reactivate product *(Admin)*
- View product *(Admin, Staff)*
- Search product *(Admin, Staff)*
- Filter by category / stock status *(Admin, Staff)*
- Sort products (by name, stock, price, updated date)
- Upload optional product image

**Search** works against: product name, SKU, category name.

---

## 18. Add Product

Form fields:
```text
Product Name *
Category *
Supplier
SKU *
Selling Price *
Cost Price
Initial Quantity *
Minimum Stock Level *
Unit
Product Image
```

**Validation rules:**
- Name: required, 2–120 characters.
- SKU: required, unique, alphanumeric (case-insensitive uniqueness check).
- Selling Price: required, numeric, ≥ 0.
- Cost Price: optional, numeric, ≥ 0 if provided.
- Initial Quantity: required, integer, ≥ 0.
- Minimum Stock: required, integer, ≥ 0.

Creating a product with a non-zero initial quantity also writes an initial `stock_movements` row of type `restock` so the ledger starts consistent with the product's stated quantity.

---

## 19. Product Stock Status

Automatically determined, never manually set:

```text
In Stock:      quantity > minimum_stock
Low Stock:     quantity > 0 AND quantity <= minimum_stock
Out of Stock:  quantity = 0
```

Status must be shown with **text/icon, not color alone** (accessibility requirement — see §31).

---

## 20. Stock Management

Three operations now exist (one more than the original draft):

```text
ADD STOCK (restock)
REMOVE STOCK THROUGH SALE
ADJUST STOCK (correction: damage, loss, recount)
```

Every one of these creates a row in `stock_movements`.

---

## 21. Add Stock Workflow

```text
Select Product
       │
       ▼
Enter Quantity (+ optional note, e.g. supplier/invoice ref)
       │
       ▼
Validate Quantity (> 0)
       │
       ▼
BEGIN TRANSACTION
  Update Product Quantity (old + added)
  Insert stock_movements row (type = 'restock')
COMMIT
       │
       ▼
Display Updated Stock
```

**Example:** Current Stock 40, Added 25 → New Stock 65.

### 21.1 Stock Adjustment Workflow *(new)*
For cases the original PRD had no path for — damaged goods, theft, or a physical recount that disagrees with the system:

```text
Select Product
       │
       ▼
Enter Adjustment (+/-) and a required reason/note
       │
       ▼
Validate: resulting quantity must be >= 0
       │
       ▼
BEGIN TRANSACTION
  Update Product Quantity
  Insert stock_movements row (type = 'adjustment', note required)
COMMIT
```

This closes a real-world gap: without it, staff would be tempted to "edit" the quantity directly, silently destroying the audit trail.

---

## 22. Sales Management

Create Sale flow:
1. Select a product.
2. Enter quantity.
3. Add the product to the cart.
4. Add additional products.
5. View subtotal per line and running total.
6. Confirm sale.

```text
Product         Qty     Price      Total
Parle-G          5       ₹10        ₹50
Tata Salt        2       ₹30        ₹60
Rice             3       ₹60        ₹180
------------------------------------------
Total                         ₹290
```

---

## 23. Automatic Stock Reduction

```text
Customer Sale
      │
      ▼
Check Product Stock (re-checked inside the transaction, not just at cart time)
      │
      ├── Insufficient Stock ──► Show Error, abort before any write
      │
      ▼
Create Sale
      │
      ▼
Create Sale Items
      │
      ▼
Reduce Product Quantity + Insert stock_movements row (type = 'sale')
      │
      ▼
Calculate Total
      │
      ▼
Sale Completed
```

**Example:** Stock 50, customer buys 7 → Stock 43.

The system must prevent a sale when the requested quantity exceeds available stock — **checked at commit time**, not only when the item is added to the cart, to avoid stale-data errors.

---

## 24. Sale Transaction Safety & Concurrency

The sale operation is a single database transaction:

```text
BEGIN TRANSACTION
  For each cart item:
    SELECT quantity FROM products WHERE id = ? (read current value inside the transaction)
    IF requested_quantity > current_quantity → ROLLBACK, return error
  Create Sale
  Create Sale Items
  Update Product Stock for each item
  Insert stock_movements rows
COMMIT
```

If any error occurs at any step: **ROLLBACK** — this prevents partially completed sales from corrupting inventory data.

**Concurrency note:** because `better-sqlite3` executes synchronously and SQLite serializes writers, wrapping the whole multi-item sale in one transaction is sufficient to prevent two simultaneous sales from both approving a purchase that oversells the same product — a race condition the original PRD didn't address.

---

## 25. Sales History

| Sale ID | Date | Items | Total | Created By | Action |
|---|---|---|---|---|---|
| #1005 | 26 Sep | 4 | ₹750 | Admin | View |
| #1004 | 26 Sep | 2 | ₹320 | Admin | View |
| #1003 | 25 Sep | 5 | ₹1,250 | Admin | View |

The administrator can open a sale to view full details, including which stock_movements it generated. Sales history supports date-range filtering and CSV export (see §28).

---

## 26. Categories Management

Admin can: Add · Edit · Deactivate · View · Search category.

**Delete Protection:** A category cannot be deactivated/deleted while active products reference it:
```text
This category contains products.
Please reassign or deactivate those products before removing this category.
```

---

## 27. Supplier Management

Admin can: Add · Edit · Deactivate · View · Search supplier.

**Delete Protection** *(new — the original PRD only protected categories, leaving suppliers inconsistent):*
```text
This supplier is linked to existing products.
Please reassign those products to another supplier before removing this supplier.
```

Supplier management stays intentionally simple: no purchase orders, invoices, payment tracking, or ratings in v1 (future enhancement candidates).

---

## 28. Reports

**Inventory Report:** product name, category, current stock, minimum stock, stock status.

**Sales Report:** sale ID, date, number of items, total amount.

**Stock Movement Report** *(new)*: product, movement type, quantity change, resulting quantity, user, timestamp — the audit view that makes the ledger useful, not just stored.

**Top Products:** ranked by units sold.
```text
1. Parle-G        245 units
2. Tata Salt      190 units
3. Rice           165 units
4. Tea            130 units
```

All reports support date filtering, category filtering, search, and a simple table display. **CSV export** is available for each report so data can be taken into a spreadsheet — a lightweight addition that meaningfully increases real-world usefulness without adding architectural complexity.

---

## 29. Product Details

```text
Product
--------------------------------
Parle-G Biscuits

Category: Biscuits
SKU: PARLE001

Selling Price: ₹10
Cost Price: ₹8

Current Stock: 75
Minimum Stock: 20
Status: In Stock

Supplier: ABC Distributors

Total Units Sold: 245
Total Sales Value: ₹2,450
Recent Stock Movements: [last 5 entries]
```

---

## 30. Navigation Structure

```text
Dashboard
Products
Categories
Suppliers
Sales
Stock
Reports
Settings
Logout
```

Navigation adapts to role: Staff accounts do not see Settings or user-management links.

---

## 31. UI/UX Requirements

- Clean, professional, minimal, responsive, easy to understand, fast to load.
- No gradients, no excessive animations, no unnecessary decorative cards.
- Clear typography hierarchy and consistent spacing.
- Clear form labels and inline validation messages.
- Proper empty states (e.g., "No products yet — add your first product").
- **Confirmation dialogs for destructive/state-changing operations** (deactivate, void a sale, large stock adjustments).
- Responsive tables (horizontal scroll or card conversion on small screens).
- Mobile-friendly buttons and touch targets (min 44×44px).
- Clear success/error notifications.
- Stock status shown with icon + text, not color alone (accessibility).

---

## 32. Icon Requirements

Lucide Icons, no emojis as interface icons:

```text
Dashboard → LayoutDashboard   Products → Package    Categories → Tags
Suppliers → Truck             Sales → ShoppingCart   Stock → Boxes
Reports → BarChart3           Settings → Settings    Search → Search
Add → Plus                    Edit → Pencil          Delete → Trash2
Logout → LogOut
```

---

## 33. Responsive Design

**Desktop:** sidebar + main content area.
**Tablet:** sidebar collapses into a compact/icon navigation.
**Mobile:** hamburger menu, stacked summary cards, tables become horizontally scrollable or convert into responsive cards.

---

## 34. REST API Design

All list endpoints support standardized query parameters: `?page=1&limit=20&sortBy=name&sortDir=asc&search=...`

### Authentication
```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Products
```text
GET    /api/products?category=&status=&search=&page=&limit=&sortBy=
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id      (soft-delete → sets is_active = 0)
```

### Categories
```text
GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id    (blocked if active products reference it)
```

### Suppliers
```text
GET    /api/suppliers
GET    /api/suppliers/:id
POST   /api/suppliers
PUT    /api/suppliers/:id
DELETE /api/suppliers/:id     (blocked if active products reference it)
```

### Stock
```text
POST /api/stock/add
POST /api/stock/adjust
GET  /api/stock/movements?productId=&type=&from=&to=
GET  /api/stock/low
GET  /api/stock/out
```

### Sales
```text
GET  /api/sales?from=&to=&page=&limit=
GET  /api/sales/:id
POST /api/sales
```

### Dashboard
```text
GET /api/dashboard
GET /api/dashboard/sales
GET /api/dashboard/top-products
GET /api/dashboard/recent-movements
```

### Settings *(new)*
```text
GET /api/settings
PUT /api/settings          (Admin only)
```

### Reports *(new)*
```text
GET /api/reports/inventory?format=json|csv
GET /api/reports/sales?from=&to=&format=json|csv
GET /api/reports/top-products?limit=&format=json|csv
```

### 34.1 Standardized Error Response Format *(new)*
Every API error returns a consistent shape so the frontend can handle errors generically:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock available for this product."
  }
}
```

---

## 35. Example Sale API Request

```json
{
  "items": [
    { "productId": 1, "quantity": 5 },
    { "productId": 4, "quantity": 2 }
  ]
}
```

The server will:
1. Validate products exist and are active.
2. Check stock (inside the transaction).
3. Calculate totals.
4. Create the sale.
5. Create sale items.
6. Reduce inventory and write stock_movements rows.
7. Commit the transaction.
8. Log the action to activity_logs.
9. Return the completed sale.

---

## 36. Configuration

`config.json` — **deployment-level, non-secret** settings only:
```json
{
  "app": { "name": "Inventory Management System", "port": 5000, "itemsPerPage": 20 },
  "database": { "path": "./database/database.sqlite" },
  "storage": { "productImages": "./storage/product-images" }
}
```

`.env` — **secrets**, never committed to source control:
```text
SESSION_SECRET=change_this_in_production
NODE_ENV=development
```

Runtime, Admin-editable values (currency, default minimum stock, items per page, application display name) live in the **`settings` table** (§9.9), not in `config.json`, so the Settings page in the UI actually persists what it edits.

No advertising or monetization configuration exists or is planned.

---

## 37. File Upload

Product images are optional, stored locally under `/storage/product-images/`.

**Allowed formats:** `.jpg`, `.jpeg`, `.png`, `.webp`

**Server-side validation:**
- File extension **and** actual MIME type (don't trust the client-reported type alone).
- Maximum file size (e.g. 2 MB).
- Filenames are sanitized/regenerated server-side (e.g. UUID-based) to prevent path traversal or overwrite attacks.
- Executable files, scripts, or SVGs with embedded scripts must never be accepted.

---

## 38. Security Requirements

**Authentication & Session**
- Bcrypt password hashing.
- Session-based auth with secure cookie flags.
- Rate limiting on login (and other sensitive endpoints).
- Session timeout after inactivity.
- Logout support.

**Authorization**
- Role-based middleware on every protected route (§3.1, §11).
- Users without a valid, active session cannot access protected APIs.

**Request Integrity**
- CSRF protection on all state-changing (POST/PUT/DELETE) requests.
- `helmet` for standard security headers (X-Content-Type-Options, X-Frame-Options, etc.).

**Input Validation**
Validate on the server (never trust client-side validation alone): product names, prices, quantities, SKU format/uniqueness, category IDs, supplier IDs, sale quantities, adjustment reasons.

**Database Security**
Parameterized queries only (no string-concatenated SQL) to prevent SQL injection — `better-sqlite3`'s prepared statements handle this natively.

**File Security**
Only permitted image formats accepted, validated by extension + MIME type + size, with sanitized filenames.

**Secrets Management**
Session secret and any credentials live in `.env`, excluded via `.gitignore`; `config.json` never contains secrets.

**Transport**
In production, the app should be served over HTTPS (via reverse proxy or hosting provider), with `secure` cookies enabled accordingly.

---

## 39. Error Handling

| Scenario | Message |
|---|---|
| Invalid Login | Invalid username or password. |
| Too Many Login Attempts | Too many attempts. Please try again in a few minutes. |
| Product Not Found | Product not found. |
| Insufficient Stock | Insufficient stock available for this product. |
| Duplicate SKU | A product with this SKU already exists. |
| Invalid Quantity | Quantity must be greater than zero. |
| Category Delete Blocked | This category cannot be removed because products are assigned to it. |
| Supplier Delete Blocked | This supplier cannot be removed because products are assigned to it. |
| Negative Stock Attempt | This action would reduce stock below zero. |

A centralized `errorHandler` middleware ensures every error, including unexpected server errors, returns the standardized JSON shape from §34.1 and is logged server-side without leaking stack traces to the client in production.

---

## 40. Success Notifications

Displayed after successful operations (auto-dismiss after a few seconds):
```text
Product added successfully.
Product updated successfully.
Product deactivated successfully.
Stock updated successfully.
Stock adjustment recorded successfully.
Sale completed successfully.
Category created successfully.
Settings updated successfully.
```

---

## 41. Dashboard Calculations

Computed from the database, not stored redundantly:

```sql
-- Total Products
SELECT COUNT(*) FROM products WHERE is_active = 1;

-- Total Stock
SELECT SUM(quantity) FROM products WHERE is_active = 1;

-- Low Stock
SELECT COUNT(*) FROM products WHERE is_active = 1 AND quantity > 0 AND quantity <= minimum_stock;

-- Out of Stock
SELECT COUNT(*) FROM products WHERE is_active = 1 AND quantity = 0;

-- Total Sales
SELECT SUM(total_amount) FROM sales WHERE status = 'completed';

-- Number of Sales
SELECT COUNT(*) FROM sales WHERE status = 'completed';

-- Top Products
SELECT product_id, SUM(quantity) FROM sale_items GROUP BY product_id ORDER BY SUM(quantity) DESC;
```

---

## 42. Stock Integrity Rules

1. **Stock cannot become negative:** `quantity >= 0` (enforced by a `CHECK` constraint at the schema level, not just application logic).
2. **A sale cannot exceed available stock:** `requested_quantity <= available_quantity`, re-verified inside the transaction at commit time.
3. **Adding stock increases quantity:** `new_quantity = old_quantity + added_quantity`, and is written to `stock_movements`.
4. **Selling stock decreases quantity:** `new_quantity = old_quantity - sold_quantity`, and is written to `stock_movements`.
5. **Adjustments require a reason** and are written to `stock_movements` with type `adjustment`.
6. **Every quantity change must be traceable** to a `stock_movements` row — direct, un-logged edits to `products.quantity` are not permitted anywhere in the application layer.
7. **Deleting a product with sales history is not permitted.** Products are **soft-deleted** (`is_active = 0`) instead of removed from the table, so historical sales and stock movements always resolve to a valid product record. This is the recommended approach for v1 (rather than leaving deletion as an either/or choice), since soft-delete cleanly supports both "hide inactive products" and "preserve history" without extra logic.

---

## 43. Admin Workflow

```text
Login
  │
  ▼
Dashboard
  │
  ├── Add Categories
  ├── Add Suppliers
  ├── Add Products
  ├── Add Initial Stock
  ▼
Inventory Available
  │
  ▼
Customer Purchases Product
  │
  ▼
Create Sale
  │
  ▼
Stock Automatically Reduced (+ movement logged)
  │
  ▼
Dashboard Updated
  │
  ▼
Low Stock Alert if Required
  │
  ▼
Restock or Adjust as Needed
```

---

## 44. Complete Example Workflow

```text
Product: Coca Cola 500ml
Initial Stock: 100
Selling Price: ₹40
Minimum Stock: 20

quantity = 100   (movement: restock +100)

Customer buys 15 → 100 - 15 = 85   (movement: sale -15)
Customer buys 70 → 85 - 70 = 15    (movement: sale -70)

15 <= minimum_stock (20) → status = LOW STOCK
Dashboard now lists the product under Low Stock.

Store adds 50 new units → 15 + 50 = 65   (movement: restock +50)
Status returns to IN STOCK.

A recount finds 2 units damaged → 65 - 2 = 63   (movement: adjustment -2, note: "damaged")
```

This demonstrates the complete, fully auditable inventory lifecycle.

---

## 45. Settings

Stored in the `settings` table (§9.9) and editable via the Settings page (Admin only):

```text
Application Name        → My Inventory System
Currency                → INR (₹)
Default Minimum Stock   → 10
Products Per Page       → 20
Session Timeout (mins)  → 30
```

---

## 46. No Advertisement / Monetization System

The application intentionally contains **no ads, popunders, smartlinks, social bars, banner/native ads, or monetization tracking of any kind.** It is a management tool, not a public software-download website.

---

## 47. Performance Requirements

- Load dashboard data quickly using indexed queries (indexes on `products.sku`, `products.category_id`, `sales.created_at`, `stock_movements.product_id`).
- Avoid unnecessary database round-trips (batch reads where possible).
- Load JavaScript only where required per page.
- Optimize/limit product image size on upload.
- Use pagination for all list endpoints and large tables.
- Avoid heavy frontend frameworks.
- Remain usable with several thousand product records and tens of thousands of sale/movement records.

---

## 48. Backup Considerations

SQLite is file-based; the primary database is `database/database.sqlite`.

```text
database.sqlite → backup/ → database_backup_YYYY_MM_DD.sqlite
```

A simple scheduled copy (cron job or manual) is sufficient for v1. A dedicated automated cloud backup system is out of scope for the initial version but is listed as a future enhancement (§56).

---

## 49. Deployment

```bash
npm install
npm start
```

`package.json`:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  }
}
```

A `.env.example` file should be committed (with placeholder values) so the required environment variables are documented without exposing real secrets.

---

## 50. Local Development

```text
1. Install Node.js
2. Clone/create project folder
3. Copy .env.example to .env and set values
4. Install npm dependencies
5. Create SQLite database
6. Run schema.sql
7. Run seed.sql
8. Start Express server
9. Open browser at http://localhost:5000
10. Login with seeded Admin account
11. Test dashboard
```

---

## 51. Required NPM Packages

**Core:**
```text
express
better-sqlite3
bcrypt
express-session
multer
cors
dotenv
```

**Security additions** *(new)*:
```text
helmet
express-rate-limit
csurf (or an equivalent CSRF strategy)
```

**Frontend:** Chart.js, Lucide Icons.

The project should avoid unnecessary packages beyond these.

---

## 52. Seed Data

**Categories:** Groceries, Beverages, Stationery, Electronics, Personal Care, Cleaning
**Suppliers:** ABC Distributors, Maharashtra Wholesale, City Suppliers, Global Traders
**Products:** Parle-G, Tata Salt, Coca Cola, Aashirvaad Atta, Lux Soap, Notebook, Ball Pen

A demo Admin account is included via seed data, but its password is generated/hashed at seed time (e.g., from an environment variable or a documented default that must be changed on first login) — it must **never** be committed as plain text in `seed.sql`.

Initial product quantities in seed data should also create matching `stock_movements` rows so the ledger is consistent from first run.

---

## 53. Testing Requirements

**Authentication:** valid/invalid login, logout, protected pages/APIs, rate-limit lockout, session expiry.

**Products:** add, edit, deactivate, search, filter, duplicate SKU validation, reactivation.

**Categories:** add, edit, deactivate, prevent deactivation when active products exist.

**Suppliers:** add, edit, deactivate, prevent deactivation when active products exist.

**Stock:** add stock, verify quantity increase + movement log, adjust stock (+/-) with reason, prevent negative quantity, low-stock detection, out-of-stock detection.

**Sales:** create sale, verify stock reduction + movement log, prevent insufficient-stock sale, prevent overselling under concurrent requests, calculate totals correctly, store sale history.

**Settings:** update settings, verify persistence across restart, non-Admin cannot access.

**Dashboard:** product count, stock count, low/out-of-stock counts, sales total, transaction count, top-selling products.

**Security:** CSRF token required on mutating requests, SQL injection attempts rejected, invalid file uploads rejected.

---

## 54. Minimum Viable Product (MVP)

**Authentication:** Login, logout, protected dashboard, role check (Admin/Staff).

**Dashboard:** Total products, total stock, low-stock, out-of-stock, today's sales, total sales.

**Products:** Add, edit, deactivate, view, search, filter.

**Categories:** Add, edit, deactivate, view.

**Suppliers:** Add, edit, deactivate, view.

**Stock:** Add stock, adjust stock, automatic stock calculation with movement logging, low/out-of-stock detection.

**Sales:** Create sale, multiple products per sale, automatic stock reduction, sales history.

**Reports:** Inventory report, sales report, top-selling products.

**Settings:** Basic app settings, persisted in the database.

---

## 55. Features Explicitly Out of Scope (v1)

- Public customer accounts, customer management.
- Online payments, online ordering, customer-facing shopping cart, e-commerce storefront.
- Product reviews/ratings.
- Complex purchase orders, supplier payment management.
- Employee payroll.
- GST/tax accounting system.
- Barcode/RFID hardware integration.
- AI forecasting.
- Multi-warehouse or multi-store management.
- Fine-grained/custom role permission systems beyond Admin/Staff.
- Cloud synchronization, automated cloud backups.
- Mobile application.
- Email/SMS notifications.
- Sale refunds/returns (a `status = 'voided'` flag exists in the schema for future use, but full return-processing workflows are out of scope for v1).
- Advertisement/monetization systems.

---

## 56. Future Enhancements

**Inventory:** Barcode scanning, multiple warehouses, automatic reorder suggestions.

**Sales:** Customer management, invoice generation/printable receipts, GST calculation, sale returns/refund workflow using the existing `voided` status.

**Analytics:** Monthly revenue reports, profit analysis, sales/inventory forecasting.

**Security:** Fully custom role/permission management, two-factor authentication, exportable audit-log viewer.

**Technology:** Progressive Web App, cloud database option, mobile application, automated off-site backups.

---

## 57. Success Criteria

**Authentication:** Secure login; unauthorized users blocked from protected pages/APIs; logout works; brute-force attempts are throttled.

**Inventory:** Products created/managed; stock increases and decreases correctly and is fully traceable via `stock_movements`; negative stock is impossible at the database level; low/out-of-stock detected automatically.

**Sales:** Multi-product sales created correctly; totals calculated correctly; concurrent sales cannot oversell a product; sale data persists; stock updates automatically.

**Dashboard:** Inventory and sales statistics displayed accurately; low-stock products visible; top-selling products identifiable.

**Database:** Data persists after restart; relationships and constraints (FK, CHECK, UNIQUE) are enforced by the schema, not just application code; SQLite is the only required database server.

**Security:** Secrets are not in source control; CSRF and rate-limiting protections are active; all inputs are validated server-side.

**UI:** Responsive across desktop/tablet/mobile; clean and professional; CRUD operations are easy to understand and demonstrate; no advertisements or monetization elements exist.

---

## 58. Final System Overview

```text
                         INVENTORY MANAGEMENT SYSTEM
                                    │
                                    ▼
                              LOGIN SYSTEM (role-aware)
                                    │
                                    ▼
                               DASHBOARD
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
             PRODUCTS           CATEGORIES         SUPPLIERS
                 │                  │                  │
                 └──────────────────┼──────────────────┘
                                    │
                                    ▼
                              STOCK MANAGEMENT
                                    │
                 ┌──────────────────┼──────────────────┐
                 ▼                  ▼                  ▼
             ADD STOCK          ADJUST STOCK         SALES
                 │                  │                  │
                 │                  │                  ▼
                 │                  │            SALE ITEMS
                 │                  │                  │
                 │                  │                  ▼
                 │                  │         AUTOMATIC STOCK
                 │                  │             REDUCTION
                 └──────────────────┴──────────────────┘
                                    │
                                    ▼
                         STOCK MOVEMENT LEDGER
                                    │
                                    ▼
                          ACTIVITY LOG (audit)
                                    │
                                    ▼
                               REPORTS
                                    │
                                    ▼
                      INVENTORY + SALES ANALYTICS
```

**Core concept:**
```text
PRODUCT → STOCK CHANGE (restock / sale / adjustment)
        → LOGGED IN stock_movements
        → PRODUCT QUANTITY UPDATED
        → DASHBOARD UPDATED
        → ACTION RECORDED IN activity_logs
```

---

## 59. Open Questions / Assumptions

- **Currency:** Assumed single-currency (INR default), configurable via Settings; multi-currency is out of scope.
- **Staff role scope:** This PRD assumes Staff can create sales and add stock but not delete/deactivate records or edit settings. Confirm this matches the business's actual needs before implementation.
- **Sale voiding:** The schema reserves a `voided` status for sales, but the workflow for voiding (and whether it should reverse `stock_movements`) is not fully specified in v1 and should be confirmed if needed before launch.
- **Backup schedule:** Manual/cron-based file copy is assumed sufficient for v1; confirm no regulatory requirement demands more frequent or off-site backups.

---

## 60. Change Log

| Version | Date | Summary |
|---|---|---|
| 1.0 | — | Original draft |
| 2.0 | 26 Sep 2026 | Added stock movement ledger, activity log, DB-backed settings, soft-delete model, supplier delete protection, concurrency handling, CSRF/rate-limiting/security-header requirements, standardized API pagination/filtering/error format, CSV report export, role permission detail, open questions section |
