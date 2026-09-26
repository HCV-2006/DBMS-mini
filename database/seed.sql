-- ============================================
-- Inventory Management System — Seed Data
-- ============================================

-- Default Admin account
-- Password: admin123 (bcryptjs hash)
INSERT OR IGNORE INTO users (name, username, password_hash, role, is_active)
VALUES ('Administrator', 'admin', '$2a$10$oYM.HRG/yvS7R3QTecOv4ei4GIvBkVZjGqGTSwBt07uLV9SwABfcm', 'admin', 1);

-- Categories
INSERT OR IGNORE INTO categories (name) VALUES ('Groceries');
INSERT OR IGNORE INTO categories (name) VALUES ('Beverages');
INSERT OR IGNORE INTO categories (name) VALUES ('Stationery');
INSERT OR IGNORE INTO categories (name) VALUES ('Electronics');
INSERT OR IGNORE INTO categories (name) VALUES ('Personal Care');
INSERT OR IGNORE INTO categories (name) VALUES ('Cleaning');

-- Suppliers
INSERT OR IGNORE INTO suppliers (name, phone, email, address) VALUES ('ABC Distributors', '9876543210', 'abc@distributors.com', 'Mumbai, Maharashtra');
INSERT OR IGNORE INTO suppliers (name, phone, email, address) VALUES ('Maharashtra Wholesale', '9876543211', 'info@mhwholesale.com', 'Pune, Maharashtra');
INSERT OR IGNORE INTO suppliers (name, phone, email, address) VALUES ('City Suppliers', '9876543212', 'contact@citysuppliers.com', 'Delhi, India');
INSERT OR IGNORE INTO suppliers (name, phone, email, address) VALUES ('Global Traders', '9876543213', 'sales@globaltraders.com', 'Bangalore, Karnataka');

-- Products
INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit)
VALUES ('Parle-G Biscuits', 1, 1, 'PARLE001', 10, 8, 50, 20, 'packet');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit)
VALUES ('Tata Salt', 1, 2, 'TATA001', 30, 25, 5, 10, 'kg');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit)
VALUES ('Coca Cola 500ml', 2, 3, 'COKE001', 40, 32, 100, 20, 'bottle');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit)
VALUES ('Aashirvaad Atta 5kg', 1, 1, 'AASH001', 280, 240, 30, 10, 'bag');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit)
VALUES ('Lux Soap', 5, 4, 'LUX001', 45, 38, 80, 15, 'piece');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit)
VALUES ('Notebook 200 Pages', 3, 3, 'NOTE001', 60, 45, 0, 10, 'piece');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit)
VALUES ('Ball Pen (Blue)', 3, 3, 'PEN001', 10, 6, 200, 50, 'piece');

-- Initial stock movements for seed products (ledger consistency §52)
INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by)
VALUES (1, 'restock', 50, 50, 'Initial stock', 1);

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by)
VALUES (2, 'restock', 5, 5, 'Initial stock', 1);

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by)
VALUES (3, 'restock', 100, 100, 'Initial stock', 1);

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by)
VALUES (4, 'restock', 30, 30, 'Initial stock', 1);

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by)
VALUES (5, 'restock', 80, 80, 'Initial stock', 1);

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by)
VALUES (6, 'restock', 0, 0, 'Initial stock - none', 1);

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by)
VALUES (7, 'restock', 200, 200, 'Initial stock', 1);

-- Default Settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('app_name', 'Stocker');
INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', '₹');
INSERT OR IGNORE INTO settings (key, value) VALUES ('currency_code', 'INR');
INSERT OR IGNORE INTO settings (key, value) VALUES ('default_minimum_stock', '10');
INSERT OR IGNORE INTO settings (key, value) VALUES ('items_per_page', '20');
INSERT OR IGNORE INTO settings (key, value) VALUES ('session_timeout', '30');
