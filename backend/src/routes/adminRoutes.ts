import { Router } from 'express';
import db from '../db';
import bcrypt from 'bcrypt';
import { authenticate } from '../middleware/authMiddleware';
import { RowDataPacket } from 'mysql2';

const router = Router();

// GET All Admins (Super Admin Only)
router.get('/', authenticate, async (req: any, res) => {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Forbidden' });

    try {
        const [users] = await db.query<RowDataPacket[]>(`
            SELECT a.id, a.username, a.nama, a.role, a.role_id, a.instansi_id, a.created_at, 
                   i.nama as instansi_nama, r.name as role_name
            FROM admin a
            LEFT JOIN instansi i ON a.instansi_id = i.id
            LEFT JOIN roles r ON a.role_id = r.id
            ORDER BY a.created_at DESC
        `);
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
});

// CREATE Admin
router.post('/', authenticate, async (req: any, res) => {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Forbidden' });

    const { username, password, nama, instansi_id, role, role_id } = req.body;

    if (!username || !password || !nama) return res.status(400).json({ error: 'Missing required fields' });

    try {
        // Check username uniqueness
        const [existing] = await db.query<RowDataPacket[]>('SELECT id FROM admin WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(400).json({ error: 'Username already taken' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const targetRole = role || 'ADMIN'; // Default to ADMIN

        await db.query(
            'INSERT INTO admin (username, password_hash, nama, role, role_id, instansi_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [username, hashedPassword, nama, targetRole, role_id || null, instansi_id || null]
        );

        res.status(201).json({ message: 'Admin created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create admin' });
    }
});

// UPDATE Admin
router.put('/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    const { username, password, nama, instansi_id, role, role_id } = req.body;

    try {
        const fields = [];
        const params = [];

        if (username) { fields.push('username = ?'); params.push(username); }
        if (nama) { fields.push('nama = ?'); params.push(nama); }
        if (role) { fields.push('role = ?'); params.push(role); }
        if (role_id !== undefined) { fields.push('role_id = ?'); params.push(role_id || null); }
        if (instansi_id !== undefined) { fields.push('instansi_id = ?'); params.push(instansi_id || null); }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            fields.push('password_hash = ?');
            params.push(hashedPassword);
        }

        if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

        params.push(id);

        await db.query(`UPDATE admin SET ${fields.join(', ')} WHERE id = ?`, params);
        res.json({ message: 'Admin updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update admin' });
    }
});

// DELETE Admin
router.delete('/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;

    if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });

    try {
        await db.query('DELETE FROM admin WHERE id = ?', [id]);
        res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete admin' });
    }
});

export default router;
