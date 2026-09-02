import { Router } from 'express';
import db from '../db';
import { authenticate } from '../middleware/authMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { rekapService } from '../services/rekapService';

const router = Router();

// POST Attendance (Real-time Ingestion)
router.post('/', authenticate, async (req: any, res) => {
    const { pin, scan_time, status, mesin_id } = req.body; // status: 0=In, 1=Out, etc.

    // Auto-detect Instansi based on User who is sending (Machine or Admin)
    let instansi_id = req.user.instansi_id;
    // IF Super Admin sending for others? (Rare, but handle)
    if (req.user.role === 'SUPER_ADMIN' && req.body.instansi_id) {
        instansi_id = req.body.instansi_id;
    }

    if (!pin || !scan_time) {
        return res.status(400).json({ error: 'PIN and Scan Time are required' });
    }

    try {
        // 1. Insert into raw absensi table
        const [result] = await db.query<ResultSetHeader>(`
            INSERT INTO absensi (pin, scan_time, status, instansi_id, mesin_id, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [pin, scan_time, status || 0, instansi_id, mesin_id || 3]);

        // 2. Trigger Real-time Rekap Update
        // Need Karyawan ID for rekap
        const [karyawan] = await db.query<RowDataPacket[]>('SELECT id, shift_id FROM karyawan WHERE pin = ? AND instansi_id = ?', [pin, instansi_id]);

        if (karyawan.length > 0) {
            await rekapService.syncRekapRealtime(instansi_id, pin, scan_time);
        } else {
            console.warn(`[Rekap] Karyawan with PIN ${pin} not found in Instansi ${instansi_id}`);
        }

        res.status(201).json({ message: 'Attendance recorded', id: result.insertId });

    } catch (error: any) {
        console.error('Error inserting attendance:', error);
        res.status(500).json({
            error: 'Failed to record attendance',
            details: error.message,
            sqlMessage: error.sqlMessage
        });
    }
});

// Get Attendance Summary (Audit Log View) - NOW READS FROM REKAP TABLE
router.get('/summary', authenticate, async (req: any, res) => {
    const { start_date, end_date, instansi_id } = req.query;

    let sql = `
        SELECT 
            r.id,
            k.nama AS karyawan_nama,
            k.nik AS karyawan_nik,
            d.nama AS departemen,
            s.nama AS shift_nama,
            DATE_FORMAT(r.tanggal, '%Y-%m-%d') AS tanggal,
            TIME_FORMAT(r.jam_masuk, '%H:%i:%s') AS jam_masuk,
            TIME_FORMAT(r.jam_keluar, '%H:%i:%s') AS jam_keluar,
            CONCAT(FLOOR(r.durasi_kerja_menit / 60), ' jam ', MOD(r.durasi_kerja_menit, 60), ' menit') AS jam_kerja,
            r.status_kehadiran AS status,
            r.terlambat_menit,
            r.pulang_cepat_menit
        FROM rekap_absensi r
        JOIN karyawan k ON r.karyawan_id = k.id
        LEFT JOIN departemen d ON k.departemen_id = d.id
        LEFT JOIN shifts s ON r.shift_id = s.id
        WHERE 1=1

    `;

    const params: any[] = [];

    // --- FILTERS ---
    if (req.user.role !== 'SUPER_ADMIN') {
        sql += ' AND r.instansi_id = ?';
        params.push(req.user.instansi_id);
    } else if (instansi_id) {
        sql += ' AND r.instansi_id = ?';
        params.push(instansi_id);
    }

    if (start_date) {
        sql += ' AND r.tanggal >= ?';
        params.push(start_date);
    }
    if (end_date) {
        sql += ' AND r.tanggal <= ?';
        params.push(end_date);
    }
    if (req.query.shift_id) {
        sql += ' AND r.shift_id = ?';
        params.push(req.query.shift_id);
    }

    sql += ` ORDER BY r.tanggal DESC, k.nama ASC LIMIT 500 `;

    try {
        const [rows] = await db.query<RowDataPacket[]>(sql, params);
        res.json(rows);
    } catch (error: any) {
        console.error('[ERROR] /api/absensi/summary failed:', error);
        res.status(500).json({ error: 'Failed to fetch attendance summary', details: error.message });
    }
});

// Legacy Endpoint Redirect or Same Implementation?
// The frontend might use '/' for logs. Let's redirect logic to use same source but maybe raw order?
// Actually the previous implementation of '/' was also grouping content. Let's keep it consistent.
router.get('/', authenticate, async (req: any, res) => {
    // For now, redirect to summary logic as they seem to serve similar purpose in the UI shown
    // or we can just call the same logic.
    // Let's copy the logic but maybe adjust fields if frontend expects different keys. 
    // Looking at previous code, keys were similar (Nama_Karyawan vs karyawan_nama).
    // Let's stick to the new standard keys (lowercase) and ensure Frontend accepts them.
    // The Frontend LaporanAbsensi.tsx uses: karyawan_nama, karyawan_nik, departemen, jam_masuk...
    // So the /summary endpoint implementation above is compatible.

    // We will use the same query but maybe slightly different order or fields if needed.
    // For simplicity, let's reuse valid query.
    return (router as any).handle({ ...req, url: '/summary', route: { path: '/summary' } }, res);
});

// Get Attendance Record by ID
router.get('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT
                r.id,
                k.nama AS karyawan_nama,
                k.nik AS karyawan_nik,
                k.jabatan AS jabatan,
                d.nama AS departemen,
                DATE_FORMAT(r.tanggal, '%Y-%m-%d') AS tanggal,
                TIME_FORMAT(r.jam_masuk, '%H:%i:%s') AS jam_masuk,
                TIME_FORMAT(r.jam_keluar, '%H:%i:%s') AS jam_keluar,
                CONCAT(FLOOR(r.durasi_kerja_menit / 60), ' jam ', MOD(r.durasi_kerja_menit, 60), ' menit') AS jam_kerja,
                r.status_kehadiran AS status,
                r.terlambat_menit,
                r.pulang_cepat_menit
             FROM rekap_absensi r
             JOIN karyawan k ON r.karyawan_id = k.id
             LEFT JOIN departemen d ON k.departemen_id = d.id
             WHERE r.id = ?`,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }

        res.json(rows[0]);
    } catch (error: any) {
        console.error('Error fetching attendance record:', error);
        res.status(500).json({ error: 'Failed to fetch attendance record', details: error.message });
    }
});

