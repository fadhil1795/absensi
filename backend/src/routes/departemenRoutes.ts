import { Router } from 'express';
import db from '../db';
import { authenticate } from '../middleware/authMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// List Departments (with pagination and search)
router.get('/', authenticate, async (req: any, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        // If limit is 'all' or very large for dropdowns
        const limitVal = Number(limit) || 10;
        const pageVal = Number(page) || 1;
        const offset = (pageVal - 1) * limitVal;

        let query = `SELECT * FROM departemen`;
        const params: any[] = [];
        const whereClauses: string[] = [];

        // Note: Departments are now effectively global reference data managed by Super Admin.
        // Determining visibility:
        // - Super Admin: Sees all (obviously)
        // - Instansi Admin: Needs to see them to assign to employees.
        // Since we removed 'manager' assignment, we can't filter by owner.
        // We will allow ALL authenticated users to see ALL departments.

        if (search) {
            whereClauses.push('(nama LIKE ?)');
            params.push(`%${search}%`);
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limitVal, offset);

        const [depts] = await db.query<RowDataPacket[]>(query, params);

        // Get total count
        let countQuery = `SELECT COUNT(*) as total FROM departemen`;
        if (whereClauses.length > 0) {
            countQuery += ' WHERE ' + whereClauses.join(' AND ');
        }
        const countParams = params.slice(0, params.length - 2);
        const [totalRes] = await db.query<RowDataPacket[]>(countQuery, countParams);

        res.json({
            data: depts,
            total: totalRes[0].total,
            page: pageVal,
            limit: limitVal
        });

    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// Create Department
router.post('/', authenticate, async (req: any, res) => {
    const { nama } = req.body;
    console.log('[DEBUG] Create Department Request');
    console.log('[DEBUG] User:', req.user);
    console.log('[DEBUG] Body:', req.body);

    // Strict Role Check for Modification
    if (req.user.role !== 'SUPER_ADMIN') {
        console.log('[DEBUG] Start Failed: Role is', req.user.role);
        return res.status(403).json({ error: 'Forbidden: Only Super Admin can create departments' });
    }

    if (!nama) {
        console.log('[DEBUG] Failed: Nama is empty');
        return res.status(400).json({ error: 'Nama departemen is required' });
    }

    try {
        // We removed karyawan_id support as requested
        const [result] = await db.query<ResultSetHeader>(
            'INSERT INTO departemen (nama, created_at) VALUES (?, NOW())',
            [nama]
        );
        console.log('[DEBUG] Success. ID:', result.insertId);
        res.json({ id: result.insertId, nama });
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
});

// Update Department
router.put('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { nama } = req.body;

    if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Only Super Admin can update departments' });
    }

    try {
        await db.query(
            'UPDATE departemen SET nama = ? WHERE id = ?',
            [nama, id]
        );
        res.json({ id, nama });
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ error: 'Failed to update department' });
    }
});

// Delete Department
router.delete('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;

    if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Only Super Admin can delete departments' });
    }

    try {
        await db.query('DELETE FROM departemen WHERE id = ?', [id]);
        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ error: 'Failed to delete department' });
    }
});

export default router;
