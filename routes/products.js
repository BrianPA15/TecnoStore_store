// const express = require('express');
// const db = require('../config/database');
// const { authMiddleware, apiTokenMiddleware } = require('../middleware/auth');
// const dolibarr = require('../lib/dolibarr');

// const router = express.Router();

// // GET /api/products — compatible con WordPress (acepta JWT de usuario O token de API con scope read:products)
// router.get('/', apiTokenMiddleware('read:products'), (req, res) => {
//     const search = req.query.search || '';
//     const category = req.query.category || '';

//     let query;

//     if (search) {
//         // VULNERABLE: concatenación directa → SQL Injection
//         query = `SELECT * FROM products WHERE (name LIKE '%${search}%' OR sku LIKE '%${search}%' OR description LIKE '%${search}%')`;
//         if (category) query += ` AND category = '${category}'`;
//         query += ' ORDER BY name ASC';
//     } else if (category) {
//         query = `SELECT * FROM products WHERE category = '${category}' ORDER BY name ASC`;
//     } else {
//         query = 'SELECT * FROM products ORDER BY name ASC';
//     }

//     db.all(query, (err, rows) => {
//         if (err) {
//             // Mensaje de error detallado → information disclosure
//             return res.status(500).json({ error: err.message, query });
//         }
//         res.json(rows);
//     });
// });

// // GET /api/products/:id
// router.get('/:id', authMiddleware, (req, res) => {
//     db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
//         if (err) return res.status(500).json({ error: err.message });
//         if (!row) return res.status(404).json({ error: 'Producto no encontrado.' });
//         res.json(row);
//     });
// });

// // POST /api/products
// router.post('/', authMiddleware, (req, res) => {
//     const { sku, name, description, price, stock, category } = req.body;

//     if (!sku || !name) {
//         return res.status(400).json({ error: 'SKU y nombre son obligatorios.' });
//     }

//     db.run(
//         `INSERT INTO products (sku, name, description, price, stock, category)
//          VALUES (?, ?, ?, ?, ?, ?)`,
//         [sku, name, description || '', price || 0, stock || 0, category || ''],
//         function (err) {
//             if (err) return res.status(500).json({ error: err.message });
//             db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, row) => {
//                 // Sincronizar con Dolibarr en segundo plano (no bloquea la respuesta)
//                 dolibarr.createProduct(db, row).catch(() => {});
//                 res.status(201).json(row);
//             });
//         }
//     );
// });

// // PUT /api/products/:id
// router.put('/:id', authMiddleware, (req, res) => {
//     const { sku, name, description, price, stock, category } = req.body;

//     db.run(
//         `UPDATE products SET sku=?, name=?, description=?, price=?, stock=?, category=?,
//          updated_at=strftime('%s','now') WHERE id=?`,
//         [sku, name, description, price, stock, category, req.params.id],
//         function (err) {
//             if (err) return res.status(500).json({ error: err.message });
//             if (this.changes === 0) return res.status(404).json({ error: 'Producto no encontrado.' });

//             db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
//                 res.json(row);
//             });
//         }
//     );
// });

// // PATCH /api/products/:id/stock — actualizar stock con registro de movimiento
// router.patch('/:id/stock', authMiddleware, (req, res) => {
//     const { quantity, reason } = req.body;
//     const productId = req.params.id;

//     if (quantity === undefined) {
//         return res.status(400).json({ error: 'El campo quantity es obligatorio.' });
//     }

//     db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
//         if (err) return res.status(500).json({ error: err.message });
//         if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });

//         const newStock = product.stock + parseInt(quantity);

//         db.run(
//             `UPDATE products SET stock = ?, updated_at = strftime('%s','now') WHERE id = ?`,
//             [newStock, productId],
//             (err) => {
//                 if (err) return res.status(500).json({ error: err.message });

//                 db.run(
//                     `INSERT INTO stock_movements (product_id, quantity_change, reason, created_by)
//                      VALUES (?, ?, ?, ?)`,
//                     [productId, quantity, reason || '', req.user.userId]
//                 );

//                 res.json({ success: true, stock: newStock });
//             }
//         );
//     });
// });

// // GET /api/products/:id/movements — historial de movimientos
// router.get('/:id/movements', authMiddleware, (req, res) => {
//     db.all(
//         `SELECT sm.*, u.username FROM stock_movements sm
//          LEFT JOIN users u ON sm.created_by = u.id
//          WHERE sm.product_id = ? ORDER BY sm.created_at DESC LIMIT 50`,
//         [req.params.id],
//         (err, rows) => {
//             if (err) return res.status(500).json({ error: err.message });
//             res.json(rows);
//         }
//     );
// });

