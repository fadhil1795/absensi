import { Router } from 'express';
import db from '../db';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { RowDataPacket } from 'mysql2';

const router = Router();

router.get('/', authenticate, authorize(['SUPER_ADMIN']), async (req: any, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const sql = `
            SELECT * FROM audit_logs 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;

        const [rows] = await db.query<RowDataPacket[]>(sql, [Number(limit), Number(offset)]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

export default router;
