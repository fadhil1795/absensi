import { Router } from 'express';
import db from '../db';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Get all Karyawan (Super Admin) or Filter by Instansi
router.get('/', authenticate, async (req: any, res) => {
    const { instansi_id } = req.query;

    try {
        let query = `
            SELECT k.*, i.nama as instansi_nama, s.nama as shift_nama, d.nama as departemen_nama
            FROM karyawan k 
            LEFT JOIN instansi i ON k.instansi_id = i.id
            LEFT JOIN shifts s ON k.shift_id = s.id
            LEFT JOIN departemen d ON k.departemen_id = d.id
        `;
        const params: any[] = [];

        // If Instansi Admin, force filter by their instansi
        if (req.user.role !== 'SUPER_ADMIN') {
            query += ' WHERE k.instansi_id = ?';
            params.push(req.user.instansi_id);
        } else if (instansi_id) {
            // Super Admin optionally filtering by instansi
            query += ' WHERE k.instansi_id = ?';
            params.push(instansi_id);
        }

        query += ' ORDER BY k.created_at DESC';

        const [karyawans] = await db.query<RowDataPacket[]>(query, params);
        res.json(karyawans);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch karyawan data' });
    }
});


// Get Karyawan by ID
router.get('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT k.*, i.nama AS instansi_nama, s.nama AS shift_nama, d.nama AS departemen_nama, k.departemen_id
             FROM karyawan k
             LEFT JOIN instansi i ON k.instansi_id = i.id
             LEFT JOIN shifts s ON k.shift_id = s.id
             LEFT JOIN departemen d ON k.departemen_id = d.id
             WHERE k.id = ?`,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Karyawan not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch karyawan detail' });
    }
});


// Create Karyawan
router.post('/', authenticate, async (req: any, res) => {
    const { pin, nik, nama, departemen, instansi_id, shift_id, departemen_id } = req.body;

    // Validation: Only Super Admin can set instansi_id freely. Instansi Admin defaults to their own.
    let targetInstansiId = instansi_id;
    if (req.user.role !== 'SUPER_ADMIN') {
        targetInstansiId = req.user.instansi_id;
    }

    if (!targetInstansiId) {
        return res.status(400).json({ error: 'Instansi ID is required' });
    }

    try {
        const [result] = await db.query<ResultSetHeader>(
            'INSERT INTO karyawan (pin, nik, nama, departemen, instansi_id, shift_id, departemen_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [pin, nik, nama, departemen || '', targetInstansiId, shift_id || null, departemen_id || null]
        );
        res.json({ id: result.insertId, pin, nik, nama, departemen, instansi_id: targetInstansiId, shift_id, departemen_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create karyawan' });
    }
});

// Bulk Create Karyawan
router.post('/bulk', authenticate, async (req: any, res) => {
    const employees = req.body; // Expecting array of { pin, nik, nama, departemen, instansi_id, shift_id, departemen_id }

    if (!Array.isArray(employees) || employees.length === 0) {
        return res.status(400).json({ error: 'Invalid data format. Expected non-empty array.' });
    }

    try {
        const values: any[] = [];
        const placeholders: string[] = [];

        for (const emp of employees) {
            let targetInstansiId = emp.instansi_id;
            // Force instansi_id for non-super admins
            if (req.user.role !== 'SUPER_ADMIN') {
                targetInstansiId = req.user.instansi_id;
            }
            if (!targetInstansiId) continue;

            values.push(emp.pin, emp.nik, emp.nama, emp.departemen || '', targetInstansiId, emp.shift_id || null, emp.departemen_id || null);
            placeholders.push('(?, ?, ?, ?, ?, ?, ?, NOW())');
        }

        if (values.length === 0) {
            return res.status(400).json({ error: 'No valid employees to insert.' });
        }

        const query = `INSERT INTO karyawan (pin, nik, nama, departemen, instansi_id, shift_id, departemen_id, created_at) VALUES ${placeholders.join(', ')}`;

        await db.query(query, values);

        res.json({ message: `Successfully imported ${placeholders.length} employees.` });
    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ error: 'Failed to import employees. Check for duplicate PINs or NIKs.' });
    }
});

// Update Karyawan
router.put('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { pin, nik, nama, departemen, instansi_id, shift_id, departemen_id } = req.body;

    try {
        // Validation for Non-Super Admin
        let targetInstansiId = instansi_id;

        if (req.user.role !== 'SUPER_ADMIN') {
            // Check if employee belongs to this admin's instansi
            const [existing] = await db.query<RowDataPacket[]>('SELECT instansi_id FROM karyawan WHERE id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({ error: 'Karyawan not found' });
            }
            if (existing[0].instansi_id !== req.user.instansi_id) {
                return res.status(403).json({ error: 'Forbidden: Cannot edit employee from another instansi' });
            }
            // Force instansi_id to remain as current user's instansi (cannot move employee)
            targetInstansiId = req.user.instansi_id;
        }

        await db.query(
            'UPDATE karyawan SET pin = ?, nik = ?, nama = ?, departemen = ?, instansi_id = ?, shift_id = ?, departemen_id = ? WHERE id = ?',
            [pin, nik, nama, departemen || '', targetInstansiId, shift_id || null, departemen_id || null, id]
        );
        res.json({ id, pin, nik, nama, departemen, instansi_id: targetInstansiId, shift_id, departemen_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update karyawan' });
    }
});

// Delete Karyawan
router.delete('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;

    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            // Check permission
            const [existing] = await db.query<RowDataPacket[]>('SELECT instansi_id FROM karyawan WHERE id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({ error: 'Karyawan not found' });
            }
            if (existing[0].instansi_id !== req.user.instansi_id) {
                return res.status(403).json({ error: 'Forbidden: Cannot delete employee from another instansi' });
            }
        }

        await db.query('DELETE FROM karyawan WHERE id = ?', [id]);
        res.json({ message: 'Karyawan deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete karyawan' });
    }
});

export default router;
