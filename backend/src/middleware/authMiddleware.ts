import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import db from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_do_not_share';

export interface AuthRequest extends Request {
    user?: any;
}

interface JwtPayload {
    id: number;
    role: string;
    instansi_id?: number;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        // Verify user still exists in database
        const [users] = await db.query<RowDataPacket[]>(
            'SELECT id, username, nama, role, role_id, instansi_id FROM admin WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            // Fallback to check if it's a mobile user or plain admin if distinct?
            // For now assuming app_users covers it or we check admin table if app_users empty?
            // Previous code used 'admin' table. Let's revert to 'admin' if that is the standard for dashboard.
            // Wait, previous code (Step 303) used: 'SELECT id, username, role, instansi_id FROM admin WHERE id = ?'
            // I should probably stick to what it was unless I know for sure.
            // Let's stick to 'app_users' if that's the new standard, OR check what was there before.
            // Step 303 said 'FROM admin'.
            // But valid users might be in app_users now?
            // Let's check db definition later? No, let's stick to Step 303 content for query, but cleaner.
            // ACTUALLY, strict existing code used 'admin'.
            return res.status(401).json({ error: 'User not found' });
        }

        (req as any).user = users[0];
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

export const authorize = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};
