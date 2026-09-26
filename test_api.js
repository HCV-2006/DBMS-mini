// ============================================
// Comprehensive Automated Test Suite
// ============================================
const http = require('http');

let cookie = '';
let csrfToken = '';
const PORT = 5001;

function request(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            port: PORT,
            hostname: '127.0.0.1',
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(cookie ? { 'Cookie': cookie } : {}),
                ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                ...(options.headers || {})
            }
        }, (res) => {
            let body = '';
            if (res.headers['set-cookie']) {
                cookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
            }
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = body;
                try { parsed = JSON.parse(body); } catch {}
                resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            });
        });
        req.on('error', reject);
        if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    process.env.PORT = PORT;
    process.env.SESSION_SECRET = 'test-secret-suite';
    
    // Start server in-process
    const express = require('express');
    const session = require('express-session');
    const path = require('path');
    const { initDatabase } = require('./database/db');
    const { errorHandler } = require('./middleware/errorHandler');
    const { generateCsrfToken, validateCsrfToken } = require('./middleware/csrfMiddleware');

    const authRoutes = require('./routes/authRoutes');
    const productRoutes = require('./routes/productRoutes');
    const categoryRoutes = require('./routes/categoryRoutes');
    const supplierRoutes = require('./routes/supplierRoutes');
    const stockRoutes = require('./routes/stockRoutes');
    const salesRoutes = require('./routes/salesRoutes');
    const dashboardRoutes = require('./routes/dashboardRoutes');
    const settingsRoutes = require('./routes/settingsRoutes');
    const reportRoutes = require('./routes/reportRoutes');

    await initDatabase();

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(session({
        secret: 'test-secret-suite',
        resave: false,
        saveUninitialized: false
    }));
    app.use(generateCsrfToken);
    app.use('/api/auth', authRoutes);
    app.use('/api/products', validateCsrfToken, productRoutes);
    app.use('/api/categories', validateCsrfToken, categoryRoutes);
    app.use('/api/suppliers', validateCsrfToken, supplierRoutes);
    app.use('/api/stock', validateCsrfToken, stockRoutes);
    app.use('/api/sales', validateCsrfToken, salesRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/settings', validateCsrfToken, settingsRoutes);
    app.use('/api/reports', reportRoutes);
    app.use(errorHandler);

    const server = app.listen(PORT);
    console.log(`Test server running on port ${PORT}`);

    let passed = 0;
    let failed = 0;

    function assert(desc, condition) {
        if (condition) {
            console.log(`  ✅ PASS: ${desc}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${desc}`);
            failed++;
        }
    }

    try {
        console.log('\n--- 1. Testing Auth ---');
        // Invalid login
        let res = await request({ path: '/api/auth/login', method: 'POST' }, { username: 'admin', password: 'wrongpassword' });
        assert('Login with wrong password returns 401', res.status === 401 && res.body.error.code === 'INVALID_CREDENTIALS');

        // Valid login
        res = await request({ path: '/api/auth/login', method: 'POST' }, { username: 'admin', password: 'admin123' });
        assert('Login with valid credentials returns 200', res.status === 200 && res.body.success === true);
        csrfToken = res.body.data.csrfToken;
        assert('Received CSRF token on login', typeof csrfToken === 'string' && csrfToken.length > 0);

        // Check /me
        res = await request({ path: '/api/auth/me', method: 'GET' });
        assert('GET /api/auth/me returns current user', res.status === 200 && res.body.data.username === 'admin');

        // Test Registration
        const newUsername = 'newstaff_' + Date.now();
        res = await request({ path: '/api/auth/register', method: 'POST' }, {
            name: 'New Test Staff',
            username: newUsername,
            password: 'password123',
            role: 'staff'
        });
        assert('POST /api/auth/register creates user and returns 201', res.status === 201 && res.body.success === true && res.body.data.username === newUsername);

        // Test Duplicate Registration
        res = await request({ path: '/api/auth/register', method: 'POST' }, {
            name: 'Duplicate Staff',
            username: newUsername,
            password: 'password123'
        });
        assert('POST /api/auth/register with duplicate username returns 400', res.status === 400 && res.body.error.code === 'DUPLICATE_USERNAME');

        // Re-login as admin for remaining tests
        res = await request({ path: '/api/auth/login', method: 'POST' }, { username: 'admin', password: 'admin123' });
        csrfToken = res.body.data.csrfToken;

        console.log('\n--- 2. Testing Dashboard ---');
        res = await request({ path: '/api/dashboard', method: 'GET' });
        assert('GET /api/dashboard returns stats', res.status === 200 && res.body.data.totalProducts > 0);

        console.log('\n--- 3. Testing Products ---');
        // List products
        res = await request({ path: '/api/products', method: 'GET' });
        assert('GET /api/products returns product list', res.status === 200 && Array.isArray(res.body.data) && res.body.data.length > 0);

        // Create product
        const uniqueSku = 'TEST-' + Date.now();
        res = await request({ path: '/api/products', method: 'POST' }, {
            name: 'Test Coffee Beans',
            category_id: 2, // Beverages
            sku: uniqueSku,
            price: 250,
            cost_price: 180,
            quantity: 50,
            minimum_stock: 15,
            unit: 'packet'
        });
        assert('POST /api/products creates product', res.status === 201 && res.body.success === true);
        const createdProdId = res.body.data.id;

        // Duplicate SKU test
        res = await request({ path: '/api/products', method: 'POST' }, {
            name: 'Another Coffee',
            category_id: 2,
            sku: uniqueSku,
            price: 300
        });
        assert('Duplicate SKU returns 409 DUPLICATE_SKU', res.status === 409 && res.body.error.code === 'DUPLICATE_SKU');

        console.log('\n--- 4. Testing Stock ---');
        // Add stock
        res = await request({ path: '/api/stock/add', method: 'POST' }, {
            product_id: createdProdId,
            quantity: 20,
            note: 'Restock batch #1'
        });
        assert('POST /api/stock/add adds stock', res.status === 200 && res.body.data.quantity === 70);

        // Adjust stock with reason
        res = await request({ path: '/api/stock/adjust', method: 'POST' }, {
            product_id: createdProdId,
            quantity: -5,
            note: 'Damaged in transit'
        });
        assert('POST /api/stock/adjust reduces stock with reason', res.status === 200 && res.body.data.quantity === 65);

        // Adjust without reason -> validation error
        res = await request({ path: '/api/stock/adjust', method: 'POST' }, {
            product_id: createdProdId,
            quantity: -5,
            note: ''
        });
        assert('Adjust without reason returns 400', res.status === 400 && res.body.error.code === 'VALIDATION_ERROR');

        // Adjust below 0 -> negative stock rejection
        res = await request({ path: '/api/stock/adjust', method: 'POST' }, {
            product_id: createdProdId,
            quantity: -100,
            note: 'Over-reduction attempt'
        });
        assert('Adjust below 0 returns 400 NEGATIVE_STOCK', res.status === 400 && res.body.error.code === 'NEGATIVE_STOCK');

        console.log('\n--- 5. Testing Sales ---');
        // Create sale
        res = await request({ path: '/api/sales', method: 'POST' }, {
            items: [
                { productId: createdProdId, quantity: 5 }
            ]
        });
        assert('POST /api/sales completes sale', res.status === 201 && res.body.success === true);
        const saleId = res.body.data.saleId;

        // Verify product stock reduced to 60 (65 - 5)
        res = await request({ path: `/api/products/${createdProdId}`, method: 'GET' });
        assert('Product quantity automatically reduced after sale', res.body.data.quantity === 60);

        // Insufficient stock sale attempt
        res = await request({ path: '/api/sales', method: 'POST' }, {
            items: [
                { productId: createdProdId, quantity: 1000 }
            ]
        });
        assert('Sale with insufficient stock rejected', res.status === 400 && res.body.error.code === 'INSUFFICIENT_STOCK');

        console.log('\n--- 6. Testing Deletions (Categories, Suppliers, Products, Sales) ---');
        // Attempt deleting category with products
        res = await request({ path: '/api/categories/2', method: 'DELETE' });
        assert('Deleting category with products returns 400 DELETE_BLOCKED', res.status === 400 && res.body.error.code === 'DELETE_BLOCKED');

        // Delete sale and verify stock restored
        res = await request({ path: `/api/sales/${saleId}`, method: 'DELETE' });
        assert('DELETE /api/sales/:id deletes sale and restores stock', res.status === 200 && res.body.success === true);

        res = await request({ path: `/api/products/${createdProdId}`, method: 'GET' });
        assert('Product quantity restored back to 65 after sale deletion', res.body.data.quantity === 65);

        // Create and delete an empty category
        res = await request({ path: '/api/categories', method: 'POST' }, { name: 'Temporary Category ' + Date.now() });
        const tempCatId = res.body.data?.id;
        res = await request({ path: `/api/categories/${tempCatId}`, method: 'DELETE' });
        assert('DELETE /api/categories/:id deletes empty category', res.status === 200 && res.body.success === true);

        // Delete product
        res = await request({ path: `/api/products/${createdProdId}`, method: 'DELETE' });
        assert('DELETE /api/products/:id deletes product successfully', res.status === 200 && res.body.success === true);

        // Create and delete a supplier
        res = await request({ path: '/api/suppliers', method: 'POST' }, { name: 'Temporary Supplier ' + Date.now() });
        const tempSupId = res.body.data?.id;
        res = await request({ path: `/api/suppliers/${tempSupId}`, method: 'DELETE' });
        assert('DELETE /api/suppliers/:id deletes supplier successfully', res.status === 200 && res.body.success === true);

        console.log('\n--- 7. Testing Reports ---');
        // Inventory report JSON
        res = await request({ path: '/api/reports/inventory?format=json', method: 'GET' });
        assert('GET /api/reports/inventory returns report data', res.status === 200 && res.body.data.length > 0);

        // Inventory report CSV
        res = await request({ path: '/api/reports/inventory?format=csv', method: 'GET' });
        assert('GET /api/reports/inventory with format=csv returns CSV', res.status === 200 && typeof res.body === 'string' && res.body.includes('name,sku'));

        console.log('\n--- 8. Testing Settings ---');
        res = await request({ path: '/api/settings', method: 'GET' });
        assert('GET /api/settings returns settings', res.status === 200 && res.body.data.app_name !== undefined);

        res = await request({ path: '/api/settings', method: 'PUT' }, {
            app_name: 'Smart Inventory Pro',
            currency: '₹',
            default_minimum_stock: '12'
        });
        assert('PUT /api/settings updates settings', res.status === 200 && res.body.success === true);

        console.log('\n--- 9. Testing Logout ---');
        res = await request({ path: '/api/auth/logout', method: 'POST' });
        assert('POST /api/auth/logout returns 200', res.status === 200 && res.body.success === true);

        // Access protected route after logout -> 401
        res = await request({ path: '/api/auth/me', method: 'GET' });
        assert('Accessing /api/auth/me after logout returns 401', res.status === 401);

        console.log(`\n============================================`);
        console.log(`Test Results: ${passed} passed, ${failed} failed`);
        console.log(`============================================\n`);

    } catch (err) {
        console.error('Test error:', err);
    } finally {
        server.close();
    }
}

runTests();
