import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixOldRekap() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: 3306
    });

    console.log('Connecting to database...');

    // 1. Update 'Belum Pulang' -> 'Hadir' (yang ada jam_masuk)
    const [r1]: any = await conn.execute(
        "UPDATE rekap_absensi SET status_kehadiran = 'Hadir', updated_at = NOW() WHERE status_kehadiran = 'Belum Pulang' AND jam_masuk IS NOT NULL"
    );
    console.log(`[1] Fixed 'Belum Pulang' -> 'Hadir': ${r1.affectedRows} rows updated`);

    // 2. Update 'Pulang Cepat' -> 'Hadir'
    const [r2]: any = await conn.execute(
        "UPDATE rekap_absensi SET status_kehadiran = 'Hadir', updated_at = NOW() WHERE status_kehadiran = 'Pulang Cepat'"
    );
    console.log(`[2] Fixed 'Pulang Cepat' -> 'Hadir': ${r2.affectedRows} rows updated`);

    // 3. Update 'Terlambat' -> 'Hadir' (terlambat_menit tetap tercatat)
    const [r3]: any = await conn.execute(
        "UPDATE rekap_absensi SET status_kehadiran = 'Hadir', updated_at = NOW() WHERE status_kehadiran = 'Terlambat' AND jam_masuk IS NOT NULL"
    );
    console.log(`[3] Fixed 'Terlambat' -> 'Hadir': ${r3.affectedRows} rows updated`);

    await conn.end();
    console.log('Done! All old rekap records have been fixed.');
}

fixOldRekap().catch(console.error);
