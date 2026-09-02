import { Router } from 'express';
import db from '../db';
import { authenticate } from '../middleware/authMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// GET Schedules / Overrides
router.get('/', authenticate, async (req: any, res) => {
    try {
        const { start_date, end_date, instansi_id, departemen_id } = req.query;
        let sql = `
            SELECT kj.*, k.nama as karyawan_nama, k.nik as karyawan_nik, d.nama as departemen_nama, s.nama as shift_nama, s.jam_masuk, s.jam_pulang
            FROM karyawan_jadwal kj
            JOIN karyawan k ON kj.karyawan_id = k.id
            LEFT JOIN departemen d ON k.departemen_id = d.id
            JOIN shifts s ON kj.shift_id = s.id
            WHERE 1=1
        `;
        const params: any[] = [];

        // Filter permissions
        if (req.user.role !== 'SUPER_ADMIN') {
            sql += ' AND kj.instansi_id = ?';
            params.push(req.user.instansi_id);
        } else if (instansi_id) {
            sql += ' AND kj.instansi_id = ?';
            params.push(instansi_id);
        }

        if (start_date) {
            sql += ' AND kj.tanggal >= ?';
            params.push(start_date);
        }
        if (end_date) {
            sql += ' AND kj.tanggal <= ?';
            params.push(end_date);
        }
        if (departemen_id) {
            sql += ' AND k.departemen_id = ?';
            params.push(departemen_id);
        }

        sql += ' ORDER BY kj.tanggal DESC, k.nama ASC';

        const [rows] = await db.query<RowDataPacket[]>(sql, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});

// POST Schedule (Assign Shift Override)
router.post('/', authenticate, async (req: any, res) => {
    try {
        const { karyawan_id, shift_id, tanggal, tanggal_mulai, tanggal_selesai, instansi_id } = req.body;

        let targetInstansi = req.user.instansi_id;
        if (req.user.role === 'SUPER_ADMIN' && instansi_id) {
            targetInstansi = instansi_id;
        }

        if (!targetInstansi) {
            return res.status(400).json({ error: 'Instansi ID required' });
        }

        const dates: string[] = [];
        if (tanggal_mulai && tanggal_selesai) {
            const start = new Date(tanggal_mulai);
            const end = new Date(tanggal_selesai);
            if (end < start) return res.status(400).json({ error: 'End date must be after start date' });
            
            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 31) return res.status(400).json({ error: 'Date range cannot exceed 31 days' });

            const current = new Date(start);
            while (current <= end) {
                dates.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        } else if (tanggal) {
            dates.push(tanggal);
        } else {
            return res.status(400).json({ error: 'Date required' });
        }

        // We use INSERT IGNORE or ON DUPLICATE KEY UPDATE. ON DUPLICATE KEY UPDATE is better to allow fixing mistakes.
        const values = dates.map(d => [karyawan_id, shift_id, d, targetInstansi]);
        const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
        const flatValues = values.flat();

        const query = `
            INSERT INTO karyawan_jadwal (karyawan_id, shift_id, tanggal, instansi_id)
            VALUES ${placeholders}
            ON DUPLICATE KEY UPDATE shift_id = VALUES(shift_id), updated_at = NOW()
        `;

        await db.query(query, flatValues);

        res.status(201).json({ message: 'Schedule updated successfully', count: dates.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to assign schedule override' });
    }
});

// DELETE Schedule
router.delete('/:id', authenticate, async (req: any, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'SUPER_ADMIN') {
            const [check] = await db.query<RowDataPacket[]>('SELECT instansi_id FROM karyawan_jadwal WHERE id = ?', [id]);
            if (check.length === 0) return res.status(404).json({ error: 'Schedule not found' });
            if (check[0].instansi_id !== req.user.instansi_id) return res.status(403).json({ error: 'Forbidden' });
        }
        await db.query('DELETE FROM karyawan_jadwal WHERE id = ?', [id]);
        res.json({ message: 'Schedule deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});

export default router;
