import { Router } from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import db from '../db';
import { authenticate } from '../middleware/authMiddleware';
import { AuthRequest } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/permissionMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { rekapService } from '../services/rekapService';
import { garageService } from '../services/garageService';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // Max 10 MB
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'application/pdf'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.'));
        }
    }
});

let columnsEnsured = false;
async function ensureCutiAttachmentColumns() {
    if (columnsEnsured) return;
    try {
        const [cols] = await db.query<RowDataPacket[]>(`SHOW COLUMNS FROM cuti LIKE 'attachment_key'`);
        if (cols.length === 0) {
            await db.query(`
                ALTER TABLE cuti
                ADD COLUMN attachment_key VARCHAR(255) NULL,
                ADD COLUMN attachment_name VARCHAR(255) NULL,
                ADD COLUMN attachment_mime VARCHAR(100) NULL,
                ADD COLUMN storage_provider VARCHAR(30) NULL DEFAULT 'garage'
            `);
            console.log('[LeaveRoutes] Added Garage HQ attachment columns to cuti table.');
        }

        const [jcCols] = await db.query<RowDataPacket[]>(`SHOW COLUMNS FROM jenis_cuti LIKE 'is_attachment_required'`);
        if (jcCols.length === 0) {
            await db.query(`
                ALTER TABLE jenis_cuti
                ADD COLUMN is_attachment_required TINYINT(1) NOT NULL DEFAULT 0
            `);
            console.log('[LeaveRoutes] Added is_attachment_required to jenis_cuti table.');
        }

        columnsEnsured = true;
    } catch (err) {
        console.warn('[LeaveRoutes] Could not auto-migrate cuti attachment columns:', err);
    }
}

const formatLocalDate = (d: any): string => {
    if (!d) return '';
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const dateObj = new Date(d);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const buildObjectKey = (karyawanId: any, originalName: string) => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `leaves/${yyyy}/${mm}/emp_${karyawanId}_${Date.now()}_${safeName}`;
};

// ==========================================
// JENIS CUTI (Leave Types)
// ==========================================

