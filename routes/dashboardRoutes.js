// ============================================
// Dashboard Routes (User-Scoped)
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/authMiddleware');

// GET /api/dashboard — main stats
router.get('/', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;

        const totalProducts = db.get('SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND user_id = ?', [userId]);
        const totalStock = db.get('SELECT COALESCE(SUM(quantity), 0) as total FROM products WHERE is_active = 1 AND user_id = ?', [userId]);
        const lowStock = db.get('SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND quantity > 0 AND quantity <= minimum_stock AND user_id = ?', [userId]);
        const outOfStock = db.get('SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND quantity = 0 AND user_id = ?', [userId]);

        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date());

        const todaySales = db.get(
            `SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE status = 'completed' AND DATE(created_at, '+5 hours', '+30 minutes') = ? AND created_by = ?`,
            [today, userId]
        );
        const totalSales = db.get("SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE status = 'completed' AND created_by = ?", [userId]);
        const totalTransactions = db.get("SELECT COUNT(*) as count FROM sales WHERE status = 'completed' AND created_by = ?", [userId]);

        const todayTransactions = db.get(
            `SELECT COUNT(*) as count FROM sales WHERE status = 'completed' AND DATE(created_at, '+5 hours', '+30 minutes') = ? AND created_by = ?`,
            [today, userId]
        );

        res.json({
            success: true,
            data: {
                totalProducts: totalProducts?.count || 0,
                totalStock: totalStock?.total || 0,
                lowStock: lowStock?.count || 0,
                outOfStock: outOfStock?.count || 0,
                todaySales: todaySales?.total || 0,
                totalSales: totalSales?.total || 0,
                totalTransactions: totalTransactions?.count || 0,
                todayTransactions: todayTransactions?.count || 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// GET /api/dashboard/sales — sales chart data
router.get('/sales', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { range = 'week' } = req.query;
        let days = range === 'month' ? 30 : 7;

        const rows = db.all(
            `SELECT DATE(created_at, '+5 hours', '+30 minutes') as date, SUM(total_amount) as total, COUNT(*) as count
             FROM sales
             WHERE status = 'completed'
               AND DATE(created_at, '+5 hours', '+30 minutes') >= DATE('now', '+5 hours', '+30 minutes', '-${days - 1} days')
               AND created_by = ?
             GROUP BY DATE(created_at, '+5 hours', '+30 minutes')
             ORDER BY date ASC`,
            [userId]
        );

        const salesMap = {};
        rows.forEach(r => { salesMap[r.date] = r.total; });

        // Generate full continuous calendar days in IST ending today
        const salesData = [];
        const now = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 86400000);
            const dateStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kolkata',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(d);
            salesData.push({
                date: dateStr,
                total: salesMap[dateStr] || 0
            });
        }

        res.json({ success: true, data: salesData });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// GET /api/dashboard/top-products
router.get('/top-products', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { limit = 5 } = req.query;

        const topProducts = db.all(
            `SELECT p.name, p.sku, SUM(si.quantity) as total_sold, SUM(si.subtotal) as total_revenue
             FROM sale_items si
             JOIN products p ON si.product_id = p.id
             JOIN sales s ON si.sale_id = s.id
             WHERE s.status = 'completed' AND s.created_by = ?
             GROUP BY si.product_id
             ORDER BY total_sold DESC
             LIMIT ?`,
            [userId, parseInt(limit)]
        );

        res.json({ success: true, data: topProducts });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// GET /api/dashboard/recent-movements
router.get('/recent-movements', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { limit = 10 } = req.query;

        const movements = db.all(
            `SELECT sm.*, p.name as product_name, p.sku, u.name as user_name
             FROM stock_movements sm
             JOIN products p ON sm.product_id = p.id
             LEFT JOIN users u ON sm.created_by = u.id
             WHERE p.user_id = ?
             ORDER BY sm.created_at DESC LIMIT ?`,
            [userId, parseInt(limit)]
        );

        res.json({ success: true, data: movements });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

module.exports = router;
