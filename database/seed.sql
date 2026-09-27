-- ============================================
-- Inventory Management System — Seed Data
-- ============================================

-- Default Admin account
-- Password: admin123 (bcryptjs hash)
INSERT OR IGNORE INTO users (id, name, username, password_hash, role, is_active)
VALUES (1, 'Administrator', 'admin', '$2a$10$oYM.HRG/yvS7R3QTecOv4ei4GIvBkVZjGqGTSwBt07uLV9SwABfcm', 'admin', 1);

-- Default Admin Categories
INSERT OR IGNORE INTO categories (name, user_id) VALUES ('Groceries', 1);
INSERT OR IGNORE INTO categories (name, user_id) VALUES ('Beverages', 1);
INSERT OR IGNORE INTO categories (name, user_id) VALUES ('Stationery', 1);
INSERT OR IGNORE INTO categories (name, user_id) VALUES ('Electronics', 1);
INSERT OR IGNORE INTO categories (name, user_id) VALUES ('Personal Care', 1);
INSERT OR IGNORE INTO categories (name, user_id) VALUES ('Cleaning', 1);

-- Default Admin Suppliers
INSERT OR IGNORE INTO suppliers (name, phone, email, address, user_id) VALUES ('ABC Distributors', '9876543210', 'abc@distributors.com', 'Mumbai, Maharashtra', 1);
INSERT OR IGNORE INTO suppliers (name, phone, email, address, user_id) VALUES ('Maharashtra Wholesale', '9876543211', 'info@mhwholesale.com', 'Pune, Maharashtra', 1);
INSERT OR IGNORE INTO suppliers (name, phone, email, address, user_id) VALUES ('City Suppliers', '9876543212', 'contact@citysuppliers.com', 'Delhi, India', 1);
INSERT OR IGNORE INTO suppliers (name, phone, email, address, user_id) VALUES ('Global Traders', '9876543213', 'sales@globaltraders.com', 'Bangalore, Karnataka', 1);

-- Default Admin Products
INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id)
VALUES ('Parle-G Biscuits', 1, 1, 'PARLE001', 10, 8, 50, 20, 'packet', 1);

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id)
VALUES ('Tata Salt', 1, 2, 'TATA001', 30, 25, 5, 10, 'kg', 1);

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id)
VALUES ('Coca Cola 500ml', 2, 3, 'COKE001', 40, 32, 100, 20, 'bottle', 1);

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id)
VALUES ('Aashirvaad Atta 5kg', 1, 1, 'AASH001', 280, 240, 30, 10, 'bag', 1);

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id)
VALUES ('Lux Soap', 5, 4, 'LUX001', 45, 38, 80, 15, 'piece', 1);

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id)
VALUES ('Notebook 200 Pages', 3, 3, 'NOTE001', 60, 45, 0, 10, 'piece', 1);

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id)
VALUES ('Ball Pen (Blue)', 3, 3, 'PEN001', 10, 6, 200, 50, 'piece', 1);

-- Initial stock movements for seed products
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

-- ============================================
-- Profile: AYUSH (AYUSH PROVISION / Harsh_2006)
-- ============================================
INSERT OR IGNORE INTO users (id, name, username, password_hash, role, is_active, created_at)
VALUES (2, 'AYUSH', 'ayush provision', '$2a$10$E7rIInDOPxnhnI.6itUBvuOnobOQyMzzTC4x4zQ8TFW9dC6JEBBS.', 'admin', 1, '2026-09-27 18:30:00');

-- Categories for AYUSH
INSERT OR IGNORE INTO categories (name, user_id, is_active, created_at) VALUES ('Beverages', 2, 1, '2026-09-27 18:35:00');
INSERT OR IGNORE INTO categories (name, user_id, is_active, created_at) VALUES ('Chocolates', 2, 1, '2026-09-27 18:35:00');
INSERT OR IGNORE INTO categories (name, user_id, is_active, created_at) VALUES ('Household', 2, 1, '2026-09-27 18:35:00');
INSERT OR IGNORE INTO categories (name, user_id, is_active, created_at) VALUES ('Snacks', 2, 1, '2026-09-27 18:35:00');

