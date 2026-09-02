import { Router } from 'express';
import db from '../db';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { AuthRequest } from '../middleware/authMiddleware'; // Assuming strict type export, or adjust if AuthRequest is not exported
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { rekapService } from '../services/rekapService';

const router = Router();

// ==========================================
// JENIS CUTI (Leave Types)
// ==========================================

// Get Leave Types
router.get('/types', authenticate, async (req: any, res) => {
    try {
        const { instansi_id } = req.user;
        // Super Admin might want to see all or specific instansi, but for now filtering by user's instansi
        // If super admin and query param exists, use that?
        let query = 'SELECT * FROM jenis_cuti WHERE (instansi_id = ? OR instansi_id IS NULL)';
        const params: any[] = [instansi_id || 0]; // 0 or whatever if super admin sans instansi?

        if (req.user.role === 'SUPER_ADMIN' && req.query.instansi_id) {
            query = 'SELECT * FROM jenis_cuti WHERE (instansi_id = ? OR instansi_id IS NULL)';
            params[0] = req.query.instansi_id;
        } else if (req.user.role === 'SUPER_ADMIN') {
            query = 'SELECT * FROM jenis_cuti'; // Show all for super admin if no filter?
            params.length = 0;
        }

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching leave types:', error);
        res.status(500).json({ error: 'Failed to fetch leave types' });
    }
});

// Create Leave Type
router.post('/types', authenticate, async (req: any, res) => {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && !req.user.role_id) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { nama, kuota, is_paid, instansi_id } = req.body;
    // If Admin, force their instansi_id. If Super Admin, use provided or default.
    const targetInstansiId = req.user.role === 'SUPER_ADMIN' ? (instansi_id || null) : req.user.instansi_id;

    try {
        const [result] = await db.query<ResultSetHeader>(
            'INSERT INTO jenis_cuti (instansi_id, nama, kuota, is_paid) VALUES (?, ?, ?, ?)',
            [targetInstansiId, nama, kuota, is_paid]
        );
        res.json({ id: result.insertId, instansi_id: targetInstansiId, nama, kuota, is_paid });
    } catch (error) {
        console.error('Error creating leave type:', error);
        res.status(500).json({ error: 'Failed to create leave type' });
    }
});

// Delete Leave Type
router.delete('/types/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && !req.user.role_id) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    try {
        await db.query('DELETE FROM jenis_cuti WHERE id = ?', [id]);
        res.json({ message: 'Leave type deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete' });
    }
});


// ==========================================
// HARI LIBUR (Holidays)
// ==========================================

// Get Holidays
router.get('/holidays', authenticate, async (req: any, res) => {
    try {
        let query = 'SELECT * FROM hari_libur WHERE (instansi_id = ? OR instansi_id IS NULL)';
        const params: any[] = [req.user.instansi_id || 0];

        if (req.user.role === 'SUPER_ADMIN') {
            if (req.query.instansi_id) {
                params[0] = req.query.instansi_id;
            } else {
                query = 'SELECT * FROM hari_libur';
                params.length = 0;
            }
        }

        query += ' ORDER BY date ASC';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching holidays:', error);
        res.status(500).json({ error: 'Failed to fetch holidays' });
    }
});

// Add Holiday
router.post('/holidays', authenticate, async (req: any, res) => {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && !req.user.role_id) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { date, description, is_national, instansi_id } = req.body;
    let targetInstansiId = instansi_id;

    if (is_national) {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Only Super Admin can set national holidays' });
        }
        targetInstansiId = null;
    } else {
        targetInstansiId = req.user.role === 'SUPER_ADMIN' ? (instansi_id || null) : req.user.instansi_id;
    }

    try {
        const [result] = await db.query<ResultSetHeader>(
            'INSERT INTO hari_libur (date, description, is_national, instansi_id) VALUES (?, ?, ?, ?)',
            [date, description, is_national, targetInstansiId]
        );
        res.json({ id: result.insertId, date, description, is_national, instansi_id: targetInstansiId });
    } catch (error) {
        console.error('Error creating holiday:', error);
        res.status(500).json({ error: 'Failed to create holiday' });
    }
});

