// ============================================
// Product Routes (User-Scoped)
// ============================================
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/authMiddleware');

// Multer config for product images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'storage', 'product-images');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext) && allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only .jpg, .jpeg, .png, .webp images are allowed.'));
        }
    }
});

// GET /api/products — list with pagination, filtering, sorting, search (User-Scoped)
router.get('/', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const {
            page = 1,
            limit = 20,
            sortBy = 'created_at',
            sortDir = 'desc',
            search = '',
            category = '',
            status = '',
            active = '1'
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Allowed sort columns
        const allowedSorts = ['name', 'price', 'quantity', 'created_at', 'updated_at', 'sku'];
        const sortColumn = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
        const sortDirection = sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        let where = ['p.user_id = ?'];
        let params = [userId];

        if (req.query.active && req.query.active !== 'all') {
            where.push('p.is_active = ?');
            params.push(parseInt(req.query.active));
        }

        if (search) {
            where.push('(p.name LIKE ? OR p.sku LIKE ? OR c.name LIKE ?)');
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (category) {
            where.push('p.category_id = ?');
            params.push(parseInt(category));
        }

        if (status === 'low') {
            where.push('p.quantity > 0 AND p.quantity <= p.minimum_stock');
        } else if (status === 'out') {
            where.push('p.quantity = 0');
        } else if (status === 'in') {
            where.push('p.quantity > p.minimum_stock');
        }

        const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

        // Count total
        const countRow = db.get(
            `SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereClause}`,
            params
        );
        const total = countRow ? countRow.total : 0;

        // Get rows
        const products = db.all(
            `SELECT p.*, c.name as category_name, s.name as supplier_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN suppliers s ON p.supplier_id = s.id
             ${whereClause}
             ORDER BY p.${sortColumn} ${sortDirection}
             LIMIT ? OFFSET ?`,
            [...params, limitNum, offset]
        );

        res.json({
            success: true,
            data: products,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (err) {
        console.error('Products list error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// GET /api/products/:id
router.get('/:id', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const product = db.get(
            `SELECT p.*, c.name as category_name, s.name as supplier_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN suppliers s ON p.supplier_id = s.id
             WHERE p.id = ? AND p.user_id = ?`,
            [req.params.id, userId]
        );

        if (!product) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } });
        }

        // Get sales stats
        const salesStats = db.get(
            `SELECT COALESCE(SUM(si.quantity), 0) as total_units_sold,
                    COALESCE(SUM(si.subtotal), 0) as total_sales_value
             FROM sale_items si
             JOIN sales s ON si.sale_id = s.id
             WHERE si.product_id = ? AND s.status = 'completed'`,
            [req.params.id]
        );

        // Get recent movements
        const movements = db.all(
            `SELECT sm.*, u.name as user_name
             FROM stock_movements sm
             LEFT JOIN users u ON sm.created_by = u.id
             WHERE sm.product_id = ?
             ORDER BY sm.created_at DESC LIMIT 5`,
            [req.params.id]
        );

        res.json({
            success: true,
            data: {
                ...product,
                total_units_sold: salesStats?.total_units_sold || 0,
                total_sales_value: salesStats?.total_sales_value || 0,
                recent_movements: movements
            }
        });
    } catch (err) {
        console.error('Product detail error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// POST /api/products — create
router.post('/', requireAuth, upload.single('image'), (req, res) => {
    try {
        const userId = req.session.user.id;
        const {
            name,
            category_id,
            supplier_id,
            sku,
            price,
            cost_price,
            quantity = 0,
            minimum_stock = 10,
            unit = 'piece'
        } = req.body;

        // Validation
        if (!name || name.trim().length < 2 || name.trim().length > 120) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Product name must be 2-120 characters.' } });
        }
        if (!sku || sku.trim().length === 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'SKU is required.' } });
        }
        if (!price || parseFloat(price) < 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Selling price must be >= 0.' } });
        }
        if (cost_price && parseFloat(cost_price) < 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cost price must be >= 0.' } });
        }

        // Check duplicate SKU for this user
        const existing = db.get('SELECT id FROM products WHERE LOWER(sku) = LOWER(?) AND user_id = ?', [sku.trim(), userId]);
        if (existing) {
            return res.status(409).json({ success: false, error: { code: 'DUPLICATE_SKU', message: 'A product with this SKU already exists.' } });
        }

        const imagePath = req.file ? `/storage/product-images/${req.file.filename}` : null;
        const initialQty = parseInt(quantity) || 0;
        const minStock = parseInt(minimum_stock) || 10;

        const result = db.transaction(() => {
            db.run(
                `INSERT INTO products (name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, image, user_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [name.trim(), parseInt(category_id), supplier_id ? parseInt(supplier_id) : null, sku.trim().toUpperCase(),
                 parseFloat(price), cost_price ? parseFloat(cost_price) : null, initialQty, minStock, unit || 'piece', imagePath, userId]
            );

            const productId = db.get('SELECT last_insert_rowid() as id').id;

            // Initial stock movement if quantity > 0
            if (initialQty > 0) {
                db.run(
                    `INSERT INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by)
                     VALUES (?, 'restock', ?, ?, 'Initial stock', ?)`,
                    [productId, initialQty, initialQty, userId]
                );
            }

            // Activity log
            db.run(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
                 VALUES (?, 'PRODUCT_CREATE', 'product', ?, ?)`,
                [userId, productId, JSON.stringify({ name: name.trim(), sku: sku.trim() })]
            );

            return productId;
        });

        res.status(201).json({ success: true, message: 'Product added successfully.', data: { id: result } });
    } catch (err) {
        console.error('Product create error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// PUT /api/products/:id — update
router.put('/:id', requireAuth, upload.single('image'), (req, res) => {
    try {
        const userId = req.session.user.id;
        const product = db.get('SELECT * FROM products WHERE id = ? AND user_id = ?', [req.params.id, userId]);
        if (!product) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } });
        }

        const { name, category_id, supplier_id, sku, price, cost_price, minimum_stock, unit } = req.body;

        // Check duplicate SKU (exclude current product) for this user
        if (sku) {
            const existing = db.get('SELECT id FROM products WHERE LOWER(sku) = LOWER(?) AND id != ? AND user_id = ?', [sku.trim(), req.params.id, userId]);
            if (existing) {
                return res.status(409).json({ success: false, error: { code: 'DUPLICATE_SKU', message: 'A product with this SKU already exists.' } });
            }
        }

        const imagePath = req.file ? `/storage/product-images/${req.file.filename}` : product.image;

        db.run(
            `UPDATE products SET name = ?, category_id = ?, supplier_id = ?, sku = ?, price = ?,
             cost_price = ?, minimum_stock = ?, unit = ?, image = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`,
            [
                (name || product.name).trim(),
                parseInt(category_id) || product.category_id,
                supplier_id ? parseInt(supplier_id) : product.supplier_id,
                (sku || product.sku).trim().toUpperCase(),
                parseFloat(price) || product.price,
                cost_price !== undefined ? (cost_price ? parseFloat(cost_price) : null) : product.cost_price,
                parseInt(minimum_stock) || product.minimum_stock,
                unit || product.unit,
                imagePath,
                req.params.id,
                userId
            ]
        );

        db.run(
            `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'PRODUCT_UPDATE', 'product', ?, ?)`,
            [userId, req.params.id, JSON.stringify({ name: (name || product.name).trim() })]
        );

        res.json({ success: true, message: 'Product updated successfully.' });
    } catch (err) {
        console.error('Product update error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// DELETE /api/products/:id — delete product
router.delete('/:id', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const product = db.get('SELECT * FROM products WHERE id = ? AND user_id = ?', [req.params.id, userId]);
        if (!product) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } });
        }

        db.transaction(() => {
            // Delete stock movements for this product
            db.run('DELETE FROM stock_movements WHERE product_id = ?', [req.params.id]);
            // Delete sale items for this product
            db.run('DELETE FROM sale_items WHERE product_id = ?', [req.params.id]);
            // Delete product
            db.run('DELETE FROM products WHERE id = ? AND user_id = ?', [req.params.id, userId]);

            db.run(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'PRODUCT_DELETE', 'product', ?, ?)`,
                [userId, req.params.id, JSON.stringify({ name: product.name, sku: product.sku })]
            );
        });

        res.json({
            success: true,
            message: 'Product deleted successfully.'
        });
    } catch (err) {
        console.error('Product delete error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

module.exports = router;
