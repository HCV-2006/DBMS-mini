// ============================================
// Supplier Routes (User-Scoped)
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/authMiddleware');

// GET /api/suppliers
router.get('/', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { active = '1', search = '' } = req.query;

        let where = ['s.user_id = ?'];
        let params = [userId];

        if (req.query.active && req.query.active !== 'all') {
            where.push('s.is_active = ?');
            params.push(parseInt(req.query.active));
        }

        if (search) {
            where.push('(s.name LIKE ? OR s.phone LIKE ? OR s.email LIKE ?)');
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        const whereClause = 'WHERE ' + where.join(' AND ');

        const suppliers = db.all(
            `SELECT s.*, (SELECT COUNT(*) FROM products WHERE supplier_id = s.id AND user_id = ?) as product_count
             FROM suppliers s ${whereClause} ORDER BY s.name ASC`,
            [userId, ...params]
        );

        res.json({ success: true, data: suppliers });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// GET /api/suppliers/:id
router.get('/:id', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const supplier = db.get('SELECT * FROM suppliers WHERE id = ? AND user_id = ?', [req.params.id, userId]);
        if (!supplier) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found.' } });
        }
        res.json({ success: true, data: supplier });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// POST /api/suppliers
router.post('/', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { name, phone, email, address } = req.body;
        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Supplier name must be at least 2 characters.' } });
        }

        const runResult = db.run('INSERT INTO suppliers (name, phone, email, address, user_id) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), phone?.trim() || null, email?.trim() || null, address?.trim() || null, userId]);
        const id = runResult.lastInsertRowid || db.get('SELECT id FROM suppliers WHERE name = ? AND user_id = ? ORDER BY id DESC', [name.trim(), userId])?.id;

        db.run(`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'SUPPLIER_CREATE', 'supplier', ?, ?)`,
            [userId, id, JSON.stringify({ name: name.trim() })]);

        res.status(201).json({ success: true, message: 'Supplier created successfully.', data: { id, name: name.trim() } });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// PUT /api/suppliers/:id
router.put('/:id', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const supplier = db.get('SELECT * FROM suppliers WHERE id = ? AND user_id = ?', [req.params.id, userId]);
        if (!supplier) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found.' } });
        }

        const { name, phone, email, address } = req.body;
        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Supplier name must be at least 2 characters.' } });
        }

        db.run(
            'UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ? AND user_id = ?',
            [name.trim(), phone !== undefined ? (phone?.trim() || null) : supplier.phone,
             email !== undefined ? (email?.trim() || null) : supplier.email,
             address !== undefined ? (address?.trim() || null) : supplier.address, req.params.id, userId]
        );

        db.run(`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'SUPPLIER_UPDATE', 'supplier', ?, ?)`,
            [userId, req.params.id, JSON.stringify({ name: name.trim() })]);

        res.json({ success: true, message: 'Supplier updated successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// DELETE /api/suppliers/:id
router.delete('/:id', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const supplier = db.get('SELECT * FROM suppliers WHERE id = ? AND user_id = ?', [req.params.id, userId]);
        if (!supplier) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found.' } });
        }

        db.transaction(() => {
            // Unlink any products assigned to this supplier for this user
            db.run('UPDATE products SET supplier_id = NULL WHERE supplier_id = ? AND user_id = ?', [req.params.id, userId]);
            // Delete the supplier
            db.run('DELETE FROM suppliers WHERE id = ? AND user_id = ?', [req.params.id, userId]);
            // Activity log
            db.run(`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'SUPPLIER_DELETE', 'supplier', ?, ?)`,
                [userId, req.params.id, JSON.stringify({ name: supplier.name })]);
        });

        res.json({
            success: true,
            message: 'Supplier deleted successfully.'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

module.exports = router;