// Delete Holiday
router.delete('/holidays/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && !req.user.role_id) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    try {
        await db.query('DELETE FROM hari_libur WHERE id = ?', [req.params.id]);
        res.json({ message: 'Holiday deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete holiday' });
    }
});


// ==========================================
// CUTI (Leave Requests)
// ==========================================

// GET leave requests
router.get('/requests', authenticate, async (req: AuthRequest, res) => {
    try {
        const { instansi_id } = req.query;
        let query = `
            SELECT i.*, k.nama as nama_karyawan, jc.nama as jenis_cuti, jc.is_paid
            FROM cuti i
            JOIN karyawan k ON i.karyawan_id = k.id
            JOIN jenis_cuti jc ON i.jenis_cuti_id = jc.id
        `;
        const params: any[] = [];

        if (req.user.role === 'SUPER_ADMIN') {
            if (instansi_id) {
                query += ` WHERE k.instansi_id = ?`;
                params.push(instansi_id);
            }
        } else {
            query += ` WHERE k.instansi_id = ?`;
            params.push(req.user.instansi_id);
        }

        query += ' ORDER BY i.created_at DESC';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
});

// Apply for Leave
router.post('/apply', authenticate, async (req: any, res) => {
    const { karyawan_id, jenis_cuti_id, start_date, end_date, reason, status: statusFromBody } = req.body;

    // Admin/SuperAdmin can set status (e.g. APPROVED), others default to PENDING
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || !!req.user.role_id;
    const status = (isAdmin && statusFromBody) ? statusFromBody : 'PENDING';

    try {
        const [result] = await db.query<ResultSetHeader>(
            'INSERT INTO cuti (karyawan_id, jenis_cuti_id, start_date, end_date, reason, status, approved_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [karyawan_id, jenis_cuti_id, start_date, end_date, reason, status, isAdmin ? req.user.id : null]
        );

        if (status === 'APPROVED') {
            const [karyawan] = await db.query<RowDataPacket[]>('SELECT instansi_id FROM karyawan WHERE id = ?', [karyawan_id]);
            if (karyawan.length > 0) {
                const instansiId = karyawan[0].instansi_id;
                const formattedStart = new Date(start_date).toISOString().split('T')[0];
                const formattedEnd = new Date(end_date).toISOString().split('T')[0];
                await rekapService.processRekapRange(instansiId, formattedStart, formattedEnd);
            }
        }

        res.json({ message: `Leave request ${status}`, id: result.insertId });
    } catch (error) {
        console.error('Error applying for leave:', error);
        res.status(500).json({ error: 'Failed to apply for leave' });
    }
});

// Approve/Reject
router.put('/requests/:id/status', authenticate, async (req: any, res) => {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && !req.user.role_id) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { status } = req.body; // APPROVED or REJECTED
    const { id } = req.params;

    try {
        await db.query(
            'UPDATE cuti SET status = ?, approved_by = ? WHERE id = ?',
            [status, req.user.id, id]
        );

        if (status === 'APPROVED') {
            const [leaveReq] = await db.query<RowDataPacket[]>(
                'SELECT c.karyawan_id, c.start_date, c.end_date, k.instansi_id FROM cuti c JOIN karyawan k ON c.karyawan_id = k.id WHERE c.id = ?',
                [id]
            );
            if (leaveReq.length > 0) {
                const { instansi_id, start_date, end_date } = leaveReq[0];
                const formattedStart = new Date(start_date).toISOString().split('T')[0];
                const formattedEnd = new Date(end_date).toISOString().split('T')[0];
                await rekapService.processRekapRange(instansi_id, formattedStart, formattedEnd);
            }
        }

        res.json({ message: `Leave request ${status}` });
    } catch (error) {
        console.error('Error updating leave status:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

export default router;