// // DELETE /api/products/:id
// router.delete('/:id', authMiddleware, (req, res) => {
//     db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
//         if (err) return res.status(500).json({ error: err.message });
//         if (this.changes === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
//         res.json({ success: true });
//     });
// });

// module.exports = router;


const express = require('express');
// const db = require('../config/database');
const { db } = require('../config/database');
const { authMiddleware, adminMiddleware, apiTokenMiddleware } = require('../middleware/auth');
const dolibarr = require('../lib/dolibarr');

const router = express.Router();

// ================= GET PRODUCTS =================
router.get('/', apiTokenMiddleware('read:products'), (req, res) => {
    const search = req.query.search || '';
    const category = req.query.category || '';

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
        query += ` AND (name LIKE ? OR sku LIKE ? OR description LIKE ?)`;
        const like = `%${search}%`;
        params.push(like, like, like);
    }

    if (category) {
        query += ` AND category = ?`;
        params.push(category);
    }

    query += ' ORDER BY name ASC';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }
        res.json(rows);
    });
});

// ================= GET PRODUCT =================
router.get('/:id', authMiddleware, (req, res) => {
    db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Error interno.' });
        if (!row) return res.status(404).json({ error: 'Producto no encontrado.' });
        res.json(row);
    });
});

// ================= CREATE PRODUCT =================
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
    let { sku, name, description, price, stock, category } = req.body;

    if (!sku || !name) {
        return res.status(400).json({ error: 'SKU y nombre son obligatorios.' });
    }

    price = Number(price) || 0;
    stock = Number(stock) || 0;

    if (price < 0 || stock < 0) {
        return res.status(400).json({ error: 'Precio y stock no pueden ser negativos.' });
    }

    db.run(
        `INSERT INTO products (sku, name, description, price, stock, category)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sku, name, description || '', price, stock, category || ''],
        function (err) {
            if (err) return res.status(500).json({ error: 'Error al crear producto.' });

            db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, row) => {
                if (row) {
                    dolibarr.createProduct(db, row).catch(() => {});
                }
                res.status(201).json(row);
            });
        }
    );
});

// ================= UPDATE PRODUCT =================
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
    let { sku, name, description, price, stock, category } = req.body;

    price = Number(price);
    stock = Number(stock);

    if (isNaN(price) || isNaN(stock)) {
        return res.status(400).json({ error: 'Precio y stock deben ser numéricos.' });
    }

    db.run(
        `UPDATE products SET sku=?, name=?, description=?, price=?, stock=?, category=?,
         updated_at=strftime('%s','now') WHERE id=?`,
        [sku, name, description, price, stock, category, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: 'Error al actualizar.' });
            if (this.changes === 0) return res.status(404).json({ error: 'Producto no encontrado.' });

            db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
                res.json(row);
            });
        }
    );
});

// ================= UPDATE STOCK =================
router.patch('/:id/stock', authMiddleware, (req, res) => {
    const { quantity, reason } = req.body;
    const productId = req.params.id;

    const qty = Number(quantity);

    if (isNaN(qty)) {
        return res.status(400).json({ error: 'Cantidad inválida.' });
    }

    // límite anti abuso
    if (Math.abs(qty) > 10000) {
        return res.status(400).json({ error: 'Cantidad demasiado grande.' });
    }

    db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) return res.status(500).json({ error: 'Error interno.' });
        if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });

        const newStock = product.stock + qty;

        if (newStock < 0) {
            return res.status(400).json({ error: 'Stock no puede ser negativo.' });
        }

        db.run(
            `UPDATE products SET stock = ?, updated_at = strftime('%s','now') WHERE id = ?`,
            [newStock, productId],
            (err) => {
                if (err) return res.status(500).json({ error: 'Error actualizando stock.' });

                db.run(
                    `INSERT INTO stock_movements (product_id, quantity_change, reason, created_by)
                     VALUES (?, ?, ?, ?)`,
                    [productId, qty, reason || '', req.user.userId]
                );

                res.json({ success: true, stock: newStock });
            }
        );
    });
});

// ================= MOVEMENTS =================
router.get('/:id/movements', authMiddleware, (req, res) => {
    db.all(
        `SELECT sm.*, u.username FROM stock_movements sm
         LEFT JOIN users u ON sm.created_by = u.id
         WHERE sm.product_id = ? ORDER BY sm.created_at DESC LIMIT 50`,
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Error interno.' });
            res.json(rows);
        }
    );
});

// ================= DELETE =================
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: 'Error al eliminar.' });
        if (this.changes === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
        res.json({ success: true });
    });
});

module.exports = router;
