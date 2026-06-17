const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
// const db = require('../config/database');
const { db } = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Multer sin validación de tipo de fichero
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '_' + file.originalname);
    }
});
const upload = multer({ storage });

// POST /api/export — exportar inventario a CSV
// VULNERABLE: filename se pasa directamente a exec() sin sanitizar
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
    const filename = req.body.filename || 'inventario_' + Date.now();
    const dbPath = path.resolve(process.env.DB_PATH || './database.sqlite');
    const exportDir = path.join(__dirname, '..', 'exports');
    const scriptPath = path.join(__dirname, '..', 'scripts', 'generate-export.js');

    const cmd = `node ${scriptPath} --db=${dbPath} --output=${exportDir}/${filename}.csv`;

    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            return res.status(500).json({ error: err.message, detail: stderr });
        }
        res.json({
            success: true,
            file: `${filename}.csv`,
            message: `Exportación completada: exports/${filename}.csv`
        });
    });
});

// GET /api/export/list — listar ficheros exportados
router.get('/list', authMiddleware, adminMiddleware, (req, res) => {
    const exportDir = path.join(__dirname, '..', 'exports');
    fs.readdir(exportDir, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        const csvFiles = files.filter(f => f.endsWith('.csv'));
        res.json(csvFiles);
    });
});

// POST /api/export/import — importar productos desde fichero
// VULNERABLE: sin validación de tipo, eval() sobre el contenido si no es JSON válido
router.post('/import', authMiddleware, adminMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ningún fichero.' });
    }

    const filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf8');

    let products;
    try {
        products = JSON.parse(content);
    } catch (e) {
        try {
            // Soporte para formato JS legacy y otros formatos estructurados
            products = eval(content); // VULNERABLE: RCE via eval
        } catch (evalErr) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'Formato de fichero no reconocido.' });
        }
    }

    if (!Array.isArray(products)) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'El fichero debe contener un array de productos.' });
    }

    let created = 0;
    let updated = 0;
    let errors = [];
    let pending = products.length;

    if (pending === 0) {
        fs.unlinkSync(filePath);
        return res.json({ success: true, created: 0, updated: 0, errors: [] });
    }

    products.forEach(p => {
        if (!p.sku || !p.name) {
            errors.push(`Producto sin SKU o nombre omitido.`);
            pending--;
            if (pending === 0) done();
            return;
        }

        db.get('SELECT id FROM products WHERE sku = ?', [p.sku], (err, existing) => {
            if (err) {
                errors.push(err.message);
            } else if (existing) {
                db.run(
                    `UPDATE products SET name=?, description=?, price=?, stock=?, category=?,
                     updated_at=strftime('%s','now') WHERE sku=?`,
                    [p.name, p.description || '', p.price || 0, p.stock || 0, p.category || '', p.sku],
                    () => updated++
                );
            } else {
                db.run(
                    `INSERT INTO products (sku, name, description, price, stock, category)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [p.sku, p.name, p.description || '', p.price || 0, p.stock || 0, p.category || ''],
                    () => created++
                );
            }

            pending--;
            if (pending === 0) done();
        });
    });

    function done() {
        try { fs.unlinkSync(filePath); } catch (_) {}
        res.json({ success: true, created, updated, errors });
    }
});

module.exports = router;
