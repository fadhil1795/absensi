import { Router } from 'express';
import crypto from 'crypto';
import db from '../db';
import { authenticate } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/permissionMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Get all Instansi (Super Admin) or Own Profile (Instansi Admin)
router.get('/', authenticate, checkPermission('instansi.view'), async (req: any, res) => {
    try {
        if (req.user.role === 'SUPER_ADMIN') {
            const [instansis] = await db.query<RowDataPacket[]>('SELECT * FROM instansi ORDER BY id ASC');
            return res.json(instansis);
        } else {
            const [instansis] = await db.query<RowDataPacket[]>(
                'SELECT * FROM instansi WHERE id = ?',
                [req.user.instansi_id]
            );
            return res.json(instansis);
        }
    } catch (error: any) {
        console.error('Error fetching instansi data:', error);
        res.status(500).json({ error: 'Failed to fetch instansi data', details: error?.message || String(error) });
    }
});

// Create Instansi
router.post('/', authenticate, checkPermission('instansi.add'), async (req: any, res) => {
    let { kode, nama, alamat, telepon, email, hari_kerja, jam_masuk, jam_pulang, toleransi_keterlambatan, min_jam_kerja, hari_libur } = req.body;

    if (!nama || !nama.trim()) {
        return res.status(400).json({ error: 'Nama instansi wajib diisi.' });
    }

    nama = nama.trim();

    // Auto-generate kode if empty or not provided
    if (!kode || !kode.trim()) {
        const cleanName = nama.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
        const rand = Math.floor(100 + Math.random() * 900);
        kode = `${cleanName || 'INST'}-${rand}`;
    } else {
        kode = kode.trim().toUpperCase();
    }

    try {
        // Check for duplicate kode
        const [existing] = await db.query<RowDataPacket[]>('SELECT id FROM instansi WHERE kode = ?', [kode]);
        if (existing.length > 0) {
            return res.status(400).json({ error: `Kode instansi "${kode}" sudah digunakan. Silakan gunakan kode lain.` });
        }

        const apiKey = crypto.randomBytes(32).toString('hex');
        const defaultHariKerja = hari_kerja || '1,2,3,4,5';
        const defaultJamMasuk = jam_masuk || '08:00:00';
        const defaultJamPulang = jam_pulang || '17:00:00';
        const defaultToleransi = toleransi_keterlambatan !== undefined ? Number(toleransi_keterlambatan) : 0;
        const defaultMinJamKerja = min_jam_kerja !== undefined ? Number(min_jam_kerja) : 8;
        const defaultHariLibur = hari_libur || '0';

        const [result] = await db.query<ResultSetHeader>(
            `INSERT INTO instansi 
             (kode, nama, alamat, telepon, email, api_key, jam_masuk, jam_pulang, toleransi_keterlambatan, min_jam_kerja, hari_libur, hari_kerja, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                kode,
                nama,
                alamat || null,
                telepon || null,
                email || null,
                apiKey,
                defaultJamMasuk,
                defaultJamPulang,
                defaultToleransi,
                defaultMinJamKerja,
                defaultHariLibur,
                defaultHariKerja
            ]
        );

        res.json({
            id: result.insertId,
            kode,
            nama,
            alamat: alamat || null,
            telepon: telepon || null,
            email: email || null,
            api_key: apiKey,
            hari_kerja: defaultHariKerja,
            jam_masuk: defaultJamMasuk,
            jam_pulang: defaultJamPulang
        });
    } catch (error: any) {
        console.error('Error creating instansi:', error);
        res.status(500).json({ 
            error: 'Failed to create instansi',
            details: error?.message || String(error)
        });
    }
});

// Update Instansi
router.put('/:id', authenticate, checkPermission('instansi.edit'), async (req: any, res) => {
    const { id } = req.params;
    const {
        kode, nama, alamat, telepon, email,
        jam_masuk, toleransi_keterlambatan, min_jam_kerja, hari_libur, hari_kerja
    } = req.body;

    // Check permission: Super Admin can update any, Instansi Admin only their own
    if (req.user.role !== 'SUPER_ADMIN' && req.user.instansi_id !== parseInt(id)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        if (kode && kode.trim()) {
            const cleanKode = kode.trim().toUpperCase();
            const [existing] = await db.query<RowDataPacket[]>(
                'SELECT id FROM instansi WHERE kode = ? AND id != ?',
                [cleanKode, id]
            );
            if (existing.length > 0) {
                return res.status(400).json({ error: `Kode instansi "${cleanKode}" sudah digunakan oleh instansi lain.` });
            }
        }

        // Validation/Calculation logic for rules
        let jam_pulang = null;
        if (jam_masuk && min_jam_kerja) {
            const [hours, minutes] = jam_masuk.split(':').map(Number);
            const pulangHours = (hours + parseInt(min_jam_kerja)) % 24;
            const p = (n: number) => n.toString().padStart(2, '0');
            jam_pulang = `${p(pulangHours)}:${p(minutes || 0)}:00`;
        }

        const updates: string[] = [];
        const params: any[] = [];

        if (kode !== undefined && kode.trim()) { updates.push('kode = ?'); params.push(kode.trim().toUpperCase()); }
        if (nama !== undefined && nama.trim()) { updates.push('nama = ?'); params.push(nama.trim()); }
        if (alamat !== undefined) { updates.push('alamat = ?'); params.push(alamat); }
        if (telepon !== undefined) { updates.push('telepon = ?'); params.push(telepon); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }

        // Rules
        if (jam_masuk !== undefined) { updates.push('jam_masuk = ?'); params.push(jam_masuk); }
        if (toleransi_keterlambatan !== undefined) { updates.push('toleransi_keterlambatan = ?'); params.push(toleransi_keterlambatan); }
        if (min_jam_kerja !== undefined) { updates.push('min_jam_kerja = ?'); params.push(min_jam_kerja); }
        if (jam_pulang) { updates.push('jam_pulang = ?'); params.push(jam_pulang); }
        if (hari_libur !== undefined) { updates.push('hari_libur = ?'); params.push(hari_libur); }
        if (hari_kerja !== undefined) { updates.push('hari_kerja = ?'); params.push(hari_kerja); }

        if (updates.length > 0) {
            params.push(id);
            await db.query(
                `UPDATE instansi SET ${updates.join(', ')} WHERE id = ?`,
                params
            );
        }

        res.json({ id, kode, nama, alamat, telepon, email, jam_masuk, jam_pulang, toleransi_keterlambatan, min_jam_kerja, hari_kerja });
    } catch (error: any) {
        console.error('Error updating instansi:', error);
        res.status(500).json({ error: 'Failed to update instansi', details: error?.message || String(error) });
    }
});

// Delete Instansi
router.delete('/:id', authenticate, checkPermission('instansi.delete'), async (req: any, res) => {
    const { id } = req.params;
    try {
        // Prevent deleting instansi that still has employees or machines attached
        const [karyawan] = await db.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM karyawan WHERE instansi_id = ?', [id]);
        if (karyawan[0]?.count > 0) {
            return res.status(400).json({ 
                error: `Tidak dapat menghapus instansi karena masih memiliki ${karyawan[0].count} karyawan terdaftar.` 
            });
        }

        const [mesin] = await db.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM mesin WHERE instansi_id = ?', [id]);
        if (mesin[0]?.count > 0) {
            return res.status(400).json({ 
                error: `Tidak dapat menghapus instansi karena masih memiliki ${mesin[0].count} mesin terhubung.` 
            });
        }

        await db.query('DELETE FROM instansi WHERE id = ?', [id]);
        res.json({ message: 'Instansi deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting instansi:', error);
        res.status(500).json({ error: 'Failed to delete instansi', details: error?.message || String(error) });
    }
});

export default router;
