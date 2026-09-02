import { Router } from 'express';
import db from '../db';
import { authenticate } from '../middleware/authMiddleware';
import { checkPermission, ALL_PERMISSIONS } from '../middleware/permissionMiddleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logAction } from '../utils/logger';

const router = Router();

// GET all available permissions (for UI)
router.get('/permissions-list', authenticate, async (req: any, res) => {
    res.json(ALL_PERMISSIONS);
});

// GET all roles
router.get('/', authenticate, async (req: any, res) => {
    try {
        let query = `
            SELECT r.*, i.nama as instansi_nama,
                (SELECT COUNT(*) FROM admin WHERE role_id = r.id) as admin_count
            FROM roles r
            LEFT JOIN instansi i ON r.instansi_id = i.id
        `;
        const params: any[] = [];

        // Non-super-admins only see roles from their instansi + global system roles
        if (req.user.role !== 'SUPER_ADMIN') {
            query += ` WHERE r.is_system = 1 OR r.instansi_id = ?`;
            params.push(req.user.instansi_id);
        }

        query += ` ORDER BY r.is_system DESC, r.name ASC`;

        const [roles] = await db.query<RowDataPacket[]>(query, params);

        // Get permissions for each role
        for (const role of roles) {
            const [perms] = await db.query<RowDataPacket[]>(
                'SELECT permission_key FROM role_permissions WHERE role_id = ?',
                [role.id]
            );
            role.permissions = perms.map((p: any) => p.permission_key);
        }

        res.json(roles);
    } catch (error) {
        console.error('Failed to fetch roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

// GET single role by ID
router.get('/:id', authenticate, async (req: any, res) => {
    try {
        const [roles] = await db.query<RowDataPacket[]>(
            `SELECT r.*, i.nama as instansi_nama 
             FROM roles r LEFT JOIN instansi i ON r.instansi_id = i.id 
             WHERE r.id = ?`,
            [req.params.id]
        );

        if (roles.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }

        const role = roles[0];
        const [perms] = await db.query<RowDataPacket[]>(
            'SELECT permission_key FROM role_permissions WHERE role_id = ?',
            [role.id]
        );
        role.permissions = perms.map((p: any) => p.permission_key);

        res.json(role);
    } catch (error) {
        console.error('Failed to fetch role:', error);
        res.status(500).json({ error: 'Failed to fetch role' });
    }
});

// CREATE role
router.post('/', authenticate, checkPermission('roles'), async (req: any, res) => {
    const { name, description, permissions, instansi_id } = req.body;

    if (!name) return res.status(400).json({ error: 'Role name is required' });

    try {
        // Check uniqueness
        const [existing] = await db.query<RowDataPacket[]>(
            'SELECT id FROM roles WHERE name = ?', [name]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Role name already exists' });
        }

        // Determine instansi_id: SUPER_ADMIN can create global or per-instansi
        const targetInstansiId = req.user.role === 'SUPER_ADMIN'
            ? (instansi_id || null)
            : req.user.instansi_id;

        const [result] = await db.query<ResultSetHeader>(
            'INSERT INTO roles (name, description, is_system, instansi_id) VALUES (?, ?, 0, ?)',
            [name, description || null, targetInstansiId]
        );

        const roleId = result.insertId;

        // Insert permissions via bulk insert to save DB roundtrips
        if (permissions && Array.isArray(permissions) && permissions.length > 0) {
            const values = permissions.map(perm => [roleId, perm]);
            await db.query(
                'INSERT IGNORE INTO role_permissions (role_id, permission_key) VALUES ?',
                [values]
            );
        }

        logAction(req.user.id, req.user.nama || req.user.username, 'CREATE_ROLE', {
            role_name: name, permissions
        });

        res.status(201).json({ message: 'Role created successfully', id: roleId });
    } catch (error) {
        console.error('Failed to create role:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create role' });
    }
});

// UPDATE role
router.put('/:id', authenticate, checkPermission('roles'), async (req: any, res) => {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    try {
        // Check if role exists and is not system
        const [roles] = await db.query<RowDataPacket[]>(
            'SELECT * FROM roles WHERE id = ?', [id]
        );
        if (roles.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }

        const role = roles[0];

        // System roles: can update permissions for ADMIN, cannot edit SUPER_ADMIN
        if (role.is_system && role.name === 'SUPER_ADMIN') {
            return res.status(400).json({ error: 'Cannot modify SUPER_ADMIN role' });
        }

        // Update role info (name/description only if not system, or if system only description)
        if (role.is_system) {
            // For system roles, only allow updating description and permissions
            if (description !== undefined) {
                await db.query('UPDATE roles SET description = ? WHERE id = ?', [description, id]);
            }
        } else {
            const fields: string[] = [];
            const params: any[] = [];

            if (name) { fields.push('name = ?'); params.push(name); }
            if (description !== undefined) { fields.push('description = ?'); params.push(description); }

            if (fields.length > 0) {
                params.push(id);
                await db.query(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`, params);
            }
        }

        // Update permissions (replace all and single bulk insert)
        if (permissions && Array.isArray(permissions)) {
            await db.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
            if (permissions.length > 0) {
                const values = permissions.map(perm => [id, perm]);
                await db.query(
                    'INSERT INTO role_permissions (role_id, permission_key) VALUES ?',
                    [values]
                );
            }
        }

        logAction(req.user.id, req.user.nama || req.user.username, 'UPDATE_ROLE', {
            role_id: id, role_name: name || role.name, permissions
        });

        res.json({ message: 'Role updated successfully' });
    } catch (error) {
        console.error('Failed to update role:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update role' });
    }
});

// DELETE role
router.delete('/:id', authenticate, checkPermission('roles'), async (req: any, res) => {
    const { id } = req.params;

    try {
        const [roles] = await db.query<RowDataPacket[]>(
            'SELECT * FROM roles WHERE id = ?', [id]
        );
        if (roles.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }

        if (roles[0].is_system) {
            return res.status(400).json({ error: 'Cannot delete system roles' });
        }

        // Check if any admins are using this role
        const [admins] = await db.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM admin WHERE role_id = ?', [id]
        );
        if (admins[0].count > 0) {
            return res.status(400).json({
                error: `Cannot delete role. ${admins[0].count} admin(s) are still using this role. Please reassign them first.`
            });
        }

        await db.query('DELETE FROM roles WHERE id = ?', [id]);

        logAction(req.user.id, req.user.nama || req.user.username, 'DELETE_ROLE', {
            role_name: roles[0].name
        });

        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        console.error('Failed to delete role:', error);
        res.status(500).json({ error: 'Failed to delete role' });
    }
});

export default router;