-- Suppliers for AYUSH
INSERT OR IGNORE INTO suppliers (name, phone, email, address, user_id, is_active, created_at)
VALUES ('Agrawal Trader', '0000000000', 'xyz@gmail.com', 'Amravati', 2, 1, '2026-09-27 18:40:00');

INSERT OR IGNORE INTO suppliers (name, phone, email, address, user_id, is_active, created_at)
VALUES ('S-mart', '7709400000', 'abc@gmail.com', 'Amravati', 2, 1, '2026-09-27 18:40:00');

INSERT OR IGNORE INTO suppliers (name, phone, email, address, user_id, is_active, created_at)
VALUES ('Shiv Traders', '0200002000', 'pql@gmail.com', 'Amravati', 2, 1, '2026-09-27 18:40:00');

-- Products for AYUSH
INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id, is_active, created_at)
VALUES ('Amul Protien Milk(250ml)',
    (SELECT id FROM categories WHERE name = 'Beverages' AND user_id = 2),
    (SELECT id FROM suppliers WHERE name = 'S-mart' AND user_id = 2),
    'TEST-3', 110, 99, 25, 10, 'bottle', 2, 1, '2026-09-27 18:50:00');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id, is_active, created_at)
VALUES ('Bhakarwadi (250g)',
    (SELECT id FROM categories WHERE name = 'Snacks' AND user_id = 2),
    (SELECT id FROM suppliers WHERE name = 'Agrawal Trader' AND user_id = 2),
    'S1', 110, 89, 0, 10, 'box', 2, 1, '2026-09-27 18:52:00');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id, is_active, created_at)
VALUES ('Cadbury Dairy milk(MahaPack)',
    (SELECT id FROM categories WHERE name = 'Chocolates' AND user_id = 2),
    (SELECT id FROM suppliers WHERE name = 'Shiv Traders' AND user_id = 2),
    'C2', 50, 40, 150, 10, 'piece', 2, 1, '2026-09-27 18:54:00');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id, is_active, created_at)
VALUES ('Diet Coke',
    (SELECT id FROM categories WHERE name = 'Beverages' AND user_id = 2),
    (SELECT id FROM suppliers WHERE name = 'S-mart' AND user_id = 2),
    'TEST4', 50, 40, 4, 10, 'bottle', 2, 1, '2026-09-27 18:56:00');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id, is_active, created_at)
VALUES ('Kitkat',
    (SELECT id FROM categories WHERE name = 'Chocolates' AND user_id = 2),
    (SELECT id FROM suppliers WHERE name = 'Shiv Traders' AND user_id = 2),
    'C1', 50, 45, 100, 10, 'piece', 2, 1, '2026-09-27 18:58:00');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id, is_active, created_at)
VALUES ('Melody',
    (SELECT id FROM categories WHERE name = 'Chocolates' AND user_id = 2),
    (SELECT id FROM suppliers WHERE name = 'Shiv Traders' AND user_id = 2),
    'C3', 120, 100, 50, 10, 'packet', 2, 1, '2026-09-27 19:00:00');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id, is_active, created_at)
VALUES ('Nescafe Coffee (200g)',
    (SELECT id FROM categories WHERE name = 'Beverages' AND user_id = 2),
    (SELECT id FROM suppliers WHERE name = 'S-mart' AND user_id = 2),
    'TEST 2', 710, 695, 35, 10, 'bottle', 2, 1, '2026-09-27 19:02:00');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id, is_active, created_at)
VALUES ('Pepsi',
    (SELECT id FROM categories WHERE name = 'Beverages' AND user_id = 2),
    (SELECT id FROM suppliers WHERE name = 'S-mart' AND user_id = 2),
    'TEST1', 25, 20, 50, 10, 'bottle', 2, 1, '2026-09-27 19:04:00');

INSERT OR IGNORE INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, user_id, is_active, created_at)
VALUES ('Snickers',
    (SELECT id FROM categories WHERE name = 'Chocolates' AND user_id = 2),
    (SELECT id FROM suppliers WHERE name = 'Shiv Traders' AND user_id = 2),
    'C4', 70, 55, 120, 10, 'piece', 2, 1, '2026-09-27 19:06:00');

