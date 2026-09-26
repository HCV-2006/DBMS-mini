// ============================================
// Inventory Management System — Express Server
// ============================================
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const config = require('./config.json');
const { initDatabase } = require('./database/db');
const { errorHandler } = require('./middleware/errorHandler');
const { generateCsrfToken, validateCsrfToken } = require('./middleware/csrfMiddleware');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const stockRoutes = require('./routes/stockRoutes');
const salesRoutes = require('./routes/salesRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || config.app.port || 5000;

// ---- Security Middleware ----
app.use(helmet({
    contentSecurityPolicy: false // Relaxed for inline scripts in dev
}));
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(apiLimiter);

// ---- Body Parsing ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Reverse Proxy Trust (Required for Render/Railway/Heroku HTTPS) ----
app.set('trust proxy', 1);

// ---- Session ----
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 60 * 1000 // 30 minutes
    }
}));

// ---- CSRF ----
app.use(generateCsrfToken);

// ---- Static Files ----
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// ---- API Routes ----
// Auth routes (login has its own rate limiter)
app.use('/api/auth', authRoutes);

// Protected API routes with CSRF validation
app.use('/api/products', validateCsrfToken, productRoutes);
app.use('/api/categories', validateCsrfToken, categoryRoutes);
app.use('/api/suppliers', validateCsrfToken, supplierRoutes);
app.use('/api/stock', validateCsrfToken, stockRoutes);
app.use('/api/sales', validateCsrfToken, salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', validateCsrfToken, settingsRoutes);
app.use('/api/reports', reportRoutes);

// ---- SPA Routes ----
// Serve login page for root access (redirects to /app if already logged in)
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/app');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve app shell for authenticated navigation (redirects to / if unauthenticated)
app.get('/app', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- Error Handler (must be last) ----
app.use(errorHandler);

// ---- Start Server ----
async function start() {
    try {
        await initDatabase();
        app.listen(PORT, () => {
            console.log(`\n✅ Stocker running at http://localhost:${PORT}`);
            console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   Default login: admin / admin123\n`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

start();
