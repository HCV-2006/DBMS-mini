// ============================================
// Category Routes (User-Scoped)
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/authMiddleware');

// GET /api/categories
router.get('/', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { active = '1', search = '' } = req.query;

        let where = ['c.user_id = ?'];
        let params = [userId];

        if (req.query.active && req.query.active !== 'all') {
            where.push('c.is_active = ?');
            params.push(parseInt(req.query.active));
        }

        if (search) {
            where.push('c.name LIKE ?');
            params.push(`%${search}%`);
        }

        const whereClause = 'WHERE ' + where.join(' AND ');

        const categories = db.all(
            `SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id = c.id AND user_id = ?) as product_count
             FROM categories c ${whereClause} ORDER BY c.name ASC`,
            [userId, ...params]
        );

        res.json({ success: true, data: categories });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// POST /api/categories
router.post('/', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { name } = req.body;
        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Category name must be at least 2 characters.' } });
        }

        const existing = db.get('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND user_id = ?', [name.trim(), userId]);
        if (existing) {
            return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'A category with this name already exists.' } });
        }

        const runResult = db.run('INSERT INTO categories (name, user_id) VALUES (?, ?)', [name.trim(), userId]);
        const id = runResult.lastInsertRowid || db.get('SELECT id FROM categories WHERE name = ? AND user_id = ? ORDER BY id DESC', [name.trim(), userId])?.id;

        db.run(`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'CATEGORY_CREATE', 'category', ?, ?)`,
            [userId, id, JSON.stringify({ name: name.trim() })]);

        res.status(201).json({ success: true, message: 'Category created successfully.', data: { id, name: name.trim() } });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// PUT /api/categories/:id
router.put('/:id', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const { name } = req.body;
        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Category name must be at least 2 characters.' } });
        }

        const category = db.get('SELECT * FROM categories WHERE id = ? AND user_id = ?', [req.params.id, userId]);
        if (!category) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found.' } });
        }

        const existing = db.get('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ? AND user_id = ?', [name.trim(), req.params.id, userId]);
        if (existing) {
            return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'A category with this name already exists.' } });
        }

        db.run('UPDATE categories SET name = ? WHERE id = ? AND user_id = ?', [name.trim(), req.params.id, userId]);
        db.run(`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'CATEGORY_UPDATE', 'category', ?, ?)`,
            [userId, req.params.id, JSON.stringify({ name: name.trim() })]);

        res.json({ success: true, message: 'Category updated successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// DELETE /api/categories/:id
router.delete('/:id', requireAuth, (req, res) => {
    try {
        const userId = req.session.user.id;
        const category = db.get('SELECT * FROM categories WHERE id = ? AND user_id = ?', [req.params.id, userId]);
        if (!category) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found.' } });
        }

        // Check if category has products for this user
        const productCount = db.get('SELECT COUNT(*) as count FROM products WHERE category_id = ? AND user_id = ?', [req.params.id, userId]);
        if (productCount && productCount.count > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'DELETE_BLOCKED',
                    message: `Cannot delete category "${category.name}". It is associated with ${productCount.count} product(s). Please delete or reassign the products first.`
                }
            });
        }

        db.run('DELETE FROM categories WHERE id = ? AND user_id = ?', [req.params.id, userId]);

        db.run(`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'CATEGORY_DELETE', 'category', ?, ?)`,
            [userId, req.params.id, JSON.stringify({ name: category.name })]);

        res.json({
            success: true,
            message: 'Category deleted successfully.'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

module.exports = router;
