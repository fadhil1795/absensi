
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

(async () => {
    try {
        const db = await mysql.createConnection({
            host: '103.92.209.102',
            user: 'attendance',
            password: 'dev1745',
            database: 'attendance'
        });
        const pw = 'admin123';
        const hash = await bcrypt.hash(pw, 10);
        await db.execute('UPDATE admin SET password_hash = ? WHERE username = "admin"', [hash]);
        console.log('Password for "admin" has been reset to "admin123"');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
