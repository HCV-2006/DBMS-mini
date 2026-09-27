// ============================================
// Database Connection & Initialization (sql.js)
// ============================================
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const DB_PATH = path.resolve(__dirname, '..', config.database.path.replace('./', ''));
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEED_PATH = path.join(__dirname, 'seed.sql');

let db = null;

/**
 * Initialize the database: load existing file or create new one with schema + seed.
 */
async function initDatabase() {
    const SQL = await initSqlJs();

    // Ensure the directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    let isNew = false;

    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log('[DB] Loaded existing database from', DB_PATH);
    } else {
        db = new SQL.Database();
        isNew = true;
        console.log('[DB] Created new database');
    }

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON;');

    // Always run schema (IF NOT EXISTS is safe to re-run)
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.run(schema);
    console.log('[DB] Schema applied');

    // Ensure user_id column exists on multi-tenant tables
    try { db.run('ALTER TABLE products ADD COLUMN user_id INTEGER DEFAULT 1;'); } catch {}
    try { db.run('ALTER TABLE categories ADD COLUMN user_id INTEGER;'); } catch {}
    try { db.run('ALTER TABLE suppliers ADD COLUMN user_id INTEGER;'); } catch {}
    try { db.run("UPDATE categories SET user_id = 1 WHERE user_id IS NULL;"); } catch {}
    try { db.run("UPDATE suppliers SET user_id = 1 WHERE user_id IS NULL;"); } catch {}
    try { db.run("UPDATE users SET role = 'admin' WHERE role = 'staff';"); } catch {}
    try { db.run("UPDATE settings SET value = 'Stocker' WHERE key = 'app_name';"); } catch {}

    // Multi-tenant migration: remove legacy table-level global UNIQUE on categories.name and products.sku
    try {
        const catSchema = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='categories'");
        if (catSchema.length > 0 && catSchema[0].values.length > 0 && /name\s+TEXT\s+UNIQUE/i.test(catSchema[0].values[0][0])) {
            db.run('PRAGMA foreign_keys = OFF;');
            db.run(`CREATE TABLE categories_v2 (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL,
                user_id     INTEGER,
                is_active   INTEGER NOT NULL DEFAULT 1,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );`);
            db.run('INSERT INTO categories_v2 (id, name, user_id, is_active, created_at) SELECT id, name, user_id, is_active, created_at FROM categories;');
            db.run('DROP TABLE categories;');
            db.run('ALTER TABLE categories_v2 RENAME TO categories;');
            db.run('CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);');
            db.run('CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);');
            db.run('PRAGMA foreign_keys = ON;');
            console.log('[DB] Migrated categories table to multi-tenant schema');
        }
    } catch (migErr) {
        console.warn('[DB] Categories migration note:', migErr.message);
    }

    try {
        const prodSchema = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='products'");
        if (prodSchema.length > 0 && prodSchema[0].values.length > 0 && /sku\s+TEXT\s+UNIQUE/i.test(prodSchema[0].values[0][0])) {
            db.run('PRAGMA foreign_keys = OFF;');
            db.run(`CREATE TABLE products_v2 (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                name            TEXT NOT NULL,
                category_id     INTEGER NOT NULL,
                supplier_id     INTEGER,
                sku             TEXT NOT NULL,
                price           REAL NOT NULL CHECK(price >= 0),
                cost_price      REAL CHECK(cost_price >= 0),
                quantity        INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
                minimum_stock   INTEGER NOT NULL DEFAULT 10 CHECK(minimum_stock >= 0),
                unit            TEXT DEFAULT 'piece',
                image           TEXT,
                user_id         INTEGER DEFAULT 1,
                is_active       INTEGER NOT NULL DEFAULT 1,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id),
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );`);
            db.run('INSERT INTO products_v2 (id, name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, image, user_id, is_active, created_at, updated_at) SELECT id, name, category_id, supplier_id, sku, price, cost_price, quantity, minimum_stock, unit, image, user_id, is_active, created_at, updated_at FROM products;');
            db.run('DROP TABLE products;');
            db.run('ALTER TABLE products_v2 RENAME TO products;');
            db.run('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);');
            db.run('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);');
            db.run('CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);');
            db.run('CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);');
            db.run('CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);');
            db.run('PRAGMA foreign_keys = ON;');
            console.log('[DB] Migrated products table to multi-tenant schema');
        }
    } catch (migErr) {
        console.warn('[DB] Products migration note:', migErr.message);
    }

    // Seed only if database is new
    if (isNew) {
        const seed = fs.readFileSync(SEED_PATH, 'utf-8');
        // Split by semicolons and execute each statement
        const statements = seed.split(';').filter(s => s.trim().length > 0);
        for (const stmt of statements) {
            try {
                db.run(stmt + ';');
            } catch (err) {
                // OR IGNORE handles duplicates; log others
                if (!err.message.includes('UNIQUE constraint')) {
                    console.warn('[DB] Seed warning:', err.message);
                }
            }
        }
        console.log('[DB] Seed data inserted');
    }

    // Save to disk
    saveDatabase();

    return db;
}

let inTransaction = false;

/**
 * Persist the in-memory database to disk.
 */
function saveDatabase() {
    if (!db || inTransaction) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Get the database instance.
 */
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

/**
 * Run a SQL statement (INSERT/UPDATE/DELETE).
 * Auto-saves to disk after write operations.
 */
function run(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    stmt.step();
    stmt.free();
    if (!inTransaction) {
        saveDatabase();
    }
    return { changes: db.getRowsModified(), lastInsertRowid: getLastInsertRowId() };
}

/**
 * Get last insert row id
 */
function getLastInsertRowId() {
    const result = db.exec('SELECT last_insert_rowid() as id');
    if (result.length > 0 && result[0].values.length > 0) {
        return result[0].values[0][0];
    }
    return 0;
}

/**
 * Query and return all matching rows as objects.
 */
function all(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

/**
 * Query and return the first matching row as an object.
 */
function get(sql, params = []) {
    const rows = all(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute raw SQL (for transactions and multi-statement blocks).
 */
function exec(sql) {
    db.run(sql);
    if (!inTransaction) {
        saveDatabase();
    }
}

/**
 * Run a function within a transaction.
 * Rolls back on error.
 */
function transaction(fn) {
    inTransaction = true;
    db.run('BEGIN TRANSACTION;');
    try {
        const result = fn();
        db.run('COMMIT;');
        inTransaction = false;
        saveDatabase();
        return result;
    } catch (err) {
        try {
            db.run('ROLLBACK;');
        } catch (rollbackErr) {
            // Transaction may already be rolled back
        }
        inTransaction = false;
        throw err;
    }
}

module.exports = {
    initDatabase,
    getDb,
    run,
    all,
    get,
    exec,
    transaction,
    saveDatabase
};
