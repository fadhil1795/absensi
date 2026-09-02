import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const pool = mysql.createPool({
    host: process.env.DB_HOST || '103.92.209.102',
    user: process.env.DB_USER || 'dev',
    password: process.env.DB_PASSWORD || 'dev1745',
    database: process.env.DB_NAME || 'adms_absensi',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export default pool;
