import { Router } from 'express';
import db from '../db';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// GET work day settings for an instansi
// Non-super admin: gets their own instansi
// Super admin: can pass ?instansi_id=X or uses param
router.get('/', authenticate, async (req: any, res) => {
    try {
        let instansiId: number | null = null;

        if (req.user.role === 'SUPER_ADMIN') {
            instansiId = req.query.instansi_id ? parseInt(req.query.instansi_id) : null;
            if (!instansiId) {
                // Return all instansi with their work days
                const [rows] = await db.query<RowDataPacket[]>(
                    'SELECT id, nama, hari_kerja FROM instansi ORDER BY nama'
                );
                return res.json(rows.map(r => ({
                    ...r,
                    hari_kerja: parseHariKerja(r.hari_kerja)
                })));
            }
        } else {
            instansiId = req.user.instansi_id;
        }

        if (!instansiId) {
            return res.status(400).json({ error: 'Instansi ID required' });
        }

        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT id, nama, hari_kerja FROM instansi WHERE id = ?',
            [instansiId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Instansi not found' });
        }

        const instansi = rows[0];
        res.json({
            id: instansi.id,
            nama: instansi.nama,
            hari_kerja: parseHariKerja(instansi.hari_kerja)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch work day settings' });
    }
});

// PUT work day settings
// Body: { instansi_id?: number, hari_kerja: number[] } e.g. [1,2,3,4,5] = Mon-Fri
router.put('/', authenticate, async (req: any, res) => {
    try {
        const { hari_kerja, instansi_id } = req.body;

        let targetInstansiId: number;

        if (req.user.role === 'SUPER_ADMIN') {
            if (!instansi_id) {
                return res.status(400).json({ error: 'instansi_id required for Super Admin' });
            }
            targetInstansiId = parseInt(instansi_id);
        } else {
            targetInstansiId = req.user.instansi_id;
        }

        if (!targetInstansiId) {
            return res.status(400).json({ error: 'No instansi associated' });
        }

        // Validate hari_kerja: must be array of 0-6 (0=Minggu, 1=Senin, ..., 6=Sabtu)
        if (!Array.isArray(hari_kerja)) {
            return res.status(400).json({ error: 'hari_kerja must be an array' });
        }

        const validDays = hari_kerja.filter((d: any) => Number.isInteger(d) && d >= 0 && d <= 6);
        const hariKerjaStr = [...new Set(validDays)].sort().join(',');

        await db.query<ResultSetHeader>(
            'UPDATE instansi SET hari_kerja = ? WHERE id = ?',
            [hariKerjaStr || null, targetInstansiId]
        );

        res.json({
            message: 'Work day settings updated',
            instansi_id: targetInstansiId,
            hari_kerja: validDays
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update work day settings' });
    }
});

// Helper to parse hari_kerja string to number array
function parseHariKerja(raw: string | null): number[] {
    if (!raw) return [1, 2, 3, 4, 5]; // Default: Mon-Fri
    return raw.split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n >= 0 && n <= 6);
}

export default router;
