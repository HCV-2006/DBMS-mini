// ============================================
// Report Routes (User-Scoped)
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/authMiddleware');

// Helper to convert rows to CSV
function toCSV(rows, columns) {
    if (!rows.length) return columns.join(',') + '\n';
    const header = columns.join(',');
    const body = rows.map(row => columns.map(col => {
        let val = row[col];
        if (val === null || val === undefined) val = '';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
    }).join(',')).join('\n');
    return header + '\n' + body;
}

// GET /api/reports/inventory
router.get('/inventory', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { format = 'json', category, search, status } = req.query;

        let where = ['p.is_active = 1', 'p.user_id = ?'];
        let params = [userId];

        if (category) {
            where.push('p.category_id = ?');
            params.push(parseInt(category));
        }
        if (search) {
            where.push('(p.name LIKE ? OR p.sku LIKE ?)');
            const s = `%${search}%`;
            params.push(s, s);
        }
        if (status === 'low') {
            where.push('p.quantity > 0 AND p.quantity <= p.minimum_stock');
        } else if (status === 'out') {
            where.push('p.quantity = 0');
        }

        const whereClause = 'WHERE ' + where.join(' AND ');

        const rows = db.all(
            `SELECT p.name, p.sku, c.name as category, p.quantity as current_stock,
                    p.minimum_stock, p.price, p.cost_price, p.unit,
                    CASE
                        WHEN p.quantity = 0 THEN 'Out of Stock'
                        WHEN p.quantity <= p.minimum_stock THEN 'Low Stock'
                        ELSE 'In Stock'
                    END as status
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             ${whereClause}
             ORDER BY p.name ASC`,
            params
        );

        if (format === 'csv') {
            const csv = toCSV(rows, ['name', 'sku', 'category', 'current_stock', 'minimum_stock', 'price', 'cost_price', 'unit', 'status']);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.csv');
            return res.send(csv);
        }

        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// GET /api/reports/sales
router.get('/sales', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { format = 'json', from, to } = req.query;

        let where = ["s.status = 'completed'", "s.created_by = ?"];
        let params = [userId];

        if (from) { where.push("DATE(s.created_at, '+5 hours', '+30 minutes') >= ?"); params.push(from); }
        if (to) { where.push("DATE(s.created_at, '+5 hours', '+30 minutes') <= ?"); params.push(to); }

        const whereClause = 'WHERE ' + where.join(' AND ');

        const rows = db.all(
            `SELECT s.id as sale_id, DATETIME(s.created_at, '+5 hours', '+30 minutes') as date,
                    (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as items,
                    s.total_amount, u.name as created_by
             FROM sales s
             LEFT JOIN users u ON s.created_by = u.id
             ${whereClause}
             ORDER BY s.created_at DESC`,
            params
        );

        if (format === 'csv') {
            const csv = toCSV(rows, ['sale_id', 'date', 'items', 'total_amount', 'created_by']);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=sales_report.csv');
            return res.send(csv);
        }

        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// GET /api/reports/top-products
router.get('/top-products', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { format = 'json', limit = 10 } = req.query;

        const rows = db.all(
            `SELECT p.name, p.sku, SUM(si.quantity) as units_sold, SUM(si.subtotal) as revenue
             FROM sale_items si
             JOIN products p ON si.product_id = p.id
             JOIN sales s ON si.sale_id = s.id
             WHERE s.status = 'completed' AND s.created_by = ?
             GROUP BY si.product_id
             ORDER BY units_sold DESC
             LIMIT ?`,
            [userId, parseInt(limit)]
        );

        if (format === 'csv') {
            const csv = toCSV(rows, ['name', 'sku', 'units_sold', 'revenue']);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=top_products_report.csv');
            return res.send(csv);
        }

        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// GET /api/reports/stock-movements
router.get('/stock-movements', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { format = 'json', from, to, type, productId } = req.query;

        let where = ['p.user_id = ?'];
        let params = [userId];

        if (productId) { where.push('sm.product_id = ?'); params.push(parseInt(productId)); }
        if (type) { where.push('sm.type = ?'); params.push(type); }
        if (from) { where.push("DATE(sm.created_at, '+5 hours', '+30 minutes') >= ?"); params.push(from); }
        if (to) { where.push("DATE(sm.created_at, '+5 hours', '+30 minutes') <= ?"); params.push(to); }

        const whereClause = 'WHERE ' + where.join(' AND ');

        const rows = db.all(
            `SELECT p.name as product, p.sku, sm.type, sm.quantity_change, sm.quantity_after,
                    sm.note, u.name as user, DATETIME(sm.created_at, '+5 hours', '+30 minutes') as created_at
             FROM stock_movements sm
             JOIN products p ON sm.product_id = p.id
             LEFT JOIN users u ON sm.created_by = u.id
             ${whereClause}
             ORDER BY sm.created_at DESC`,
            params
        );

        if (format === 'csv') {
            const csv = toCSV(rows, ['product', 'sku', 'type', 'quantity_change', 'quantity_after', 'note', 'user', 'created_at']);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=stock_movements_report.csv');
            return res.send(csv);
        }

        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

module.exports = router;
