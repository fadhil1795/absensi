import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Hook to manage user permissions.
 * Reads permissions from localStorage (set during login)
 * and provides helper functions to check access.
 *
 * Permission format: "{menu}.{operation}" e.g. "rekap.view", "rekap.edit"
 * Operations: view | add | edit | delete | export | process | approve
 */
export const usePermissions = () => {
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.permissions) {
            setPermissions(user.permissions);
        }
        // SUPER_ADMIN always has everything
        if (user.role === 'SUPER_ADMIN') {
            setPermissions(ALL_PERMISSION_DEFS.map(p => p.key));
        }
        setLoading(false);

        // Auto-refresh permissions from server so permission changes reflect immediately without logout
        const token = localStorage.getItem('token');
        if (token && user.role !== 'SUPER_ADMIN') {
            axios.get(`${API_BASE_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => {
                if (res.data?.permissions) {
                    setPermissions(res.data.permissions);
                    user.permissions = res.data.permissions;
                    user.role_name = res.data.role_name;
                    user.role_id = res.data.role_id;
                    localStorage.setItem('user', JSON.stringify(user));
                }
            }).catch(err => {
                console.warn('Silent permission refresh failed:', err);
            });
        }
    }, []);

    /**
     * Check if user has a specific permission key (exact match)
     */
    const hasPermission = useCallback((permissionKey: string): boolean => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'SUPER_ADMIN') return true;
        return permissions.includes(permissionKey);
    }, [permissions]);

    /**
     * Check if user can perform a specific operation on a menu.
     * e.g. hasOperation('rekap', 'edit') → checks 'rekap.edit'
     * Also accepts legacy flat key: hasOperation('rekap') → checks 'rekap.view'
     */
    const hasOperation = useCallback((menu: string, operation: string = 'view'): boolean => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'SUPER_ADMIN') return true;
        const key = `${menu}.${operation}`;
        return permissions.includes(key);
    }, [permissions]);

    /**
     * Refresh permissions from server (useful after role changes)
     */
    const refreshPermissions = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const updatedPerms = res.data.permissions || [];
            setPermissions(updatedPerms);

            // Update localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.permissions = updatedPerms;
            user.role_name = res.data.role_name;
            user.role_id = res.data.role_id;
            localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
            console.error('Failed to refresh permissions:', error);
        }
    }, []);

    return { permissions, hasPermission, hasOperation, refreshPermissions, loading };
};

/**
 * Permission operation types
 */
export type PermissionOperation = 'view' | 'add' | 'edit' | 'delete' | 'export' | 'process' | 'approve';

/**
 * Permission definition with menu grouping and available operations
 */
export interface PermissionDef {
    key: string;         // Full key e.g. "rekap.edit"
    label: string;       // Display label
    group: string;       // Menu group label
    menu: string;        // Menu identifier e.g. "rekap"
    operation: PermissionOperation;  // Operation type
    menuLabel: string;   // Human-readable menu name
}

/**
 * Menu definitions — defines which operations are available per menu
 */
export const MENU_DEFS: {
    menu: string;
    menuLabel: string;
    group: string;
    operations: { op: PermissionOperation; label: string }[];
}[] = [
    {
        menu: 'dashboard', menuLabel: 'Dashboard', group: 'General',
        operations: [{ op: 'view', label: 'Lihat Dashboard' }]
    },
    {
        menu: 'employees', menuLabel: 'Karyawan', group: 'User Management',
        operations: [
            { op: 'view', label: 'Lihat Data' },
            { op: 'add', label: 'Tambah' },
            { op: 'edit', label: 'Edit' },
            { op: 'delete', label: 'Hapus' },
            { op: 'export', label: 'Export' },
        ]
    },
    {
        menu: 'mobile_users', menuLabel: 'Mobile Users', group: 'User Management',
        operations: [
            { op: 'view', label: 'Lihat Data' },
            { op: 'add', label: 'Tambah' },
            { op: 'edit', label: 'Edit' },
            { op: 'delete', label: 'Hapus' },
        ]
    },
    {
        menu: 'shifts', menuLabel: 'Shift / Sesi', group: 'User Management',
        operations: [
            { op: 'view', label: 'Lihat Data' },
            { op: 'add', label: 'Tambah' },
            { op: 'edit', label: 'Edit' },
            { op: 'delete', label: 'Hapus' },
        ]
    },
    {
        menu: 'admins', menuLabel: 'Admin Management', group: 'User Management',
        operations: [
            { op: 'view', label: 'Lihat Data' },
            { op: 'add', label: 'Tambah' },
            { op: 'edit', label: 'Edit' },
            { op: 'delete', label: 'Hapus' },
        ]
    },
    {
        menu: 'roles', menuLabel: 'Role Management', group: 'User Management',
        operations: [
            { op: 'view', label: 'Lihat Data' },
            { op: 'add', label: 'Tambah' },
            { op: 'edit', label: 'Edit' },
            { op: 'delete', label: 'Hapus' },
        ]
    },
    {
        menu: 'departments', menuLabel: 'Departemen', group: 'Organisasi',
        operations: [
            { op: 'view', label: 'Lihat Data' },
            { op: 'add', label: 'Tambah' },
            { op: 'edit', label: 'Edit' },
            { op: 'delete', label: 'Hapus' },
        ]
    },
    {
        menu: 'instansi', menuLabel: 'Instansi', group: 'Organisasi',
        operations: [
            { op: 'view', label: 'Lihat Data' },
            { op: 'add', label: 'Tambah' },
            { op: 'edit', label: 'Edit' },
            { op: 'delete', label: 'Hapus' },
        ]
    },
    {
        menu: 'machines', menuLabel: 'Mesin Absensi', group: 'Organisasi',
        operations: [
            { op: 'view', label: 'Lihat Data' },
            { op: 'add', label: 'Tambah' },
            { op: 'edit', label: 'Edit' },
            { op: 'delete', label: 'Hapus' },
        ]
    },
    {
        menu: 'schedule', menuLabel: 'Jadwal', group: 'Organisasi',
        operations: [
            { op: 'view', label: 'Lihat Data' },
            { op: 'add', label: 'Tambah' },
            { op: 'edit', label: 'Edit' },
            { op: 'delete', label: 'Hapus' },
        ]
    },
    {
        menu: 'realtime', menuLabel: 'Live Monitoring', group: 'Absensi',
        operations: [{ op: 'view', label: 'Lihat Monitoring' }]
    },
    {
        menu: 'rekap', menuLabel: 'Rekap Shift', group: 'Absensi',
        operations: [
            { op: 'view', label: 'Lihat Data' },
            { op: 'edit', label: 'Edit Record' },
            { op: 'delete', label: 'Hapus Record' },
            { op: 'export', label: 'Export Excel' },
            { op: 'process', label: 'Proses Manual' },
        ]
    },
    {
        menu: 'audit_logs', menuLabel: 'Audit Logs', group: 'Absensi',
        operations: [{ op: 'view', label: 'Lihat Log' }]
    },
    {
        menu: 'leaves', menuLabel: 'Izin / Cuti', group: 'Leave Management',
        operations: [
            { op: 'view', label: 'Lihat Data' },
            { op: 'add', label: 'Tambah' },
            { op: 'edit', label: 'Edit' },
            { op: 'delete', label: 'Hapus' },
            { op: 'approve', label: 'Approve / Tolak' },
        ]
    },
    {
        menu: 'holidays', menuLabel: 'Hari Libur', group: 'Leave Management',
        operations: [
            { op: 'view', label: 'Lihat Data' },
            { op: 'add', label: 'Tambah' },
            { op: 'edit', label: 'Edit' },
            { op: 'delete', label: 'Hapus' },
        ]
    },
    {
        menu: 'information', menuLabel: 'Informasi', group: 'Komunikasi',
        operations: [
            { op: 'view', label: 'Lihat Data' },
            { op: 'add', label: 'Tambah' },
            { op: 'edit', label: 'Edit' },
            { op: 'delete', label: 'Hapus' },
        ]
    },
    {
        menu: 'reports', menuLabel: 'Laporan Absensi', group: 'Laporan',
        operations: [
            { op: 'view', label: 'Lihat Laporan' },
            { op: 'export', label: 'Export Laporan' },
        ]
    },
];

/**
 * All available permission definitions (mirrors backend) — flattened
 */
export const ALL_PERMISSION_DEFS: PermissionDef[] = MENU_DEFS.flatMap(m =>
    m.operations.map(o => ({
        key: `${m.menu}.${o.op}`,
        label: o.label,
        group: m.group,
        menu: m.menu,
        operation: o.op,
        menuLabel: m.menuLabel,
    }))
);
