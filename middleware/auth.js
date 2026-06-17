// const jwt = require('jsonwebtoken');

// const JWT_SECRET = process.env.JWT_SECRET || 'w4r3h0us3_jwt_s3cr3t';

// function authMiddleware(req, res, next) {
//     const authHeader = req.headers['authorization'];
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//         return res.status(401).json({ error: 'Token de autenticación requerido.' });
//     }

//     const token = authHeader.split(' ')[1];
//     try {
//         const decoded = jwt.verify(token, JWT_SECRET);
//         req.user = decoded;
//         next();
//     } catch (err) {
//         return res.status(401).json({ error: 'Token inválido o expirado.' });
//     }
// }

// function adminMiddleware(req, res, next) {
//     if (!req.user || req.user.role !== 'admin') {
//         return res.status(403).json({ error: 'Acceso restringido a administradores.' });
//     }
//     next();
// }

// // Middleware para tokens de API generados para WordPress (scope-based)
// function apiTokenMiddleware(requiredScope) {
//     return (req, res, next) => {
//         const authHeader = req.headers['authorization'];
//         if (!authHeader || !authHeader.startsWith('Bearer ')) {
//             return res.status(401).json({ error: 'Token de API requerido.' });
//         }

//         const token = authHeader.split(' ')[1];
//         try {
//             const decoded = jwt.verify(token, JWT_SECRET);

//             // Tokens de usuario del panel tienen acceso completo a la API de productos
//             if (decoded.type === 'user') {
//                 req.user = decoded;
//                 return next();
//             }

//             // Tokens de API generados para WordPress
//             if (decoded.type === 'warehouse_api') {
//                 const scopes = decoded.scope ? decoded.scope.split(' ') : [];
//                 if (scopes.includes(requiredScope) || scopes.includes('admin')) {
//                     req.apiToken = decoded;
//                     return next();
//                 }
//                 return res.status(403).json({ error: `Scope insuficiente. Se requiere: ${requiredScope}` });
//             }

//             return res.status(401).json({ error: 'Tipo de token no reconocido.' });
//         } catch (err) {
//             return res.status(401).json({ error: 'Token inválido o expirado.' });
//         }
//     };
// }

// module.exports = { authMiddleware, adminMiddleware, apiTokenMiddleware };


const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
throw new Error('JWT_SECRET no definido en entorno');
}

const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
const authHeader = req.headers['authorization'];

if (!authHeader?.startsWith('Bearer ')) {
return res.status(401).json({ error: 'Token requerido.' });
}

const token = authHeader.split(' ')[1];

try {
const decoded = jwt.verify(token, JWT_SECRET, {
algorithms: ['HS256']
});

req.user = decoded;
return next();

} catch (err) {
return res.status(401).json({ error: 'Token inválido.' });
}
}

function adminMiddleware(req, res, next) {
if (req.user?.role !== 'admin') {
return res.status(403).json({ error: 'Solo administradores.' });
}
next();
}

function apiTokenMiddleware(requiredScope) {
return (req, res, next) => {
const authHeader = req.headers['authorization'];

if (!authHeader?.startsWith('Bearer ')) {
return res.status(401).json({ error: 'Token requerido.' });
}

try {
const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);

if (decoded.type === 'user') {
req.user = decoded;
return next();
}

if (decoded.type === 'warehouse_api') {
const scopes = decoded.scope?.split(' ') || [];

if (scopes.includes(requiredScope) || scopes.includes('admin')) {
req.apiToken = decoded;
return next();
}

return res.status(403).json({ error: 'Permisos insuficientes.' });
}

return res.status(401).json({ error: 'Token no válido.' });

} catch {
return res.status(401).json({ error: 'Token inválido.' });
}
};
}

module.exports = { authMiddleware, adminMiddleware, apiTokenMiddleware }; 
  
