import { Router } from 'express';
import db from '../db';
import { authenticate } from '../middleware/authMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logAction } from '../utils/logger';
import { rekapService } from '../services/rekapService';

const router = Router();

// Helper: Format Date to YYYY-MM-DD (Local)
const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// Throttle: track last auto-sync time per instansi (max 1x per 5 menit)
const lastAutoSyncTime = new Map<number, number>();
const AUTO_SYNC_THROTTLE_MS = 5 * 60 * 1000; // 5 menit

// Cron trigger for Vercel: POST/GET /cron
router.all('/cron', async (req: any, res) => {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization;
    const secretQuery = req.query?.secret || req.body?.secret;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && secretQuery !== cronSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const start_date = formatDate(yesterday);
        const end_date = formatDate(today);

        const [instansiRows] = await db.query<RowDataPacket[]>('SELECT id FROM instansi');
        let totalProcessed = 0;

        for (const instansi of instansiRows) {
            const processedCount = await rekapService.processRekapRange(instansi.id, start_date, end_date);
            totalProcessed += processedCount;
        }

        res.json({
            message: 'Cron rekap processing completed',
            start_date,
            end_date,
            processed: totalProcessed
        });
    } catch (error: any) {
        console.error('Cron rekap processing error:', error);
        res.status(500).json({ error: 'Failed to process attendance via cron', details: error.message });
    }
});

// 1. MANUAL TRIGGER (POST /trigger)
router.post('/trigger', async (req: any, res) => {
    const { start_date, end_date, instansi_id, secret } = req.body;
    const manualSecret = process.env.MANUAL_TRIGGER_SECRET;

    if (manualSecret && secret !== manualSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const effectiveStartDate = start_date || formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const effectiveEndDate = end_date || formatDate(new Date());

    try {
        let targetInstansiId: number | null = null;
        if (instansi_id) {
            targetInstansiId = Number(instansi_id);
        }

        if (targetInstansiId) {
            const processedCount = await rekapService.processRekapRange(targetInstansiId, effectiveStartDate, effectiveEndDate);
            return res.json({
                message: 'Manual rekap processing completed',
                start_date: effectiveStartDate,
                end_date: effectiveEndDate,
                instansi_id: targetInstansiId,
                processed: processedCount
            });
        }

        const [instansiRows] = await db.query<RowDataPacket[]>('SELECT id FROM instansi');
        let totalProcessed = 0;

        for (const instansi of instansiRows) {
            const processedCount = await rekapService.processRekapRange(instansi.id, effectiveStartDate, effectiveEndDate);
            totalProcessed += processedCount;
        }

        res.json({
            message: 'Manual rekap processing completed',
            start_date: effectiveStartDate,
            end_date: effectiveEndDate,
            processed: totalProcessed
        });
    } catch (error: any) {
        console.error('Manual rekap processing error:', error);
        res.status(500).json({ error: 'Failed to process attendance manually', details: error.message });
    }
});

// 2. TRIGGER PROCESS (POST /process)
router.post('/process', authenticate, async (req: any, res) => {
    const { start_date, end_date, instansi_id } = req.body;

    if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Start date and End date are required' });
    }

    let targetInstansiId = req.user.instansi_id;
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN' && instansi_id) {
        targetInstansiId = instansi_id;
    }

    try {
        console.log(`[PROCESS] Starting for Instansi: ${targetInstansiId}, Range: ${start_date} to ${end_date}`);
        const processedCount = await rekapService.processRekapRange(targetInstansiId, start_date, end_date);
        res.json({ message: 'Processing complete', processed: processedCount });
    } catch (error: any) {
        console.error('Processing error:', error);
        res.status(500).json({ error: 'Failed to process attendance', details: error.message });
    }
});

