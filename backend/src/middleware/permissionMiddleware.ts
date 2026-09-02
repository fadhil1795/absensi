import { Request, Response, NextFunction } from 'express';
import db from '../db';
import { RowDataPacket } from 'mysql2';

/**
 * Middleware to check if the authenticated user has a specific permission.
 * SUPER_ADMIN always bypasses permission checks.
 */
export const checkPermission = (permissionKey: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // SUPER_ADMIN always has all permissions
        if (user.role === 'SUPER_ADMIN') {
            return next();
        }

        try {
            // Check if user's role has this permission
            const roleId = user.role_id;
            if (!roleId) {
                return res.status(403).json({ error: 'No role assigned' });
            }

            const [perms] = await db.query<RowDataPacket[]>(
                `SELECT rp.permission_key FROM role_permissions rp 
                 WHERE rp.role_id = ? AND rp.permission_key = ?`,
                [roleId, permissionKey]
            );

            if (perms.length === 0) {
                return res.status(403).json({ error: 'You do not have permission to access this feature' });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ error: 'Permission check failed' });
        }
    };
};

/**
 * Get all permissions for a given role_id
 */
export const getPermissionsForRole = async (roleId: number): Promise<string[]> => {
    const [perms] = await db.query<RowDataPacket[]>(
        'SELECT permission_key FROM role_permissions WHERE role_id = ?',
        [roleId]
    );
    return perms.map(p => p.permission_key);
};

/**
 * Full list of all available permissions
 */
export const ALL_PERMISSIONS = [
    { key: 'dashboard', label: 'Dashboard Overview', group: 'General' },
    { key: 'employees', label: 'Employees Management', group: 'User Management' },
    { key: 'mobile_users', label: 'Mobile Users', group: 'User Management' },
    { key: 'shifts', label: 'Sesi / Mata Pelajaran', group: 'User Management' },
    { key: 'admins', label: 'Admin Management', group: 'User Management' },
    { key: 'roles', label: 'Role Management', group: 'User Management' },
    { key: 'departments', label: 'Departments', group: 'Organization' },
    { key: 'instansi', label: 'Instansi', group: 'Organization' },
    { key: 'machines', label: 'Mesin Absensi', group: 'Organization' },
    { key: 'schedule', label: 'Schedule Management', group: 'Organization' },
    { key: 'realtime', label: 'Live Monitoring', group: 'Attendance' },
    { key: 'rekap', label: 'Rekap Shift', group: 'Attendance' },
    { key: 'audit_logs', label: 'Audit Logs', group: 'Attendance' },
    { key: 'leaves', label: 'Leave Requests', group: 'Leave Management' },
    { key: 'holidays', label: 'Holidays', group: 'Leave Management' },
    { key: 'information', label: 'Information / Announcements', group: 'Communication' },
    { key: 'reports', label: 'Laporan Absensi', group: 'Reports' },
];
