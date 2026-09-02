const db = require('./src/db').default;
async function test() {
    try {
        console.log('Testing...');
        const [res] = await db.query('SELECT 1 as val');
        console.log('DB ok:', res);
        
        const id = '1'; 
        const permissions = ['dashboard', 'reports'];
        await db.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
        console.log('DELETE ok');
        
        for (const perm of permissions) {
            await db.query('INSERT INTO role_permissions (role_id, permission_key) VALUES (?, ?)', [id, perm]);
        }
        console.log('INSERT ok');
        process.exit(0);
    } catch(e) {
        console.error('ERROR OCCURRED!!!', e);
        process.exit(1);
    }
}
test();
