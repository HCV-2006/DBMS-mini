// ============================================
// Stock Routes (User-Scoped)
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/authMiddleware');

// POST /api/stock/add — restock
router.post('/add', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { product_id, quantity, note } = req.body;

        if (!product_id) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Product is required.' } });
        }
        const qty = parseInt(quantity);
        if (!qty || qty <= 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Quantity must be greater than zero.' } });
        }

        const product = db.get('SELECT * FROM products WHERE id = ? AND is_active = 1 AND user_id = ?', [product_id, userId]);
        if (!product) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } });
        }

        const newQty = product.quantity + qty;

        db.transaction(() => {
            db.run('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [newQty, product_id, userId]);
            db.run(
                `INSERT INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by)
                 VALUES (?, 'restock', ?, ?, ?, ?)`,
                [product_id, qty, newQty, note || null, userId]
            );
            db.run(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'STOCK_ADD', 'product', ?, ?)`,
                [userId, product_id, JSON.stringify({ added: qty, new_quantity: newQty })]
            );
        });

        res.json({ success: true, message: 'Stock updated successfully.', data: { quantity: newQty } });
    } catch (err) {
        console.error('Stock add error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// POST /api/stock/adjust — adjustment (+/-)
router.post('/adjust', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { product_id, quantity, note } = req.body;

        if (!product_id) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Product is required.' } });
        }
        const qty = parseInt(quantity);
        if (qty === 0 || isNaN(qty)) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Adjustment quantity cannot be zero.' } });
        }
        if (!note || note.trim().length === 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A reason/note is required for stock adjustments.' } });
        }

        const product = db.get('SELECT * FROM products WHERE id = ? AND is_active = 1 AND user_id = ?', [product_id, userId]);
        if (!product) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found.' } });
        }

        const newQty = product.quantity + qty;
        if (newQty < 0) {
            return res.status(400).json({
                success: false,
                error: { code: 'NEGATIVE_STOCK', message: 'This action would reduce stock below zero.' }
            });
        }

        db.transaction(() => {
            db.run('UPDATE products SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [newQty, product_id, userId]);
            db.run(
                `INSERT INTO stock_movements (product_id, type, quantity_change, quantity_after, note, created_by)
                 VALUES (?, 'adjustment', ?, ?, ?, ?)`,
                [product_id, qty, newQty, note.trim(), userId]
            );
            db.run(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'STOCK_ADJUST', 'product', ?, ?)`,
                [userId, product_id, JSON.stringify({ adjustment: qty, new_quantity: newQty, note: note.trim() })]
            );
        });

        res.json({ success: true, message: 'Stock adjustment recorded successfully.', data: { quantity: newQty } });
    } catch (err) {
        console.error('Stock adjust error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// GET /api/stock/movements — query movements
router.get('/movements', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId, type, from, to, page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        let where = ['p.user_id = ?'];
        let params = [userId];

        if (productId) {
            where.push('sm.product_id = ?');
            params.push(parseInt(productId));
        }
        if (type) {
            where.push('sm.type = ?');
            params.push(type);
        }
        if (from) {
            where.push("DATE(sm.created_at, '+5 hours', '+30 minutes') >= ?");
            params.push(from);
        }
        if (to) {
            where.push("DATE(sm.created_at, '+5 hours', '+30 minutes') <= ?");
            params.push(to);
        }

        const whereClause = 'WHERE ' + where.join(' AND ');

        const countRow = db.get(
            `SELECT COUNT(*) as total FROM stock_movements sm
             JOIN products p ON sm.product_id = p.id
             ${whereClause}`,
            params
        );
        const total = countRow ? countRow.total : 0;

        const movements = db.all(
            `SELECT sm.*, p.name as product_name, p.sku, u.name as user_name
             FROM stock_movements sm
             JOIN products p ON sm.product_id = p.id
             LEFT JOIN users u ON sm.created_by = u.id
             ${whereClause}
             ORDER BY sm.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limitNum, offset]
        );

        res.json({
            success: true,
            data: movements,
            pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// GET /api/stock/low — low stock products
router.get('/low', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const products = db.all(
            `SELECT p.*, c.name as category_name FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.is_active = 1 AND p.quantity > 0 AND p.quantity <= p.minimum_stock AND p.user_id = ?
             ORDER BY p.quantity ASC`,
            [userId]
        );
        res.json({ success: true, data: products });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// GET /api/stock/out — out of stock products
router.get('/out', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const products = db.all(
            `SELECT p.*, c.name as category_name FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.is_active = 1 AND p.quantity = 0 AND p.user_id = ?
             ORDER BY p.name ASC`,
            [userId]
        );
        res.json({ success: true, data: products });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

module.exports = router;
