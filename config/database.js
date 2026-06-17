// const sqlite3 = require('sqlite3').verbose();
// const path = require('path');
// const bcrypt = require('bcryptjs');

// const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');

// const db = new sqlite3.Database(DB_PATH, (err) => {
//     if (err) {
//         console.error('Error conectando a la base de datos:', err.message);
//         process.exit(1);
//     }
//     console.log('Base de datos conectada:', DB_PATH);
// });

// db.serialize(() => {
//     db.run(`CREATE TABLE IF NOT EXISTS users (
//         id          INTEGER PRIMARY KEY AUTOINCREMENT,
//         username    TEXT    UNIQUE NOT NULL,
//         email       TEXT    UNIQUE NOT NULL,
//         password    TEXT    NOT NULL,
//         role        TEXT    NOT NULL DEFAULT 'user',
//         reset_token TEXT,
//         reset_token_expires INTEGER,
//         created_at  INTEGER DEFAULT (strftime('%s','now'))
//     )`);

//     db.run(`CREATE TABLE IF NOT EXISTS products (
//         id          INTEGER PRIMARY KEY AUTOINCREMENT,
//         sku         TEXT    UNIQUE NOT NULL,
//         name        TEXT    NOT NULL,
//         description TEXT,
//         price       REAL    NOT NULL DEFAULT 0,
//         stock       INTEGER NOT NULL DEFAULT 0,
//         category    TEXT,
//         created_at  INTEGER DEFAULT (strftime('%s','now')),
//         updated_at  INTEGER DEFAULT (strftime('%s','now'))
//     )`);

//     db.run(`CREATE TABLE IF NOT EXISTS stock_movements (
//         id              INTEGER PRIMARY KEY AUTOINCREMENT,
//         product_id      INTEGER NOT NULL,
//         quantity_change INTEGER NOT NULL,
//         reason          TEXT,
//         created_by      INTEGER,
//         created_at      INTEGER DEFAULT (strftime('%s','now')),
//         FOREIGN KEY (product_id) REFERENCES products(id)
//     )`);

//     db.run(`CREATE TABLE IF NOT EXISTS api_tokens (
//         id          INTEGER PRIMARY KEY AUTOINCREMENT,
//         token       TEXT NOT NULL,
//         scope       TEXT NOT NULL,
//         description TEXT,
//         created_by  INTEGER,
//         created_at  INTEGER DEFAULT (strftime('%s','now'))
//     )`);

//     db.run(`CREATE TABLE IF NOT EXISTS settings (
//         key   TEXT PRIMARY KEY,
//         value TEXT NOT NULL DEFAULT ''
//     )`);

//     db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('dolibarr_url', '')`);
//     db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('dolibarr_api_key', '')`);

//     db.run(`CREATE TABLE IF NOT EXISTS sales (
//         id             INTEGER PRIMARY KEY AUTOINCREMENT,
//         order_id       TEXT    NOT NULL,
//         product_sku    TEXT    NOT NULL,
//         product_name   TEXT,
//         quantity       INTEGER NOT NULL DEFAULT 1,
//         unit_price     REAL    NOT NULL DEFAULT 0,
//         total          REAL    NOT NULL DEFAULT 0,
//         customer_email TEXT,
//         status         TEXT    DEFAULT 'completed',
//         source         TEXT    DEFAULT 'wordpress',
//         created_at     INTEGER DEFAULT (strftime('%s','now'))
//     )`);
// });

// module.exports = db;


const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err.message);
        process.exit(1);
    }
    console.log('Base de datos conectada:', DB_PATH);
});

db.serialize(() => {

    // =========================
    // USERS (Segurizado)
    // =========================
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        username            TEXT UNIQUE NOT NULL,
        email               TEXT UNIQUE NOT NULL,
        password            TEXT NOT NULL,
        role                TEXT NOT NULL DEFAULT 'user',
        reset_token         TEXT,
        reset_token_expires INTEGER,
        created_at          INTEGER DEFAULT (strftime('%s','now'))
    )`);

    // =========================
    // PRODUCTS (Segurizado con CHECK)
    // =========================
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        sku         TEXT UNIQUE NOT NULL,
        name        TEXT NOT NULL,
        description TEXT,
        price       REAL NOT NULL DEFAULT 0,
        stock       INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
        category    TEXT,
        created_at  INTEGER DEFAULT (strftime('%s','now')),
        updated_at  INTEGER DEFAULT (strftime('%s','now'))
    )`);

    // =========================
    // STOCK MOVEMENTS
    // =========================
    db.run(`CREATE TABLE IF NOT EXISTS stock_movements (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id      INTEGER NOT NULL,
        quantity_change INTEGER NOT NULL,
        reason          TEXT,
        created_by      INTEGER,
        created_at      INTEGER DEFAULT (strftime('%s','now')),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`);

    // =========================
    // API TOKENS (Fusionado: Código robusto pero con nombre original 'token')
    // =========================
    db.run(`CREATE TABLE IF NOT EXISTS api_tokens (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        token       TEXT NOT NULL,  -- <-- Volvemos al nombre original para que no falle el menú
        scope       TEXT NOT NULL,
        description TEXT,
        created_by  INTEGER,
        created_at  INTEGER DEFAULT (strftime('%s','now'))
    )`);

    // =========================
    // SETTINGS (Sensibles Protegidos)
    // =========================
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT ''
    )`);

    // ⚠️ IMPORTANTE: Se insertan vacíos para no guardar claves en texto plano
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('dolibarr_url', '')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('dolibarr_api_key', '')`);

    // =========================
    // SALES (Segurizado con CHECK)
    // =========================
    db.run(`CREATE TABLE IF NOT EXISTS sales (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id       TEXT NOT NULL,
        product_sku    TEXT NOT NULL,
        product_name   TEXT,
        quantity       INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
        unit_price     REAL NOT NULL DEFAULT 0,
        total          REAL NOT NULL DEFAULT 0,
        customer_email TEXT,
        status         TEXT DEFAULT 'completed',
        source         TEXT DEFAULT 'wordpress',
        created_at     INTEGER DEFAULT (strftime('%s','now'))
    )`);

});

// =========================
// HELPERS DE SEGURIDAD (Se quedan para blindar la app)
// =========================

function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Exportamos como objeto para tus funciones de seguridad internas
module.exports = {
    db,
    hashPassword,
    generateToken,
    hashToken
};