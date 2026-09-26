-- ============================================
-- Inventory Management System — Database Schema
-- Version 2.0 | 9 Tables
-- ============================================

-- Enable foreign key enforcement
PRAGMA foreign_keys = ON;

-- ============================================
-- 1. USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    username    TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role        TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    user_id     INTEGER,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- 3. SUPPLIERS
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    address     TEXT,
    user_id     INTEGER,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- 4. PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    category_id     INTEGER NOT NULL,
    supplier_id     INTEGER,
    sku             TEXT NOT NULL,
    price           REAL NOT NULL CHECK(price >= 0),
    cost_price      REAL CHECK(cost_price >= 0),
    quantity         INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    minimum_stock   INTEGER NOT NULL DEFAULT 10 CHECK(minimum_stock >= 0),
    unit            TEXT DEFAULT 'piece',
    image           TEXT,
    user_id         INTEGER DEFAULT 1,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- 5. SALES
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    total_amount    REAL NOT NULL CHECK(total_amount >= 0),
    status          TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'voided')),
    created_by      INTEGER NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- 6. SALE ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS sale_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id     INTEGER NOT NULL,
    product_id  INTEGER NOT NULL,
    quantity    INTEGER NOT NULL CHECK(quantity > 0),
    price       REAL NOT NULL CHECK(price >= 0),
    subtotal    REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============================================
-- 7. STOCK MOVEMENTS (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id      INTEGER NOT NULL,
    type            TEXT NOT NULL CHECK(type IN ('restock', 'sale', 'adjustment')),
    quantity_change  INTEGER NOT NULL,
    quantity_after   INTEGER NOT NULL,
    reference_id    INTEGER,
    note            TEXT,
    created_by      INTEGER NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- 8. ACTIVITY LOGS (Who did what, when)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,
    action      TEXT NOT NULL,
    entity_type TEXT,
    entity_id   INTEGER,
    details     TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- 9. SETTINGS (Runtime-editable)
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES for performance (§47)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
