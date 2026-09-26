// ============================================
// Settings Routes
// ============================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// GET /api/settings
router.get('/', requireAuth, (req, res) => {
    try {
        const rows = db.all('SELECT key, value FROM settings');
        const settings = {};
        rows.forEach(row => { settings[row.key] = row.value; });
        res.json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

// PUT /api/settings — Admin only
router.put('/', requireAuth, requireRole('admin'), (req, res) => {
    try {
        const settings = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Settings data is required.' } });
        }

        db.transaction(() => {
            for (const [key, value] of Object.entries(settings)) {
                db.run(
                    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
                    [key, String(value)]
                );
            }

            db.run(
                `INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES (?, 'SETTINGS_UPDATE', 'settings', ?)`,
                [req.session.user.id, JSON.stringify(settings)]
            );
        });

        res.json({ success: true, message: 'Settings updated successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
});

module.exports = router;