// 2. GET REKAP (GET /)
router.get('/', authenticate, async (req: any, res) => {
    const { start_date, end_date, instansi_id } = req.query;

    // === AUTO-SYNC BACKGROUND (non-blocking, throttled 5 menit) ===
    const today = formatDate(new Date());
    const endDateParam = (end_date as string) || today;
    if (endDateParam >= today) {
        const syncInstansiId: number | null = req.user.role !== 'SUPER_ADMIN'
            ? req.user.instansi_id
            : (instansi_id ? Number(instansi_id) : null);

        if (syncInstansiId) {
            const lastSync = lastAutoSyncTime.get(syncInstansiId) || 0;
            if (Date.now() - lastSync >= AUTO_SYNC_THROTTLE_MS) {
                lastAutoSyncTime.set(syncInstansiId, Date.now());
                const yesterday = formatDate(new Date(Date.now() - 86400000));
                setImmediate(() => {
                    rekapService.processRekapRange(syncInstansiId, yesterday, today)
                        .then(count => console.log(`[AutoSync GET] Instansi ${syncInstansiId}: ${count} records synced.`))
                        .catch(err => console.error('[AutoSync GET] Error:', err));
                });
                console.log(`[AutoSync GET] Triggered for Instansi ${syncInstansiId} (${yesterday} → ${today})`);
            }
        }
    }
    // === END AUTO-SYNC ===

    let sql = `
        SELECT r.*, r.jam_keluar as jam_pulang, k.nama as karyawan_nama, k.nik as karyawan_nik, s.nama as shift_nama, d.nama as departemen_nama
        FROM rekap_absensi r
        JOIN karyawan k ON r.karyawan_id = k.id
        LEFT JOIN shifts s ON r.shift_id = s.id
        LEFT JOIN departemen d ON k.departemen_id = d.id
        WHERE 1=1
    `;
    const params: any[] = [];

    // Filters
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
    if (req.query.karyawan_id) {
        sql += ' AND r.karyawan_id = ?';
        params.push(req.query.karyawan_id);
    }
    if (req.query.shift_id) {
        sql += ' AND r.shift_id = ?';
        params.push(req.query.shift_id);
    }

    sql += ' ORDER BY r.tanggal DESC, k.nama ASC LIMIT 1000';

    try {
        const [rows] = await db.query<RowDataPacket[]>(sql, params);

        // Format dates
        const formatted = rows.map((r: any) => ({
            ...r,
            tanggal: formatDate(new Date(r.tanggal))
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching rekap:', error);
        res.status(500).json({ error: 'Failed to fetch rekap' });
    }
});

// 3. GET STATS (GET /stats) - For Weekly/Monthly Recap
router.get('/stats', authenticate, async (req: any, res) => {
    const { start_date, end_date, instansi_id } = req.query;

    if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Start date and End date are required' });
    }

    let sql = `
        SELECT 
            k.id as karyawan_id,
            k.nama as karyawan_nama, 
            k.nik as karyawan_nik, 
            d.nama as departemen_nama,
            COUNT(CASE WHEN r.status_kehadiran IN ('Hadir', 'Belum Pulang') THEN 1 END) as total_hadir,
            COUNT(CASE WHEN r.status_kehadiran = 'Lembur' THEN 1 END) as total_lembur,
            COUNT(CASE WHEN r.status_kehadiran = 'Terlambat' THEN 1 END) as total_terlambat,
            COUNT(CASE WHEN r.status_kehadiran = 'Pulang Cepat' THEN 1 END) as total_pulang_cepat,
            COUNT(CASE WHEN r.status_kehadiran = 'Alpa' THEN 1 END) as total_alpa,
            COUNT(CASE WHEN r.status_kehadiran NOT IN ('Hadir', 'Terlambat', 'Pulang Cepat', 'Alpa', 'Libur', 'Belum Pulang', 'Lembur') THEN 1 END) as total_izin,
            COUNT(CASE WHEN r.status_kehadiran = 'Libur' THEN 1 END) as total_libur,
            COUNT(CASE WHEN r.status_kehadiran = 'Belum Pulang' THEN 1 END) as total_belum_pulang,
            SUM(r.terlambat_menit) as total_terlambat_menit,
            SUM(r.pulang_cepat_menit) as total_pulang_cepat_menit,
            SUM(r.durasi_kerja_menit) as total_durasi_menit
        FROM karyawan k
        LEFT JOIN rekap_absensi r ON k.id = r.karyawan_id
        LEFT JOIN departemen d ON k.departemen_id = d.id
        WHERE r.tanggal >= ? AND r.tanggal <= ?
    `;
    const params: any[] = [start_date, end_date];

    // Filters
    if (req.user.role !== 'SUPER_ADMIN') {
        sql += ' AND k.instansi_id = ?';
        params.push(req.user.instansi_id);
    } else if (instansi_id) {
        sql += ' AND k.instansi_id = ?';
        params.push(instansi_id);
    }

    if (req.query.karyawan_id) {
        sql += ' AND k.id = ?';
        params.push(req.query.karyawan_id);
    }

    sql += ' GROUP BY k.id, k.nama, k.nik, d.nama ORDER BY k.nama ASC';

    try {
        const [rows] = await db.query<RowDataPacket[]>(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching rekap stats:', error);
        res.status(500).json({ error: 'Failed to fetch rekap stats' });
    }
});

// 4. GET REKAP DETAIL (GET /:id)
router.get('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT r.*, r.jam_keluar as jam_pulang, k.nama as karyawan_nama, k.nik as karyawan_nik, s.nama as shift_nama
             FROM rekap_absensi r
             JOIN karyawan k ON r.karyawan_id = k.id
             LEFT JOIN shifts s ON r.shift_id = s.id
             WHERE r.id = ?`,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Record not found' });
        }

        const record = rows[0];
        record.tanggal = formatDate(new Date(record.tanggal));
        res.json(record);
    } catch (error) {
        console.error('Error fetching rekap detail:', error);
        res.status(500).json({ error: 'Failed to fetch rekap detail' });
    }
});

// 5. DELETE REKAP (DELETE /:id)
router.delete('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;

    try {
        await db.query('DELETE FROM rekap_absensi WHERE id = ?', [id]);

        // Log Delete
        logAction(req.user?.id, req.user?.nama, 'DELETE_REKAP', { id, ip: req.ip });

        res.json({ message: 'Record deleted successfully' });
    } catch (error) {
        console.error('Error deleting rekap:', error);
        res.status(500).json({ error: 'Failed to delete record' });
    }
});

// 5. UPDATE REKAP (PUT /:id)
router.put('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { jam_masuk, jam_pulang, status_kehadiran } = req.body;

    try {
        await rekapService.updateManualRekap(Number(id), {
            jam_masuk: jam_masuk || undefined,
            jam_keluar: jam_pulang || undefined,
            status_kehadiran
        });

        // Log Update
        logAction(req.user?.id, req.user?.nama, 'UPDATE_REKAP', { id, updates: req.body, ip: req.ip });

        res.json({ message: 'Record updated successfully' });
    } catch (error: any) {
        console.error('Error updating rekap:', error);
        res.status(500).json({ error: 'Failed to update record', details: error.message });
    }
});

export default router;