// Get Leave Types
router.get('/types', authenticate, checkPermission('leaves.view'), async (req: any, res) => {
    try {
        await ensureCutiAttachmentColumns();
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
router.post('/types', authenticate, checkPermission('leaves.add'), async (req: any, res) => {
    await ensureCutiAttachmentColumns();
    const { nama, kuota, is_paid, is_attachment_required, instansi_id } = req.body;
    const targetInstansiId = req.user.role === 'SUPER_ADMIN' ? (instansi_id || null) : req.user.instansi_id;

    try {
        const [result] = await db.query<ResultSetHeader>(
            'INSERT INTO jenis_cuti (instansi_id, nama, kuota, is_paid, is_attachment_required) VALUES (?, ?, ?, ?, ?)',
            [targetInstansiId, nama, kuota, is_paid ? 1 : 0, is_attachment_required ? 1 : 0]
        );
        res.json({
            id: result.insertId,
            instansi_id: targetInstansiId,
            nama,
            kuota,
            is_paid: is_paid ? 1 : 0,
            is_attachment_required: is_attachment_required ? 1 : 0
        });
    } catch (error) {
        console.error('Error creating leave type:', error);
        res.status(500).json({ error: 'Failed to create leave type' });
    }
});

// Update Leave Type
router.put('/types/:id', authenticate, checkPermission('leaves.edit'), async (req: any, res) => {
    await ensureCutiAttachmentColumns();
    const { id } = req.params;
    const { nama, kuota, is_paid, is_attachment_required } = req.body;

    try {
        await db.query(
            'UPDATE jenis_cuti SET nama = ?, kuota = ?, is_paid = ?, is_attachment_required = ? WHERE id = ?',
            [nama, kuota, is_paid ? 1 : 0, is_attachment_required ? 1 : 0, id]
        );
        res.json({ message: 'Leave type updated successfully' });
    } catch (error) {
        console.error('Error updating leave type:', error);
        res.status(500).json({ error: 'Failed to update leave type' });
    }
});

// Delete Leave Type
router.delete('/types/:id', authenticate, checkPermission('leaves.delete'), async (req: any, res) => {
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
router.get('/holidays', authenticate, checkPermission('holidays.view'), async (req: any, res) => {
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
router.post('/holidays', authenticate, checkPermission('holidays.add'), async (req: any, res) => {
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
router.delete('/holidays/:id', authenticate, checkPermission('holidays.delete'), async (req: any, res) => {
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

// GET storage status (apakah Garage HQ aktif atau fallback local)
router.get('/storage-status', authenticate, async (_req, res) => {
    res.json({
        garage_configured: garageService.isConfigured(),
        provider: garageService.isConfigured() ? 'Garage HQ (S3)' : 'Local Storage (Fallback)'
    });
});

// GET leave requests — membutuhkan leaves.view
router.get('/requests', authenticate, checkPermission('leaves.view'), async (req: AuthRequest, res) => {
    try {
        await ensureCutiAttachmentColumns();
        const { instansi_id } = req.query;
        let query = `
            SELECT i.*, 
                   DATE_FORMAT(i.start_date, '%Y-%m-%d') as start_date,
                   DATE_FORMAT(i.end_date, '%Y-%m-%d') as end_date,
                   k.nama as nama_karyawan, k.nik as nik_karyawan,
                   jc.nama as jenis_cuti, jc.is_paid, jc.is_attachment_required
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

// GET single leave request by ID — membutuhkan leaves.view
router.get('/requests/:id', authenticate, checkPermission('leaves.view'), async (req: any, res) => {
    const { id } = req.params;
    try {
        await ensureCutiAttachmentColumns();
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT i.*, 
                    DATE_FORMAT(i.start_date, '%Y-%m-%d') as start_date,
                    DATE_FORMAT(i.end_date, '%Y-%m-%d') as end_date,
                    k.nama as nama_karyawan, k.nik as nik_karyawan, k.departemen,
                    jc.nama as jenis_cuti, jc.is_paid, jc.kuota, jc.is_attachment_required
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

// GET / View Attachment from Garage HQ (supports Bearer header or ?token= query param)
router.get('/requests/:id/attachment', async (req: any, res) => {
    const { id } = req.params;
    const token = req.headers.authorization?.split(' ')[1] || (req.query.token as string);

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'supersecret_do_not_share';
        jwt.verify(token, secret);
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
        await ensureCutiAttachmentColumns();
        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT attachment_key, attachment_name, attachment_mime FROM cuti WHERE id = ?',
            [id]
        );

        if (rows.length === 0 || !rows[0].attachment_key) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        const { attachment_key, attachment_name, attachment_mime } = rows[0];
        const fileData = await garageService.getFile(attachment_key);

        const contentType = attachment_mime || fileData.contentType || 'application/octet-stream';
        const safeFilename = (attachment_name || 'lampiran').replace(/["\r\n]/g, '_');

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
        res.send(fileData.buffer);
    } catch (error) {
        console.error('Error fetching attachment from Garage HQ:', error);
        res.status(500).json({ error: 'Failed to retrieve attachment file' });
    }
});

// Apply for Leave — membutuhkan leaves.add
router.post('/apply', authenticate, checkPermission('leaves.add'), upload.single('attachment'), async (req: any, res) => {
    await ensureCutiAttachmentColumns();
    const { karyawan_id, jenis_cuti_id, start_date, end_date, reason, status: statusFromBody } = req.body;

    // Check if attachment is required for this leave type
    if (jenis_cuti_id) {
        const [types] = await db.query<RowDataPacket[]>('SELECT is_attachment_required, nama FROM jenis_cuti WHERE id = ?', [jenis_cuti_id]);
        if (types.length > 0 && types[0].is_attachment_required && !req.file) {
            return res.status(400).json({
                error: `Jenis cuti/izin "${types[0].nama}" mewajibkan Anda untuk mengunggah dokumen bukti / surat izin.`
            });
        }
    }

    // Admin/SuperAdmin can set status (e.g. APPROVED), others default to PENDING
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || !!req.user.role_id;
    const status = (isAdmin && statusFromBody) ? statusFromBody : 'PENDING';

    let attachmentKey: string | null = null;
    let attachmentName: string | null = null;
    let attachmentMime: string | null = null;
    let storageProvider: string | null = null;

    try {
        if (req.file) {
            const key = buildObjectKey(karyawan_id, req.file.originalname);
            const uploadRes = await garageService.uploadFile(key, req.file.buffer, req.file.mimetype);
            attachmentKey = uploadRes.key;
            attachmentName = req.file.originalname;
            attachmentMime = req.file.mimetype;
            storageProvider = uploadRes.provider;
        }

        const [result] = await db.query<ResultSetHeader>(
            `INSERT INTO cuti 
             (karyawan_id, jenis_cuti_id, start_date, end_date, reason, status, approved_by, attachment_key, attachment_name, attachment_mime, storage_provider) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                karyawan_id,
                jenis_cuti_id,
                start_date,
                end_date,
                reason,
                status,
                isAdmin ? req.user.id : null,
                attachmentKey,
                attachmentName,
                attachmentMime,
                storageProvider
            ]
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

        res.json({
            message: `Leave request ${status}`,
            id: result.insertId,
            attachment_key: attachmentKey,
            storage_provider: storageProvider
        });
    } catch (error: any) {
        console.error('Error applying for leave:', error);
        res.status(500).json({ 
            error: 'Failed to apply for leave',
            details: error?.message || String(error)
        });
    }
});

// Update Leave Request (Edit) — membutuhkan leaves.edit
router.put('/requests/:id', authenticate, checkPermission('leaves.edit'), upload.single('attachment'), async (req: any, res) => {
    await ensureCutiAttachmentColumns();
    const { id } = req.params;
    const { karyawan_id, jenis_cuti_id, start_date, end_date, reason, status, remove_attachment } = req.body;

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

        // Validation for mandatory attachment
        const [types] = await db.query<RowDataPacket[]>('SELECT is_attachment_required, nama FROM jenis_cuti WHERE id = ?', [targetJenisCutiId]);
        const willHaveAttachment = req.file || (oldLeave.attachment_key && remove_attachment !== 'true' && remove_attachment !== true);
        if (types.length > 0 && types[0].is_attachment_required && !willHaveAttachment) {
            return res.status(400).json({
                error: `Jenis cuti/izin "${types[0].nama}" mewajibkan Anda untuk mengunggah dokumen bukti / surat izin.`
            });
        }

        let attachmentKey = oldLeave.attachment_key;
        let attachmentName = oldLeave.attachment_name;
        let attachmentMime = oldLeave.attachment_mime;
        let storageProvider = oldLeave.storage_provider;

        if (req.file) {
            // Hapus file lama di Garage HQ jika ada
            if (oldLeave.attachment_key) {
                await garageService.deleteFile(oldLeave.attachment_key);
            }
            const key = buildObjectKey(targetKaryawanId, req.file.originalname);
            const uploadRes = await garageService.uploadFile(key, req.file.buffer, req.file.mimetype);
            attachmentKey = uploadRes.key;
            attachmentName = req.file.originalname;
            attachmentMime = req.file.mimetype;
            storageProvider = uploadRes.provider;
        } else if (remove_attachment === 'true' || remove_attachment === true) {
            if (oldLeave.attachment_key) {
                await garageService.deleteFile(oldLeave.attachment_key);
            }
            attachmentKey = null;
            attachmentName = null;
            attachmentMime = null;
            storageProvider = null;
        }

        await db.query(
            `UPDATE cuti 
             SET karyawan_id = ?, jenis_cuti_id = ?, start_date = ?, end_date = ?, reason = ?, status = ?,
                 attachment_key = ?, attachment_name = ?, attachment_mime = ?, storage_provider = ?
             WHERE id = ?`,
            [
                targetKaryawanId,
                targetJenisCutiId,
                targetStartDate,
                targetEndDate,
                targetReason,
                targetStatus,
                attachmentKey,
                attachmentName,
                attachmentMime,
                storageProvider,
                id
            ]
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
    } catch (error: any) {
        console.error('Error updating leave request:', error);
        res.status(500).json({ 
            error: 'Failed to update leave request',
            details: error?.message || String(error)
        });
    }
});

// Delete Leave Request — membutuhkan leaves.delete
router.delete('/requests/:id', authenticate, checkPermission('leaves.delete'), async (req: any, res) => {
    await ensureCutiAttachmentColumns();
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

        // Hapus file lampiran dari Garage HQ jika ada
        if (oldLeave.attachment_key) {
            await garageService.deleteFile(oldLeave.attachment_key);
        }

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

// Approve/Reject — membutuhkan leaves.approve
router.put('/requests/:id/status', authenticate, checkPermission('leaves.approve'), async (req: any, res) => {
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
