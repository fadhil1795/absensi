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
    // Check if column already exists
    const [cols] = await conn.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instansi' AND COLUMN_NAME = 'hari_kerja'"
    );

    if (cols.length > 0) {
      console.log('INFO: Kolom hari_kerja sudah ada di tabel instansi. Skip.');
    } else {
      await conn.query(
        "ALTER TABLE instansi ADD COLUMN hari_kerja VARCHAR(20) DEFAULT NULL COMMENT '0=Minggu,1=Senin,...,6=Sabtu. Contoh: 1,2,3,4,5 = Senin-Jumat'"
      );
      console.log('OK: Kolom hari_kerja berhasil ditambahkan ke tabel instansi.');
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await conn.end();
  }
})();
