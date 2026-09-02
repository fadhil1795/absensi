
const mysql = require('mysql2/promise');
(async () => {
    try {
        const db = await mysql.createConnection({
            host: '103.92.209.102',
            user: 'attendance',
            password: 'dev1745',
            database: 'attendance'
        });
        const [rows] = await db.execute('SELECT username, password_hash FROM admin WHERE username = "admin"');
        if (rows.length > 0) {
            console.log('Username:', rows[0].username);
            console.log('Hash:', rows[0].password_hash);
            console.log('Length:', rows[0].password_hash.length);
        } else {
            console.log('User not found');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
