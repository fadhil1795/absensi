import { Router } from 'express';
import db from '../db';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// GET Holidays
router.get('/', authenticate, async (req: any, res) => {
    try {
        const { start_date, end_date, instansi_id } = req.query;
        let sql = `
            SELECT h.*, i.nama as instansi_nama 
            FROM holidays h
            LEFT JOIN instansi i ON h.instansi_id = i.id
            WHERE 1=1
        `;
        const params: any[] = [];

        // Filter permissions
        if (req.user.role !== 'SUPER_ADMIN') {
            sql += ' AND (h.instansi_id IS NULL OR h.instansi_id = ?)';
            params.push(req.user.instansi_id);
        } else if (instansi_id) {
            sql += ' AND (h.instansi_id = ? OR h.instansi_id IS NULL)';
            params.push(instansi_id);
        }

        if (start_date) {
            sql += ' AND h.tanggal >= ?';
            params.push(start_date);
        }
        if (end_date) {
            sql += ' AND h.tanggal <= ?';
            params.push(end_date);
        }

        sql += ' ORDER BY h.tanggal DESC';

        const [rows] = await db.query<RowDataPacket[]>(sql, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch holidays' });
    }
});

// CREATE Holiday (supports single date or date range)
router.post('/', authenticate, async (req: any, res) => {
    try {
        const { tanggal, tanggal_mulai, tanggal_selesai, keterangan, instansi_id } = req.body;

        let targetInstansi = null;
        if (req.user.role === 'SUPER_ADMIN') {
            targetInstansi = instansi_id || null; // Null means Global Holiday
        } else {
            targetInstansi = req.user.instansi_id;
        }

        // Determine dates to insert
        const dates: string[] = [];

        if (tanggal_mulai && tanggal_selesai) {
            // Date range mode: generate all dates between start and end (inclusive)
            const start = new Date(tanggal_mulai);
            const end = new Date(tanggal_selesai);

            if (end < start) {
                return res.status(400).json({ error: 'End date must be after start date' });
            }

            // Safety limit: max 60 days range
            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 60) {
                return res.status(400).json({ error: 'Date range cannot exceed 60 days' });
            }

            const current = new Date(start);
            while (current <= end) {
                dates.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        } else if (tanggal) {
            // Single date mode (backwards compatible)
            dates.push(tanggal);
        } else {
            return res.status(400).json({ error: 'Date is required' });
        }

        // Insert all dates
        const values = dates.map(d => [d, keterangan, targetInstansi]);
        const placeholders = values.map(() => '(?, ?, ?)').join(', ');
        const flatValues = values.flat();

        await db.query(
            `INSERT INTO holidays (tanggal, keterangan, instansi_id) VALUES ${placeholders}`,
            flatValues
        );

        res.status(201).json({ 
            message: `${dates.length} holiday(s) created`,
            count: dates.length 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create holiday' });
    }
});

// DELETE Holiday
router.delete('/:id', authenticate, async (req: any, res) => {
    try {
        const { id } = req.params;
        // Verify ownership if not super admin
        if (req.user.role !== 'SUPER_ADMIN') {
            const [check] = await db.query<RowDataPacket[]>('SELECT * FROM holidays WHERE id = ?', [id]);
            if (check.length === 0) return res.status(404).json({ error: 'Holiday not found' });
            if (check[0].instansi_id !== req.user.instansi_id) return res.status(403).json({ error: 'Forbidden' });
        }

        await db.query('DELETE FROM holidays WHERE id = ?', [id]);
        res.json({ message: 'Holiday deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete holiday' });
    }
});

export default router;
