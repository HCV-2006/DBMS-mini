// ============================================
// Authentication Routes
// ============================================
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../database/db');
const { requireAuth } = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/rateLimitMiddleware');

// POST /api/auth/login
router.post('/login', loginLimiter, (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Username and password are required.' }
            });
        }

        const user = db.get('SELECT * FROM users WHERE username = ?', [username.trim().toLowerCase()]);

        if (!user) {
            // Log failed attempt
            db.run(`INSERT INTO activity_logs (user_id, action, details) VALUES (null, 'LOGIN_FAILED', ?)`,
                [JSON.stringify({ username: username.trim() })]);
            return res.status(401).json({
                success: false,
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' }
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                error: { code: 'ACCOUNT_DISABLED', message: 'Invalid username or password.' }
            });
        }

        const validPassword = bcrypt.compareSync(password, user.password_hash);

        if (!validPassword) {
            db.run(`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'LOGIN_FAILED', 'user', ?, ?)`,
                [user.id, user.id, JSON.stringify({ reason: 'wrong_password' })]);
            return res.status(401).json({
                success: false,
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' }
            });
        }

        // Success - create session
        req.session.user = {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role
        };

        // Log successful login
        db.run(`INSERT INTO activity_logs (user_id, action, entity_type, entity_id) VALUES (?, 'LOGIN_SUCCESS', 'user', ?)`,
            [user.id, user.id]);

        res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
                csrfToken: req.session.csrfToken
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred during login.' }
        });
    }
});

// POST /api/auth/register
router.post('/register', loginLimiter, (req, res) => {
    try {
        const { name, username, password, role } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Full name is required.' }
            });
        }

        if (!username || !username.trim()) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Username is required.' }
            });
        }

        const cleanUsername = username.trim().toLowerCase();
        if (cleanUsername.length < 3 || cleanUsername.length > 30 || !/^[a-z0-9_.-]+$/.test(cleanUsername)) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Username must be 3-30 characters (letters, numbers, underscore, hyphen).' }
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters.' }
            });
        }

        const userRole = 'admin';

        const existing = db.get('SELECT id FROM users WHERE username = ?', [cleanUsername]);
        if (existing) {
            return res.status(400).json({
                success: false,
                error: { code: 'DUPLICATE_USERNAME', message: 'Username is already registered. Please choose another.' }
            });
        }

        const password_hash = bcrypt.hashSync(password, 10);
        db.run(
            'INSERT INTO users (name, username, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
            [name.trim(), cleanUsername, password_hash, userRole]
        );

        const newUser = db.get('SELECT id, name, username, role FROM users WHERE username = ?', [cleanUsername]);

        // Auto-login into session
        req.session.user = {
            id: newUser.id,
            name: newUser.name,
            username: newUser.username,
            role: newUser.role
        };

        // Log registration activity
        db.run("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, 'USER_REGISTER', 'user', ?, ?)",
            [newUser.id, newUser.id, JSON.stringify({ username: newUser.username, role: newUser.role })]);

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            data: {
                id: newUser.id,
                name: newUser.name,
                username: newUser.username,
                role: newUser.role,
                csrfToken: req.session.csrfToken
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An error occurred during account creation.' }
        });
    }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    db.run(`INSERT INTO activity_logs (user_id, action) VALUES (?, 'LOGOUT')`, [userId]);

    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: { code: 'LOGOUT_ERROR', message: 'Failed to log out.' }
            });
        }
        res.json({ success: true, message: 'Logged out successfully.' });
    });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
    res.json({
        success: true,
        data: {
            ...req.session.user,
            csrfToken: req.session.csrfToken
        }
    });
});

module.exports = router;
