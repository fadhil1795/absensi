const db = require('./src/db').default;
async function run() {
    try {
        const [roles] = await db.query('SELECT * FROM roles LIMIT 1');
        if (roles.length > 0) {
            const roleId = roles[0].id;
            console.log('Testing update on role id:', roleId);
            const permissions = ['dashboard', 'reports'];
            const description = 'Testing description';
            
            // This is the literal code block
            await db.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
            for (const perm of permissions) {
                await db.query('INSERT INTO role_permissions (role_id, permission_key) VALUES (?, ?)', [roleId, perm]);
            }
            console.log('Update permissions success');
        } else {
            console.log('No roles found in db');
        }
    } catch(e) {
        console.error('ERROR CAUGHT:', e);
    }
    process.exit(0);
}
run();
