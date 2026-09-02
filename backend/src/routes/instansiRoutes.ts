import { Router } from 'express';
import db from '../db';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Get all Instansi (Super Admin) or Own Profile (Instansi Admin)
router.get('/', authenticate, async (req: any, res) => {
    try {
        if (req.user.role === 'SUPER_ADMIN') {
            const [instansis] = await db.query<RowDataPacket[]>('SELECT * FROM instansi');
            return res.json(instansis);
        } else {
            const [instansis] = await db.query<RowDataPacket[]>(
                'SELECT * FROM instansi WHERE id = ?',
                [req.user.instansi_id]
            );
            return res.json(instansis);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch instansi data' });
    }
});

// Create Instansi (Super Admin Only)
router.post('/', authenticate, authorize(['SUPER_ADMIN']), async (req, res) => {
    const { kode, nama, alamat, telepon, email } = req.body;
    try {
        const [result] = await db.query<ResultSetHeader>(
            'INSERT INTO instansi (kode, nama, alamat, telepon, email, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [kode, nama, alamat, telepon, email]
        );
        res.json({ id: result.insertId, kode, nama, alamat, telepon, email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create instansi' });
    }
});

// Update Instansi
router.put('/:id', authenticate, async (req: any, res) => {
    const { id } = req.params;
    const {
        nama, alamat, telepon, email,
        jam_masuk, toleransi_keterlambatan, min_jam_kerja
    } = req.body;

    // Check permission: Super Admin can update any, Instansi Admin only their own
    if (req.user.role !== 'SUPER_ADMIN' && req.user.instansi_id !== parseInt(id)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        // Validation/Calculation logic for rules
        let jam_pulang = null;
        if (jam_masuk && min_jam_kerja) {
            // Check if format is HH:mm or HH:mm:ss
            const [hours, minutes] = jam_masuk.split(':').map(Number);
            const pulangHours = (hours + parseInt(min_jam_kerja)) % 24;
            // Pad with 0
            const p = (n: number) => n.toString().padStart(2, '0');
            jam_pulang = `${p(pulangHours)}:${p(minutes || 0)}:00`;
        }

        // We use COALESCE in SQL or standard UPDATE. 
        // IF fields are undefined in body, they might be skipped or set to null.
        // Assuming partial update if undefined, but PUT usually means full replace. 
        // Let's do a dynamic update to ignore undefined fields or just update explicit ones.
        // For simplicity reusing strict SQL, but adding the new columns.

        // Actually, easiest is to just update what is provided.
        // If jam_pulang is calculated, include it.

        const updates: string[] = [];
        const params: any[] = [];

        if (nama !== undefined) { updates.push('nama = ?'); params.push(nama); }
        if (alamat !== undefined) { updates.push('alamat = ?'); params.push(alamat); }
        if (telepon !== undefined) { updates.push('telepon = ?'); params.push(telepon); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }

        // Rules
        if (jam_masuk !== undefined) { updates.push('jam_masuk = ?'); params.push(jam_masuk); }
        if (toleransi_keterlambatan !== undefined) { updates.push('toleransi_keterlambatan = ?'); params.push(toleransi_keterlambatan); }
        if (min_jam_kerja !== undefined) { updates.push('min_jam_kerja = ?'); params.push(min_jam_kerja); }
        if (jam_pulang) { updates.push('jam_pulang = ?'); params.push(jam_pulang); }
        if (req.body.hari_libur !== undefined) { updates.push('hari_libur = ?'); params.push(req.body.hari_libur); }

        if (updates.length > 0) {
            params.push(id);
            await db.query(
                `UPDATE instansi SET ${updates.join(', ')} WHERE id = ?`,
                params
            );
        }

        res.json({ id, nama, alamat, telepon, email, jam_masuk, jam_pulang, toleransi_keterlambatan, min_jam_kerja });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update instansi' });
    }
});

// Delete Instansi (Super Admin Only)
router.delete('/:id', authenticate, authorize(['SUPER_ADMIN']), async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM instansi WHERE id = ?', [id]);
        res.json({ message: 'Instansi deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete instansi' });
    }
});

export default router;
