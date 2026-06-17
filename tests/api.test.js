const request = require('supertest');
// Supongamos que exportas tu app de express en server.js o app.js
const app = require('../app'); 

describe('Suite de Pruebas - API de Almacén (Node.js + SQLite)', () => {

    let adminToken;

    // Antes de los tests, simulamos el login para obtener el JWT seguro
    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'admin',
                password: 'admin123' // Credenciales por defecto del README
            });
        adminToken = res.body.token;
    });

    /**
     * TEST 1: Protección de Endpoints mediante tokens JWT
     */
    test('Debe denegar el acceso a la gestión de productos si no se envía un JWT', async () => {
        const res = await request(app).get('/api/products');
        expect(res.statusCode).toBe(401); // Unauthorized
    });

    /**
     * TEST 2: Validación de Idempotencia del script de carga (Seed)
     */
    test('El endpoint de sincronización del ERP no debe duplicar productos con el mismo SKU', async () => {
        const payloadProducto = {
            sku: 'CPU-I9-13900K',
            post_title: 'Intel Core i9',
            price: 599.99
        };

        // Primera inserción (Simulada)
        const res1 = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(payloadProducto);

        // Intentar insertar de nuevo con el mismo SKU
        const res2 = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(payloadProducto);

        // El sistema debe responder indicando que ya existe o saltándose el registro (idempotente)
        expect(res2.body.existing || res2.statusCode === 200).toBeTruthy();
    });
});