// Generate Alpha Endpoint
router.post('/generate-alpha', authenticate, async (req: any, res) => {
    const { date, instansi_id } = req.body;
    // Allow admin to generate
    let targetInstansi = req.user.instansi_id;
    if (req.user.role === 'SUPER_ADMIN' && instansi_id) targetInstansi = instansi_id;

    if (!date) return res.status(400).json({ error: 'Date is required' });

    try {
        const result = await rekapService.generateAlpha(targetInstansi, date);
        res.json(result);
    } catch (error: any) {
        console.error('Error generating alpha:', error);
        res.status(500).json({ error: 'Failed to generate alpha', details: error.message });
    }
});

// Manual Correction (UPDATE)
router.put('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { jam_masuk, jam_keluar, status_kehadiran } = req.body;

    try {
        await rekapService.updateManualRekap(Number(id), { jam_masuk, jam_keluar, status_kehadiran });
        res.json({ message: 'Attendance updated successfully' });
    } catch (error: any) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ error: 'Failed to update attendance', details: error.message });
    }
});

// Manual Delete
router.delete('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM rekap_absensi WHERE id = ?', [id]);
        res.json({ message: 'Attendance record deleted' });
    } catch (error: any) {
        console.error('Error deleting attendance:', error);
        res.status(500).json({ error: 'Failed to delete attendance', details: error.message });
    }
});

export default router;
