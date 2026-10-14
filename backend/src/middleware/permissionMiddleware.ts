import { Request, Response, NextFunction } from 'express';
import db from '../db';
import { RowDataPacket } from 'mysql2';

/**
 * Middleware to check if the authenticated user has a specific permission.
 * SUPER_ADMIN always bypasses permission checks.
 * Supports granular permission keys: e.g. "rekap.view", "rekap.edit"
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
 * Full list of all available permissions — granular per-operation format.
 * Key format: "{menu}.{operation}"
 * Operations: view | add | edit | delete | export | process | approve
 */
export const ALL_PERMISSIONS = [
    // General
    { key: 'dashboard.view', label: 'Lihat Dashboard', group: 'General', menu: 'dashboard' },

    // User Management
    { key: 'employees.view',   label: 'Lihat Karyawan',       group: 'User Management', menu: 'employees' },
    { key: 'employees.add',    label: 'Tambah Karyawan',      group: 'User Management', menu: 'employees' },
    { key: 'employees.edit',   label: 'Edit Karyawan',        group: 'User Management', menu: 'employees' },
    { key: 'employees.delete', label: 'Hapus Karyawan',       group: 'User Management', menu: 'employees' },
    { key: 'employees.export', label: 'Export Data Karyawan', group: 'User Management', menu: 'employees' },

    { key: 'mobile_users.view',   label: 'Lihat Mobile Users',  group: 'User Management', menu: 'mobile_users' },
    { key: 'mobile_users.add',    label: 'Tambah Mobile User',  group: 'User Management', menu: 'mobile_users' },
    { key: 'mobile_users.edit',   label: 'Edit Mobile User',    group: 'User Management', menu: 'mobile_users' },
    { key: 'mobile_users.delete', label: 'Hapus Mobile User',   group: 'User Management', menu: 'mobile_users' },

    { key: 'shifts.view',   label: 'Lihat Shift',  group: 'User Management', menu: 'shifts' },
    { key: 'shifts.add',    label: 'Tambah Shift', group: 'User Management', menu: 'shifts' },
    { key: 'shifts.edit',   label: 'Edit Shift',   group: 'User Management', menu: 'shifts' },
    { key: 'shifts.delete', label: 'Hapus Shift',  group: 'User Management', menu: 'shifts' },

    { key: 'admins.view',   label: 'Lihat Admin',  group: 'User Management', menu: 'admins' },
    { key: 'admins.add',    label: 'Tambah Admin', group: 'User Management', menu: 'admins' },
    { key: 'admins.edit',   label: 'Edit Admin',   group: 'User Management', menu: 'admins' },
    { key: 'admins.delete', label: 'Hapus Admin',  group: 'User Management', menu: 'admins' },

    { key: 'roles.view',   label: 'Lihat Role',  group: 'User Management', menu: 'roles' },
    { key: 'roles.add',    label: 'Tambah Role', group: 'User Management', menu: 'roles' },
    { key: 'roles.edit',   label: 'Edit Role',   group: 'User Management', menu: 'roles' },
    { key: 'roles.delete', label: 'Hapus Role',  group: 'User Management', menu: 'roles' },

    // Organisasi
    { key: 'departments.view',   label: 'Lihat Departemen',  group: 'Organisasi', menu: 'departments' },
    { key: 'departments.add',    label: 'Tambah Departemen', group: 'Organisasi', menu: 'departments' },
    { key: 'departments.edit',   label: 'Edit Departemen',   group: 'Organisasi', menu: 'departments' },
    { key: 'departments.delete', label: 'Hapus Departemen',  group: 'Organisasi', menu: 'departments' },

    { key: 'instansi.view',   label: 'Lihat Instansi',  group: 'Organisasi', menu: 'instansi' },
    { key: 'instansi.add',    label: 'Tambah Instansi', group: 'Organisasi', menu: 'instansi' },
    { key: 'instansi.edit',   label: 'Edit Instansi',   group: 'Organisasi', menu: 'instansi' },
    { key: 'instansi.delete', label: 'Hapus Instansi',  group: 'Organisasi', menu: 'instansi' },

    { key: 'machines.view',   label: 'Lihat Mesin',  group: 'Organisasi', menu: 'machines' },
    { key: 'machines.add',    label: 'Tambah Mesin', group: 'Organisasi', menu: 'machines' },
    { key: 'machines.edit',   label: 'Edit Mesin',   group: 'Organisasi', menu: 'machines' },
    { key: 'machines.delete', label: 'Hapus Mesin',  group: 'Organisasi', menu: 'machines' },

    { key: 'schedule.view',   label: 'Lihat Jadwal',  group: 'Organisasi', menu: 'schedule' },
    { key: 'schedule.add',    label: 'Tambah Jadwal', group: 'Organisasi', menu: 'schedule' },
    { key: 'schedule.edit',   label: 'Edit Jadwal',   group: 'Organisasi', menu: 'schedule' },
    { key: 'schedule.delete', label: 'Hapus Jadwal',  group: 'Organisasi', menu: 'schedule' },

    // Absensi
    { key: 'realtime.view', label: 'Lihat Live Monitoring', group: 'Absensi', menu: 'realtime' },

    { key: 'rekap.view',    label: 'Lihat Rekap',         group: 'Absensi', menu: 'rekap' },
    { key: 'rekap.edit',    label: 'Edit Record Rekap',   group: 'Absensi', menu: 'rekap' },
    { key: 'rekap.delete',  label: 'Hapus Record Rekap',  group: 'Absensi', menu: 'rekap' },
    { key: 'rekap.export',  label: 'Export Rekap Excel',  group: 'Absensi', menu: 'rekap' },
    { key: 'rekap.process', label: 'Proses Manual Rekap', group: 'Absensi', menu: 'rekap' },

    { key: 'audit_logs.view', label: 'Lihat Audit Log', group: 'Absensi', menu: 'audit_logs' },

    // Leave Management
    { key: 'leaves.view',    label: 'Lihat Izin/Cuti',    group: 'Leave Management', menu: 'leaves' },
    { key: 'leaves.add',     label: 'Tambah Izin/Cuti',   group: 'Leave Management', menu: 'leaves' },
    { key: 'leaves.edit',    label: 'Edit Izin/Cuti',     group: 'Leave Management', menu: 'leaves' },
    { key: 'leaves.delete',  label: 'Hapus Izin/Cuti',    group: 'Leave Management', menu: 'leaves' },
    { key: 'leaves.approve', label: 'Approve/Tolak Izin', group: 'Leave Management', menu: 'leaves' },

    { key: 'holidays.view',   label: 'Lihat Hari Libur',  group: 'Leave Management', menu: 'holidays' },
    { key: 'holidays.add',    label: 'Tambah Hari Libur', group: 'Leave Management', menu: 'holidays' },
    { key: 'holidays.edit',   label: 'Edit Hari Libur',   group: 'Leave Management', menu: 'holidays' },
    { key: 'holidays.delete', label: 'Hapus Hari Libur',  group: 'Leave Management', menu: 'holidays' },

    // Komunikasi
    { key: 'information.view',   label: 'Lihat Informasi',  group: 'Komunikasi', menu: 'information' },
    { key: 'information.add',    label: 'Tambah Informasi', group: 'Komunikasi', menu: 'information' },
    { key: 'information.edit',   label: 'Edit Informasi',   group: 'Komunikasi', menu: 'information' },
    { key: 'information.delete', label: 'Hapus Informasi',  group: 'Komunikasi', menu: 'information' },

    // Laporan
    { key: 'reports.view',   label: 'Lihat Laporan',  group: 'Laporan', menu: 'reports' },
    { key: 'reports.export', label: 'Export Laporan', group: 'Laporan', menu: 'reports' },
];
