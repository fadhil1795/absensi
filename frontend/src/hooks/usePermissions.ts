import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Hook to manage user permissions.
 * Reads permissions from localStorage (set during login)
 * and provides helper functions to check access.
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
            setPermissions([
                'dashboard', 'employees', 'mobile_users', 'shifts', 'admins', 'roles',
                'departments', 'instansi', 'machines', 'schedule', 'realtime',
                'rekap', 'audit_logs', 'leaves', 'holidays', 'information', 'reports'
            ]);
        }
        setLoading(false);
    }, []);

    /**
     * Check if user has a specific permission
     */
    const hasPermission = useCallback((permissionKey: string): boolean => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'SUPER_ADMIN') return true;
        return permissions.includes(permissionKey);
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

    return { permissions, hasPermission, refreshPermissions, loading };
};

/**
 * All available permission definitions (mirrors backend)
 */
export const ALL_PERMISSION_DEFS = [
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
