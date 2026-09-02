const express = require('express');
const app = express();
app.use(express.json());
const roleRoutes = require('./src/routes/roleRoutes').default;
const jwt = require('jsonwebtoken');

// Mock auth middleware for testing
app.use((req, res, next) => {
    req.user = { id: 1, role: 'SUPER_ADMIN', username: 'test', nama: 'Test' };
    req.headers.authorization = 'Bearer testtoken';
    next();
});

// override the jwt verify for authenticate middleware inside roleRoutes
jwt.verify = () => ({ id: 1, role: 'SUPER_ADMIN' });

app.use('/api/roles', roleRoutes);

const request = require('supertest');
(async () => {
    try {
        const res = await request(app)
            .put('/api/roles/3')
            .send({
                name: 'askara',
                description: 'Updating description',
                permissions: ['dashboard', 'reports']
            });
        console.log('STATUS:', res.status);
        console.log('BODY:', res.body);
    } catch(e) {
        console.error('ERROR:', e);
    }
    process.exit(0);
})();
