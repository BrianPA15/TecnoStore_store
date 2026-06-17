// const sqlite3 = require('sqlite3').verbose();
// const fs = require('fs');
// const path = require('path');

// const args = process.argv.slice(2);
// const dbArg  = args.find(a => a.startsWith('--db='));
// const outArg = args.find(a => a.startsWith('--output='));

// if (!dbArg || !outArg) {
//     console.error('Uso: node generate-export.js --db=<ruta> --output=<fichero.csv>');
//     process.exit(1);
// }

// const dbPath  = dbArg.split('=')[1];
// const outPath = outArg.split('=')[1];

// const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
//     if (err) { console.error(err.message); process.exit(1); }
// });

// db.all('SELECT * FROM products ORDER BY name ASC', (err, rows) => {
//     if (err) { console.error(err.message); process.exit(1); }

//     const header = 'id,sku,name,description,price,stock,category,created_at,updated_at\n';
//     const lines = rows.map(r =>
//         [r.id, r.sku, `"${(r.name||'').replace(/"/g,'""')}"`,
//          `"${(r.description||'').replace(/"/g,'""')}"`,
//          r.price, r.stock, r.category, r.created_at, r.updated_at].join(',')
//     );

//     const dir = path.dirname(outPath);
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

//     fs.writeFileSync(outPath, header + lines.join('\n'), 'utf8');
//     console.log(`Exportados ${rows.length} productos → ${outPath}`);
//     db.close();
// });


const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

const dbArg  = args.find(a => a.startsWith('--db='));
const outArg = args.find(a => a.startsWith('--output='));

if (!dbArg || !outArg) {
    console.error('Uso: node generate-export.js --db=<ruta> --output=<fichero.csv>');
    process.exit(1);
}

const dbPath  = path.resolve(dbArg.split('=')[1]);
const outPath = path.resolve(outArg.split('=')[1]);

// 🔒 restringir a carpeta del proyecto
const BASE_DIR = process.cwd();
if (!dbPath.startsWith(BASE_DIR) || !outPath.startsWith(BASE_DIR)) {
    console.error('Ruta no permitida.');
    process.exit(1);
}

// 🔒 solo permitir .csv
if (!outPath.endsWith('.csv')) {
    console.error('El archivo de salida debe ser .csv');
    process.exit(1);
}

// sanitizar CSV (previene Excel injection)
const sanitizeCSV = (value) => {
    if (!value) return '';
    const str = String(value).replace(/"/g, '""');

    // prevenir fórmulas peligrosas
    if (/^[=+\-@]/.test(str)) {
        return `'${str}`;
    }

    return str;
};

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error abriendo DB');
        process.exit(1);
    }
});

const stream = fs.createWriteStream(outPath, { encoding: 'utf8' });

// cabecera
stream.write('id,sku,name,description,price,stock,category,created_at,updated_at\n');

// usar each para no cargar todo en memoria
db.each(
    'SELECT * FROM products ORDER BY name ASC',
    (err, r) => {
        if (err) return;

        const line = [
            r.id,
            r.sku,
            `"${sanitizeCSV(r.name)}"`,
            `"${sanitizeCSV(r.description)}"`,
            r.price,
            r.stock,
            sanitizeCSV(r.category),
            r.created_at,
            r.updated_at
        ].join(',');

        stream.write(line + '\n');
    },
    (err, count) => {
        if (err) {
            console.error('Error exportando');
        } else {
            console.log(`Exportados ${count} productos → ${outPath}`);
        }

        stream.end(() => {
            db.close();
        });
    }
);
