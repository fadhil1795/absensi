import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const ALL_PERMISSIONS = [
    'dashboard',
    'employees',
    'mobile_users',
    'shifts',
    'admins',
    'departments',
    'instansi',
    'machines',
    'schedule',
    'realtime',
    'rekap',
    'audit_logs',
    'leaves',
    'holidays',
    'information',
    'reports',
    'roles'
];

async function setup() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || '103.92.209.102',
        user: process.env.DB_USER || 'attendance',
        password: process.env.DB_PASSWORD || 'dev1745',
        database: process.env.DB_NAME || 'attendance',
    });

    console.log('Connected to database.');

    // 1. Create roles table
    await db.query(`
        CREATE TABLE IF NOT EXISTS roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description VARCHAR(255),
            is_system TINYINT(1) DEFAULT 0,
            instansi_id INT NULL,
            created_at DATETIME DEFAULT NOW(),
            updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
            FOREIGN KEY (instansi_id) REFERENCES instansi(id) ON DELETE CASCADE
        )
    `);
    console.log('✅ Table "roles" created.');

    // 2. Create role_permissions table
    await db.query(`
        CREATE TABLE IF NOT EXISTS role_permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            role_id INT NOT NULL,
            permission_key VARCHAR(50) NOT NULL,
            created_at DATETIME DEFAULT NOW(),
            UNIQUE KEY unique_role_permission (role_id, permission_key),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        )
    `);
    console.log('✅ Table "role_permissions" created.');

    // 3. Add role_id column to admin table (if not exists)
    const [columns]: any = await db.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin' AND COLUMN_NAME = 'role_id'
    `, [process.env.DB_NAME || 'attendance']);

    if (columns.length === 0) {
        await db.query(`ALTER TABLE admin ADD COLUMN role_id INT NULL AFTER role`);
        console.log('✅ Column "role_id" added to admin table.');
    } else {
        console.log('⏭️  Column "role_id" already exists.');
    }

    // 4. Seed system roles
    // Insert SUPER_ADMIN role
    await db.query(`
        INSERT IGNORE INTO roles (name, description, is_system) 
        VALUES ('SUPER_ADMIN', 'Full access to all features. Cannot be modified.', 1)
    `);
    // Insert default ADMIN role
    await db.query(`
        INSERT IGNORE INTO roles (name, description, is_system) 
        VALUES ('ADMIN', 'Default admin role with all permissions.', 1)
    `);
    console.log('✅ System roles seeded (SUPER_ADMIN, ADMIN).');

    // 5. Assign all permissions to ADMIN role
    const [adminRole]: any = await db.query(`SELECT id FROM roles WHERE name = 'ADMIN'`);
    if (adminRole.length > 0) {
        const adminRoleId = adminRole[0].id;
        for (const perm of ALL_PERMISSIONS) {
            await db.query(`
                INSERT IGNORE INTO role_permissions (role_id, permission_key) VALUES (?, ?)
            `, [adminRoleId, perm]);
        }
        console.log('✅ All permissions assigned to ADMIN role.');
    }

    // 6. Migrate existing admins to use role_id
    const [superAdminRole]: any = await db.query(`SELECT id FROM roles WHERE name = 'SUPER_ADMIN'`);
    if (superAdminRole.length > 0 && adminRole.length > 0) {
        await db.query(
            `UPDATE admin SET role_id = ? WHERE role = 'SUPER_ADMIN' AND role_id IS NULL`,
            [superAdminRole[0].id]
        );
        await db.query(
            `UPDATE admin SET role_id = ? WHERE role = 'ADMIN' AND role_id IS NULL`,
            [adminRole[0].id]
        );
        console.log('✅ Existing admins migrated to use role_id.');
    }

    console.log('\n🎉 Setup complete!');
    await db.end();
}

setup().catch(err => {
    console.error('Setup failed:', err);
    process.exit(1);
});
