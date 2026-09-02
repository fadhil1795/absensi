import { Router } from 'express';
import db from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logAction } from '../utils/logger';
import { getPermissionsForRole, ALL_PERMISSIONS } from '../middleware/permissionMiddleware';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_do_not_share';

// Register Instansi + Admin (Public)
router.post('/register', async (req, res) => {
    const { kode, nama_instansi, alamat, telepon, email, username, password, nama_admin } = req.body;

    try {
        // Check if username or kode exists
        const [existingAdmin] = await db.query<RowDataPacket[]>(
            'SELECT id FROM admin WHERE username = ?',
            [username]
        );
        if (existingAdmin.length > 0) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const [existingInstansi] = await db.query<RowDataPacket[]>(
            'SELECT id FROM instansi WHERE kode = ?',
            [kode]
        );
        if (existingInstansi.length > 0) {
            return res.status(400).json({ error: 'Kode Instansi already taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Start transaction
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Create Instansi
            const [instansiResult] = await connection.query<ResultSetHeader>(
                'INSERT INTO instansi (kode, nama, alamat, telepon, email, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [kode, nama_instansi, alamat, telepon, email]
            );
            const instansiId = instansiResult.insertId;

            // Create Admin
            await connection.query(
                'INSERT INTO admin (username, password_hash, nama, role, instansi_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [username, hashedPassword, nama_admin, 'ADMIN', instansiId]
            );

            await connection.commit();
            connection.release();

            res.json({ message: 'Registration successful', instansi_id: instansiId });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [admins] = await db.query<RowDataPacket[]>(
            `SELECT a.*, r.name as role_name, r.is_system,
                    i.id as inst_id, i.kode as instansi_kode, i.nama as instansi_nama 
             FROM admin a 
             LEFT JOIN instansi i ON a.instansi_id = i.id 
             LEFT JOIN roles r ON a.role_id = r.id
             WHERE a.username = ?`,
            [username]
        );

        if (admins.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = admins[0];
        const validPassword = await bcrypt.compare(password, admin.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get permissions for the user's role
        let permissions: string[] = [];
        if (admin.role === 'SUPER_ADMIN') {
            // Super admin gets all permissions
            permissions = ALL_PERMISSIONS.map(p => p.key);
        } else if (admin.role_id) {
            permissions = await getPermissionsForRole(admin.role_id);
        }

        const token = jwt.sign(
            { id: admin.id, role: admin.role, instansi_id: admin.instansi_id },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: admin.id,
                username: admin.username,
                role: admin.role,
                role_id: admin.role_id,
                role_name: admin.role_name || admin.role,
                nama: admin.nama,
                permissions,
                instansi: admin.instansi_id ? {
                    id: admin.instansi_id,
                    kode: admin.instansi_kode,
                    nama: admin.instansi_nama
                } : null
            }
        });

        // Log Login
        logAction(admin.id, admin.nama, 'LOGIN', { role: admin.role, ip: req.ip });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /me - Get current user info with fresh permissions
router.get('/me', authenticate, async (req: any, res) => {
    try {
        const user = req.user;

        let permissions: string[] = [];
        if (user.role === 'SUPER_ADMIN') {
            permissions = ALL_PERMISSIONS.map(p => p.key);
        } else if (user.role_id) {
            permissions = await getPermissionsForRole(user.role_id);
        }

        // Get role info
        let roleInfo = null;
        if (user.role_id) {
            const [roles] = await db.query<RowDataPacket[]>(
                'SELECT id, name, description, is_system FROM roles WHERE id = ?',
                [user.role_id]
            );
            if (roles.length > 0) roleInfo = roles[0];
        }

        res.json({
            id: user.id,
            username: user.username,
            nama: user.nama,
            role: user.role,
            role_id: user.role_id,
            role_name: roleInfo?.name || user.role,
            instansi_id: user.instansi_id,
            permissions
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

export default router;
