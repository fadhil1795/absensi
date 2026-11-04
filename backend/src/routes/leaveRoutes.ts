import { Router } from 'express';
import db from '../db';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { AuthRequest } from '../middleware/authMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { rekapService } from '../services/rekapService';

const router = Router();

const formatLocalDate = (d: any): string => {
    if (!d) return '';
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const dateObj = new Date(d);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

// ==========================================
// JENIS CUTI (Leave Types)
// ==========================================

// Get Leave Types
router.get('/types', authenticate, async (req: any, res) => {
    try {
        const { instansi_id } = req.user;
        let query = 'SELECT * FROM jenis_cuti WHERE (instansi_id = ? OR instansi_id IS NULL)';
        const params: any[] = [instansi_id || 0];

        if (req.user.role === 'SUPER_ADMIN' && req.query.instansi_id) {
            query = 'SELECT * FROM jenis_cuti WHERE (instansi_id = ? OR instansi_id IS NULL)';
            params[0] = req.query.instansi_id;
        } else if (req.user.role === 'SUPER_ADMIN') {
            query = 'SELECT * FROM jenis_cuti';
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
            SELECT i.*, 
                   DATE_FORMAT(i.start_date, '%Y-%m-%d') as start_date,
                   DATE_FORMAT(i.end_date, '%Y-%m-%d') as end_date,
                   k.nama as nama_karyawan, k.nik as nik_karyawan,
                   jc.nama as jenis_cuti, jc.is_paid
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

// GET single leave request by ID
router.get('/requests/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT i.*, 
                    DATE_FORMAT(i.start_date, '%Y-%m-%d') as start_date,
                    DATE_FORMAT(i.end_date, '%Y-%m-%d') as end_date,
                    k.nama as nama_karyawan, k.nik as nik_karyawan, k.departemen,
                    jc.nama as jenis_cuti, jc.is_paid, jc.kuota
             FROM cuti i
             JOIN karyawan k ON i.karyawan_id = k.id
             JOIN jenis_cuti jc ON i.jenis_cuti_id = jc.id
             WHERE i.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching leave request detail:', error);
        res.status(500).json({ error: 'Failed to fetch leave request detail' });
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
                const formattedStart = formatLocalDate(start_date);
                const formattedEnd = formatLocalDate(end_date);
                await rekapService.processRekapRange(instansiId, formattedStart, formattedEnd);
            }
        }

        res.json({ message: `Leave request ${status}`, id: result.insertId });
    } catch (error) {
        console.error('Error applying for leave:', error);
        res.status(500).json({ error: 'Failed to apply for leave' });
    }
});

// Update Leave Request (Edit)
router.put('/requests/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { karyawan_id, jenis_cuti_id, start_date, end_date, reason, status } = req.body;

    try {
        const [existing] = await db.query<RowDataPacket[]>(
            `SELECT c.*, k.instansi_id 
             FROM cuti c 
             JOIN karyawan k ON c.karyawan_id = k.id 
             WHERE c.id = ?`,
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        const oldLeave = existing[0];
        const targetKaryawanId = karyawan_id || oldLeave.karyawan_id;
        const targetJenisCutiId = jenis_cuti_id || oldLeave.jenis_cuti_id;
        const targetStartDate = start_date || formatLocalDate(oldLeave.start_date);
        const targetEndDate = end_date || formatLocalDate(oldLeave.end_date);
        const targetReason = reason !== undefined ? reason : oldLeave.reason;
        const targetStatus = status || oldLeave.status;

        await db.query(
            `UPDATE cuti 
             SET karyawan_id = ?, jenis_cuti_id = ?, start_date = ?, end_date = ?, reason = ?, status = ?
             WHERE id = ?`,
            [targetKaryawanId, targetJenisCutiId, targetStartDate, targetEndDate, targetReason, targetStatus, id]
        );

        // Re-sync rekap for old range and new range
        const oldStart = formatLocalDate(oldLeave.start_date);
        const oldEnd = formatLocalDate(oldLeave.end_date);
        if (oldLeave.instansi_id && oldStart && oldEnd) {
            await rekapService.processRekapRange(oldLeave.instansi_id, oldStart, oldEnd);
        }

        const [newKar] = await db.query<RowDataPacket[]>('SELECT instansi_id FROM karyawan WHERE id = ?', [targetKaryawanId]);
        if (newKar.length > 0 && targetStartDate && targetEndDate) {
            await rekapService.processRekapRange(newKar[0].instansi_id, formatLocalDate(targetStartDate), formatLocalDate(targetEndDate));
        }

        res.json({ message: 'Leave request updated successfully' });
    } catch (error) {
        console.error('Error updating leave request:', error);
        res.status(500).json({ error: 'Failed to update leave request' });
    }
});

// Delete Leave Request
router.delete('/requests/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;

    try {
        const [existing] = await db.query<RowDataPacket[]>(
            `SELECT c.*, k.instansi_id 
             FROM cuti c 
             JOIN karyawan k ON c.karyawan_id = k.id 
             WHERE c.id = ?`,
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        const oldLeave = existing[0];
        await db.query('DELETE FROM cuti WHERE id = ?', [id]);

        // Re-sync rekap so deleted leave reverts attendance status properly
        const oldStart = formatLocalDate(oldLeave.start_date);
        const oldEnd = formatLocalDate(oldLeave.end_date);
        if (oldLeave.instansi_id && oldStart && oldEnd) {
            await rekapService.processRekapRange(oldLeave.instansi_id, oldStart, oldEnd);
        }

        res.json({ message: 'Leave request deleted successfully' });
    } catch (error) {
        console.error('Error deleting leave request:', error);
        res.status(500).json({ error: 'Failed to delete leave request' });
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

        const [leaveReq] = await db.query<RowDataPacket[]>(
            'SELECT c.karyawan_id, c.start_date, c.end_date, k.instansi_id FROM cuti c JOIN karyawan k ON c.karyawan_id = k.id WHERE c.id = ?',
            [id]
        );
        if (leaveReq.length > 0) {
            const { instansi_id, start_date, end_date } = leaveReq[0];
            const formattedStart = formatLocalDate(start_date);
            const formattedEnd = formatLocalDate(end_date);
            await rekapService.processRekapRange(instansi_id, formattedStart, formattedEnd);
        }

        res.json({ message: `Leave request ${status}` });
    } catch (error) {
        console.error('Error updating leave status:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

export default router;
