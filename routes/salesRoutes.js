// ============================================
// Sales Routes (User-Scoped)
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/authMiddleware');

// GET /api/sales — list with pagination
router.get('/', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { from, to, page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        let where = ["s.status = 'completed'", "s.created_by = ?"];
        let params = [userId];

        if (from) {
            where.push("DATE(s.created_at, '+5 hours', '+30 minutes') >= ?");
            params.push(from);
        }
        if (to) {
            where.push("DATE(s.created_at, '+5 hours', '+30 minutes') <= ?");
            params.push(to);
        }

        const whereClause = 'WHERE ' + where.join(' AND ');

        const countRow = db.get(`SELECT COUNT(*) as total FROM sales s ${whereClause}`, params);
        const total = countRow ? countRow.total : 0;

        const sales = db.all(
            `SELECT s.*, u.name as created_by_name,
                    (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
             FROM sales s
             LEFT JOIN users u ON s.created_by = u.id
             ${whereClause}
             ORDER BY s.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limitNum, offset]
        );

        res.json({
            success: true,
            data: sales,
            pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// GET /api/sales/:id — sale detail
router.get('/:id', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const sale = db.get(
            `SELECT s.*, u.name as created_by_name
             FROM sales s LEFT JOIN users u ON s.created_by = u.id
             WHERE s.id = ? AND s.created_by = ?`,
            [req.params.id, userId]
        );

        if (!sale) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sale not found.' } });
        }

        const items = db.all(
            `SELECT si.*, p.name as product_name, p.sku
             FROM sale_items si
             LEFT JOIN products p ON si.product_id = p.id
             WHERE si.sale_id = ?`,
            [req.params.id]
        );

        const movements = db.all(
            `SELECT sm.* FROM stock_movements sm WHERE sm.reference_id = ? AND sm.type = 'sale'`,
            [req.params.id]
        );

        res.json({ success: true, data: { ...sale, items, movements } });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// POST /api/sales — create sale (transactional)
router.post('/', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one item is required.' } });
        }

        // Validate items format
        for (const item of items) {
            if (!item.productId || !item.quantity || parseInt(item.quantity) <= 0) {
                return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Each item must have a valid productId and quantity > 0.' } });
            }
        }

        const result = db.transaction(() => {
            let totalAmount = 0;
            const saleItems = [];

            // Step 1: Validate all products and stock (inside transaction) for current user
            for (const item of items) {
                const product = db.get('SELECT * FROM products WHERE id = ? AND is_active = 1 AND user_id = ?', [item.productId, userId]);
                if (!product) {
                    throw Object.assign(new Error(`Product #${item.productId} not found or inactive in your inventory.`), { statusCode: 400, code: 'PRODUCT_NOT_FOUND' });
                }

                const requestedQty = parseInt(item.quantity);
                if (requestedQty > product.quantity) {
                    throw Object.assign(new Error(`Insufficient stock for "${product.name}". Available: ${product.quantity}, Requested: ${requestedQty}`), { statusCode: 400, code: 'INSUFFICIENT_STOCK' });
                }

                const subtotal = requestedQty * product.price;
                totalAmount += subtotal;

                saleItems.push({
                    productId: product.id,
                    name: product.name,
                    quantity: requestedQty,
                    price: product.price,
                    subtotal,
                    currentStock: product.quantity
                });
            }

            // Step 2: Create sale
            db.run(
                'INSERT INTO sales (total_amount, created_by) VALUES (?, ?)',
                [totalAmount, userId]
            );
            const saleId = db.get('SELECT last_insert_rowid() as id').id;

            // Step 3: Create sale items, update stock, create movements
            for (const item of saleItems) {
                // Insert sale item
                db.run(
                    'INSERT INTO sale_items (sale_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
                    [saleId, item.productId, item.quantity, item.price, item.subtotal]
                );

                // Update product stock atomically with concurrency protection
                const updateRes = db.run(
                    'UPDATE products SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND quantity >= ? AND user_id = ?',
                    [item.quantity, item.productId, item.quantity, userId]
                );
                if (updateRes.changes === 0) {
                    throw Object.assign(new Error(`Stock conflict for "${item.name}". Stock was modified by another transaction. Please retry.`), { statusCode: 409, code: 'STOCK_CONFLICT' });
                }

                const updatedProd = db.get('SELECT quantity FROM products WHERE id = ? AND user_id = ?', [item.productId, userId]);
                const newQty = updatedProd.quantity;

                // Stock movement
                db.run(
                    `INSERT INTO stock_movements (product_id, type, quantity_change, quantity_after, reference_id, created_by)
                     VALUES (?, 'sale', ?, ?, ?, ?)`,
                    [item.productId, -item.quantity, newQty, saleId, userId]
                );
            }

            // Step 4: Activity log
            db.run(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'SALE_CREATE', 'sale', ?, ?)`,
                [userId, saleId, JSON.stringify({ total: totalAmount, items: saleItems.length })]
            );

            return { saleId, totalAmount, items: saleItems };
        });

        res.status(201).json({
            success: true,
            message: 'Sale completed successfully.',
            data: result
        });
    } catch (err) {
        console.error('Sale error:', err);
        const statusCode = err.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: { code: err.code || 'INTERNAL_ERROR', message: err.message }
        });
    }
});

// DELETE /api/sales/:id — delete sale and restore inventory
router.delete('/:id', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const sale = db.get('SELECT * FROM sales WHERE id = ? AND created_by = ?', [req.params.id, userId]);
        if (!sale) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sale not found.' } });
        }

        db.transaction(() => {
            // 1. Restore product stock for each item in the sale
            const items = db.all('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id]);
            for (const item of items) {
                db.run(
                    'UPDATE products SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
                    [item.quantity, item.product_id, userId]
                );
            }

            // 2. Remove stock movements associated with this sale
            db.run("DELETE FROM stock_movements WHERE reference_id = ? AND type = 'sale'", [req.params.id]);

            // 3. Remove sale items
            db.run('DELETE FROM sale_items WHERE sale_id = ?', [req.params.id]);

            // 4. Remove sale record
            db.run('DELETE FROM sales WHERE id = ? AND created_by = ?', [req.params.id, userId]);

            // 5. Activity log
            db.run(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'SALE_DELETE', 'sale', ?, ?)`,
                [userId, req.params.id, JSON.stringify({ total: sale.total_amount, items: items.length })]
            );
        });

        res.json({
            success: true,
            message: 'Sale deleted and inventory restored successfully.'
        });
    } catch (err) {
        console.error('Sale delete error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

module.exports = router;
