const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '103.92.209.102',
    user: process.env.DB_USER || 'dev',
    password: process.env.DB_PASSWORD || 'dev1745',
    database: process.env.DB_NAME || 'adms_absensi'
  });

  try {
    await conn.query("UPDATE instansi SET hari_kerja = '1,2,3,4,5' WHERE hari_kerja IS NULL");
    console.log('OK: existing rows updated to the default hari_kerja.');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await conn.end();
  }
})();