-- Stock Movements for AYUSH
INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'TEST 2' AND user_id = 2), 'restock', 35, 35, 'Initial stock', 2, '2026-09-27 19:03:00');

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'C1' AND user_id = 2), 'restock', 100, 100, 'Initial stock', 2, '2026-09-27 19:11:00');

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'C2' AND user_id = 2), 'restock', 150, 150, 'Initial stock', 2, '2026-09-27 19:11:00');

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'C3' AND user_id = 2), 'restock', 40, 40, 'Initial stock', 2, '2026-09-27 19:15:00');

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'C4' AND user_id = 2), 'restock', 120, 120, 'Initial stock', 2, '2026-09-27 19:18:00');

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'TEST4' AND user_id = 2), 'restock', 4, 4, 'Initial stock', 2, '2026-09-27 19:20:00');

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'TEST4' AND user_id = 2), 'sale', -1, 3, 'Sale #1', 2, '2026-09-27 19:21:00');

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'S1' AND user_id = 2), 'restock', 10, 10, 'Initial stock', 2, '2026-09-27 19:28:00');

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'S1' AND user_id = 2), 'sale', -10, 0, 'Sale #2', 2, '2026-09-27 19:29:00');

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'TEST-3' AND user_id = 2), 'restock', 30, 30, 'Initial stock', 2, '2026-09-27 19:30:00');

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'TEST-3' AND user_id = 2), 'adjustment', -5, 25, 'Damaged', 2, '2026-09-27 19:35:00');

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'TEST4' AND user_id = 2), 'adjustment', 1, 4, 'REFILLED', 2, '2026-09-27 19:36:00');

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'C3' AND user_id = 2), 'restock', 10, 50, 'Shiv Trader', 2, '2026-09-27 19:37:00');

INSERT OR IGNORE INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by, created_at)
VALUES ((SELECT id FROM products WHERE sku = 'TEST1' AND user_id = 2), 'restock', 50, 50, 'Initial stock', 2, '2026-09-27 19:40:00');

-- Sales and Sale Items for AYUSH
INSERT OR IGNORE INTO sales (id, total_amount, status, created_by, created_at)
VALUES (1, 50.00, 'completed', 2, '2026-09-27 19:21:00');

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, subtotal)
VALUES (1, (SELECT id FROM products WHERE sku = 'TEST4' AND user_id = 2), 1, 50.00, 50.00);

INSERT OR IGNORE INTO sales (id, total_amount, status, created_by, created_at)
VALUES (2, 1100.00, 'completed', 2, '2026-09-27 19:29:00');

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, subtotal)
VALUES (2, (SELECT id FROM products WHERE sku = 'S1' AND user_id = 2), 10, 110.00, 1100.00);

INSERT OR IGNORE INTO sales (id, total_amount, status, created_by, created_at)
VALUES (3, 380.00, 'completed', 2, '2026-09-27 19:49:00');

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, subtotal)
VALUES (3, (SELECT id FROM products WHERE sku = 'C3' AND user_id = 2), 1, 120.00, 120.00);
INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, subtotal)
VALUES (3, (SELECT id FROM products WHERE sku = 'C1' AND user_id = 2), 1, 50.00, 50.00);
INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, subtotal)
VALUES (3, (SELECT id FROM products WHERE sku = 'C4' AND user_id = 2), 3, 70.00, 210.00);

INSERT OR IGNORE INTO sales (id, total_amount, status, created_by, created_at)
VALUES (4, 800.00, 'completed', 2, '2026-09-27 19:52:00');

INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, subtotal)
VALUES (4, (SELECT id FROM products WHERE sku = 'C4' AND user_id = 2), 8, 70.00, 560.00);
INSERT OR IGNORE INTO sale_items (sale_id, product_id, quantity, price, subtotal)
VALUES (4, (SELECT id FROM products WHERE sku = 'C3' AND user_id = 2), 2, 120.00, 240.00);
