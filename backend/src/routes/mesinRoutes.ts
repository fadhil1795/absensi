import { Router } from 'express';
import db from '../db';
import { authenticate } from '../middleware/authMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// GET all active machines (with filtering)
router.get('/', authenticate, async (req: any, res) => {
    const { instansi_id } = req.query;

    try {
        let query = `
            SELECT m.*, i.nama as instansi_nama 
            FROM mesin m
            JOIN instansi i ON m.instansi_id = i.id
            WHERE m.deleted_at IS NULL
        `;
        const params: any[] = [];

        // Role-based filtering
        if (req.user.role !== 'SUPER_ADMIN') {
            query += ' AND m.instansi_id = ?';
            params.push(req.user.instansi_id);
        } else if (instansi_id) {
            query += ' AND m.instansi_id = ?';
            params.push(instansi_id);
        }

        query += ' ORDER BY m.created_at DESC';

        const [rows] = await db.query<RowDataPacket[]>(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching machines:', error);
        res.status(500).json({ error: 'Failed to fetch machines' });
    }
});

// GET single machine details
router.get('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM mesin WHERE id = ? AND deleted_at IS NULL', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Machine not found' });

        // Permission Check
        if (req.user.role !== 'SUPER_ADMIN' && rows[0].instansi_id !== req.user.instansi_id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// CREATE Machine
router.post('/', authenticate, async (req: any, res) => {
    const { nama, sn, instansi_id, lokasi, ip_address, tipe_mesin, timezone } = req.body;

    // determine Instansi ID
    let targetInstansi = instansi_id;
    if (req.user.role !== 'SUPER_ADMIN') {
        targetInstansi = req.user.instansi_id;
    }

    if (!targetInstansi) return res.status(400).json({ error: 'Instansi ID required' });
    if (!sn) return res.status(400).json({ error: 'Serial Number is required' });

    try {
        // Check SN Uniqueness
        const [existing] = await db.query<RowDataPacket[]>('SELECT id FROM mesin WHERE sn = ?', [sn]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Serial Number (SN) already exists!' });
        }

        await db.query(
            `INSERT INTO mesin (nama_mesin, sn, instansi_id, lokasi, ip_address, tipe_mesin, timezone, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [nama, sn, targetInstansi, lokasi, ip_address, tipe_mesin || 'FINGERPRINT', timezone || 'Asia/Jakarta']
        );
        res.status(201).json({ message: 'Machine created successfully' });
    } catch (error) {
        console.error('Create machine error:', error);
        res.status(500).json({ error: 'Failed to create machine' });
    }
});

// UPDATE Machine
router.put('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { nama, sn, lokasi, ip_address, tipe_mesin, status, timezone } = req.body;

    try {
        // Permission Check
        const [check] = await db.query<RowDataPacket[]>('SELECT instansi_id FROM mesin WHERE id = ?', [id]);
        if (check.length === 0) return res.status(404).json({ error: 'Machine not found' });

        if (req.user.role !== 'SUPER_ADMIN' && check[0].instansi_id !== req.user.instansi_id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Check SN uniqueness if changing SN
        if (sn) {
            const [snCheck] = await db.query<RowDataPacket[]>('SELECT id FROM mesin WHERE sn = ? AND id != ?', [sn, id]);
            if (snCheck.length > 0) return res.status(400).json({ error: 'Serial Number already in use' });
        }

        await db.query(
            `UPDATE mesin SET nama_mesin = ?, sn = ?, lokasi = ?, ip_address = ?, tipe_mesin = ?, status = ?, timezone = ? WHERE id = ?`,
            [nama, sn, lokasi, ip_address, tipe_mesin, status, timezone, id]
        );
        res.json({ message: 'Machine updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update machine' });
    }
});

// SOFT DELETE Machine
router.delete('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;

    try {
        // Permission Check
        const [check] = await db.query<RowDataPacket[]>('SELECT instansi_id FROM mesin WHERE id = ?', [id]);
        if (check.length === 0) return res.status(404).json({ error: 'Machine not found' });

        if (req.user.role !== 'SUPER_ADMIN' && check[0].instansi_id !== req.user.instansi_id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await db.query('UPDATE mesin SET deleted_at = NOW(), status = "NONAKTIF" WHERE id = ?', [id]);
        res.json({ message: 'Machine deleted successfully (soft delete)' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete machine' });
    }
});

// CHECK CONNECTION (Mock)
router.post('/check-connection/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;

    // Simulate ping
    const isOnline = Math.random() > 0.3; // 70% chance online

    try {
        await db.query('UPDATE mesin SET is_online = ?, last_sync = NOW() WHERE id = ?', [isOnline, id]);
        res.json({
            status: isOnline ? 'ONLINE' : 'OFFLINE',
            message: isOnline ? 'Connection Successful' : 'Connection Failed'
        });
    } catch (error) {
        res.status(500).json({ error: 'Ping failed' });
    }
});

// SYNC LOGS (Mock Pull)
router.post('/sync/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;

    try {
        // Just mock randomly finding 0-10 records
        const newRecords = Math.floor(Math.random() * 11);

        await db.query('UPDATE mesin SET last_sync = NOW(), is_online = true WHERE id = ?', [id]);
        
        res.json({
            status: 'SUCCESS',
            message: `Berhasil menarik ${newRecords} data absensi baru.`,
            records_pulled: newRecords
        });
    } catch (error) {
        res.status(500).json({ error: 'Sync failed' });
    }
});

export default router;
