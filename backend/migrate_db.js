/**
 * migrate_db.js
 * Script untuk menyesuaikan struktur database
 * Menggunakan mysql2 langsung - kompatibel semua versi MySQL
 * Jalankan: node migrate_db.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || '103.92.209.102',
  user: process.env.DB_USER || 'dev',
  password: process.env.DB_PASSWORD || 'dev1745',
  database: process.env.DB_NAME || 'adms_absensi',
};

// ─────────────────────────────────────────────────────────────
// Helper: Tambah kolom jika belum ada
// ─────────────────────────────────────────────────────────────
async function addColumnIfNotExists(conn, table, column, definition) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_CONFIG.database, table, column]
  );
  if (rows.length === 0) {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`   + Kolom ditambah: ${table}.${column}`);
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────
// Helper: Buat tabel jika belum ada
// ─────────────────────────────────────────────────────────────
async function createTableIfNotExists(conn, tableName, sql) {
  const [rows] = await conn.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [DB_CONFIG.database, tableName]
  );
  if (rows.length === 0) {
    await conn.query(sql);
    console.log(`   ✅ Tabel dibuat: ${tableName}`);
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────
// Helper: Tambah unique key jika belum ada
// ─────────────────────────────────────────────────────────────
async function addIndexIfNotExists(conn, table, indexName, sql) {
  const [rows] = await conn.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [DB_CONFIG.database, table, indexName]
  );
  if (rows.length === 0) {
    try {
      await conn.query(sql);
      console.log(`   + Index ditambah: ${table}.${indexName}`);
    } catch (e) {
      // ignore if already exists
    }
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN MIGRATION
// ─────────────────────────────────────────────────────────────
async function runMigration() {
  let conn;

  try {
    console.log('🔌 Menghubungkan ke database...');
    console.log(`   Host: ${DB_CONFIG.host} | DB: ${DB_CONFIG.database}\n`);

    conn = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Terhubung!\n');

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // ═══════════════════════════════════════════════
    // 1. INSTANSI
    // ═══════════════════════════════════════════════
    console.log('📋 [1/21] instansi');
    await createTableIfNotExists(conn, 'instansi', `
      CREATE TABLE \`instansi\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`kode\` VARCHAR(50) NOT NULL,
        \`nama\` VARCHAR(255) NOT NULL,
        \`alamat\` TEXT DEFAULT NULL,
        \`telepon\` VARCHAR(20) DEFAULT NULL,
        \`email\` VARCHAR(100) DEFAULT NULL,
        \`hari_libur\` VARCHAR(50) DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`kode\` (\`kode\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'instansi', 'hari_libur', "VARCHAR(50) DEFAULT NULL COMMENT 'Comma-separated day numbers'");
    await addColumnIfNotExists(conn, 'instansi', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    // ═══════════════════════════════════════════════
    // 2. ROLES
    // ═══════════════════════════════════════════════
    console.log('📋 [2/21] roles');
    await createTableIfNotExists(conn, 'roles', `
      CREATE TABLE \`roles\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(100) NOT NULL,
        \`description\` TEXT DEFAULT NULL,
        \`is_system\` TINYINT(1) NOT NULL DEFAULT 0,
        \`instansi_id\` INT DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`name\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'roles', 'description', 'TEXT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'roles', 'is_system', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addColumnIfNotExists(conn, 'roles', 'instansi_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'roles', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    await addColumnIfNotExists(conn, 'roles', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    // Seed system roles
    await conn.query(`INSERT IGNORE INTO \`roles\` (\`name\`, \`description\`, \`is_system\`) VALUES
      ('SUPER_ADMIN', 'Super Administrator dengan akses penuh', 1),
      ('ADMIN', 'Administrator instansi', 1)`);

    // ═══════════════════════════════════════════════
    // 3. ROLE_PERMISSIONS
    // ═══════════════════════════════════════════════
    console.log('📋 [3/21] role_permissions');
    await createTableIfNotExists(conn, 'role_permissions', `
      CREATE TABLE \`role_permissions\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`role_id\` INT NOT NULL,
        \`permission_key\` VARCHAR(100) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`role_perm_unique\` (\`role_id\`, \`permission_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // ═══════════════════════════════════════════════
    // 4. ADMIN
    // ═══════════════════════════════════════════════
    console.log('📋 [4/21] admin');
    await createTableIfNotExists(conn, 'admin', `
      CREATE TABLE \`admin\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`username\` VARCHAR(100) NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`nama\` VARCHAR(255) NOT NULL,
        \`role\` VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
        \`role_id\` INT DEFAULT NULL,
        \`instansi_id\` INT DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`username\` (\`username\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'admin', 'role_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'admin', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    // ═══════════════════════════════════════════════
    // 5. APP_USERS
    // ═══════════════════════════════════════════════
    console.log('📋 [5/21] app_users');
    await createTableIfNotExists(conn, 'app_users', `
      CREATE TABLE \`app_users\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`karyawan_id\` INT DEFAULT NULL,
        \`username\` VARCHAR(100) NOT NULL,
        \`password\` VARCHAR(255) NOT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`username\` (\`username\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'app_users', 'karyawan_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'app_users', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    // ═══════════════════════════════════════════════
    // 6. MESIN
    // ═══════════════════════════════════════════════
    console.log('📋 [6/21] mesin');
    await createTableIfNotExists(conn, 'mesin', `
      CREATE TABLE \`mesin\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`sn\` VARCHAR(100) NOT NULL,
        \`nama\` VARCHAR(255) NOT NULL,
        \`ip_address\` VARCHAR(50) DEFAULT NULL,
        \`lokasi\` VARCHAR(255) DEFAULT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
        \`instansi_id\` INT NOT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`sn\` (\`sn\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'mesin', 'instansi_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'mesin', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    // ═══════════════════════════════════════════════
    // 7. DEPARTEMEN
    // ═══════════════════════════════════════════════
    console.log('📋 [7/21] departemen');
    await createTableIfNotExists(conn, 'departemen', `
      CREATE TABLE \`departemen\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`nama\` VARCHAR(255) NOT NULL,
        \`instansi_id\` INT NOT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'departemen', 'instansi_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'departemen', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    // ═══════════════════════════════════════════════
    // 8. SHIFTS
    // ═══════════════════════════════════════════════
    console.log('📋 [8/21] shifts');
    await createTableIfNotExists(conn, 'shifts', `
      CREATE TABLE \`shifts\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`instansi_id\` INT NOT NULL,
        \`nama\` VARCHAR(100) NOT NULL,
        \`jam_masuk\` VARCHAR(8) NOT NULL,
        \`jam_pulang\` VARCHAR(8) NOT NULL,
        \`min_jam_kerja\` DECIMAL(4,2) DEFAULT NULL,
        \`toleransi_keterlambatan\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'shifts', 'instansi_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'shifts', 'min_jam_kerja', 'DECIMAL(4,2) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'shifts', 'toleransi_keterlambatan', 'INT NOT NULL DEFAULT 0');
    await addColumnIfNotExists(conn, 'shifts', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    // ═══════════════════════════════════════════════
    // 9. KARYAWAN
    // ═══════════════════════════════════════════════
    console.log('📋 [9/21] karyawan');
    await createTableIfNotExists(conn, 'karyawan', `
      CREATE TABLE \`karyawan\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`pin\` VARCHAR(50) DEFAULT NULL,
        \`nik\` VARCHAR(50) DEFAULT NULL,
        \`nama\` VARCHAR(255) NOT NULL,
        \`departemen\` VARCHAR(255) DEFAULT NULL,
        \`instansi_id\` INT NOT NULL,
        \`shift_id\` INT DEFAULT NULL,
        \`departemen_id\` INT DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'karyawan', 'shift_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'karyawan', 'departemen_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'karyawan', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    // ═══════════════════════════════════════════════
    // 10. ABSENSI (Raw Machine Logs)
    // ═══════════════════════════════════════════════
    console.log('📋 [10/21] absensi');
    await createTableIfNotExists(conn, 'absensi', `
      CREATE TABLE \`absensi\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`pin\` VARCHAR(50) DEFAULT NULL,
        \`karyawan_id\` INT DEFAULT NULL,
        \`scan_time\` DATETIME NOT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'absensi', 'pin', 'VARCHAR(50) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'absensi', 'karyawan_id', 'INT DEFAULT NULL');

    // ═══════════════════════════════════════════════
    // 11. MOBILE_ABSENSI
    // ═══════════════════════════════════════════════
    console.log('📋 [11/21] mobile_absensi');
    await createTableIfNotExists(conn, 'mobile_absensi', `
      CREATE TABLE \`mobile_absensi\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`user_id\` INT NOT NULL,
        \`tanggal\` VARCHAR(10) NOT NULL,
        \`jam_masuk\` VARCHAR(8) DEFAULT NULL,
        \`jam_pulang\` VARCHAR(8) DEFAULT NULL,
        \`status\` VARCHAR(50) DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'mobile_absensi', 'status', 'VARCHAR(50) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'mobile_absensi', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    await addIndexIfNotExists(conn, 'mobile_absensi', 'user_date_unique',
      'ALTER TABLE `mobile_absensi` ADD UNIQUE KEY `user_date_unique` (`user_id`, `tanggal`)');

    // ═══════════════════════════════════════════════
    // 12. REKAP_ABSENSI
    // ═══════════════════════════════════════════════
    console.log('📋 [12/21] rekap_absensi');
    await createTableIfNotExists(conn, 'rekap_absensi', `
      CREATE TABLE \`rekap_absensi\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`karyawan_id\` INT NOT NULL,
        \`shift_id\` INT NOT NULL,
        \`instansi_id\` INT NOT NULL,
        \`tanggal\` VARCHAR(10) NOT NULL,
        \`jam_masuk\` VARCHAR(8) DEFAULT NULL,
        \`jam_keluar\` VARCHAR(8) DEFAULT NULL,
        \`status_kehadiran\` VARCHAR(50) NOT NULL DEFAULT 'Alpa',
        \`terlambat_menit\` INT NOT NULL DEFAULT 0,
        \`pulang_cepat_menit\` INT NOT NULL DEFAULT 0,
        \`durasi_kerja_menit\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'rekap_absensi', 'shift_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'rekap_absensi', 'instansi_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'rekap_absensi', 'jam_keluar', 'VARCHAR(8) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'rekap_absensi', 'terlambat_menit', 'INT NOT NULL DEFAULT 0');
    await addColumnIfNotExists(conn, 'rekap_absensi', 'pulang_cepat_menit', 'INT NOT NULL DEFAULT 0');
    await addColumnIfNotExists(conn, 'rekap_absensi', 'durasi_kerja_menit', 'INT NOT NULL DEFAULT 0');
    await addColumnIfNotExists(conn, 'rekap_absensi', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    await addIndexIfNotExists(conn, 'rekap_absensi', 'karyawan_tanggal_unique',
      'ALTER TABLE `rekap_absensi` ADD UNIQUE KEY `karyawan_tanggal_unique` (`karyawan_id`, `tanggal`)');

    // ═══════════════════════════════════════════════
    // 13. HOLIDAYS
    // ═══════════════════════════════════════════════
    console.log('📋 [13/21] holidays');
    await createTableIfNotExists(conn, 'holidays', `
      CREATE TABLE \`holidays\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`tanggal\` VARCHAR(10) NOT NULL,
        \`keterangan\` VARCHAR(255) DEFAULT NULL,
        \`instansi_id\` INT DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'holidays', 'tanggal', 'VARCHAR(10) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'holidays', 'keterangan', 'VARCHAR(255) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'holidays', 'instansi_id', 'INT DEFAULT NULL');

    // ═══════════════════════════════════════════════
    // 14. JENIS_CUTI
    // ═══════════════════════════════════════════════
    console.log('📋 [14/21] jenis_cuti');
    await createTableIfNotExists(conn, 'jenis_cuti', `
      CREATE TABLE \`jenis_cuti\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`instansi_id\` INT DEFAULT NULL,
        \`nama\` VARCHAR(100) NOT NULL,
        \`kuota\` INT DEFAULT NULL,
        \`is_paid\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'jenis_cuti', 'instansi_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'jenis_cuti', 'kuota', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'jenis_cuti', 'is_paid', 'TINYINT(1) NOT NULL DEFAULT 1');

    // ═══════════════════════════════════════════════
    // 15. CUTI
    // ═══════════════════════════════════════════════
    console.log('📋 [15/21] cuti');
    await createTableIfNotExists(conn, 'cuti', `
      CREATE TABLE \`cuti\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`karyawan_id\` INT NOT NULL,
        \`jenis_cuti_id\` INT NOT NULL,
        \`start_date\` VARCHAR(10) NOT NULL,
        \`end_date\` VARCHAR(10) NOT NULL,
        \`reason\` TEXT DEFAULT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        \`approved_by\` INT DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'cuti', 'start_date', 'VARCHAR(10) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'cuti', 'end_date', 'VARCHAR(10) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'cuti', 'reason', 'TEXT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'cuti', 'approved_by', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'cuti', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    // ═══════════════════════════════════════════════
    // 16. LEMBUR
    // ═══════════════════════════════════════════════
    console.log('📋 [16/21] lembur');
    await createTableIfNotExists(conn, 'lembur', `
      CREATE TABLE \`lembur\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`karyawan_id\` INT NOT NULL,
        \`tanggal\` VARCHAR(10) NOT NULL,
        \`jam_mulai\` VARCHAR(8) DEFAULT NULL,
        \`jam_selesai\` VARCHAR(8) DEFAULT NULL,
        \`durasi\` INT DEFAULT NULL,
        \`keterangan\` TEXT DEFAULT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // ═══════════════════════════════════════════════
    // 17. KARYAWAN_JADWAL
    // ═══════════════════════════════════════════════
    console.log('📋 [17/21] karyawan_jadwal');
    await createTableIfNotExists(conn, 'karyawan_jadwal', `
      CREATE TABLE \`karyawan_jadwal\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`karyawan_id\` INT NOT NULL,
        \`shift_id\` INT NOT NULL,
        \`tanggal\` VARCHAR(10) NOT NULL,
        \`instansi_id\` INT NOT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'karyawan_jadwal', 'instansi_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'karyawan_jadwal', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    await addIndexIfNotExists(conn, 'karyawan_jadwal', 'karyawan_tanggal_unique',
      'ALTER TABLE `karyawan_jadwal` ADD UNIQUE KEY `karyawan_tanggal_unique` (`karyawan_id`, `tanggal`)');

    // ═══════════════════════════════════════════════
    // 18. EMPLOYEE_SHIFTS
    // ═══════════════════════════════════════════════
    console.log('📋 [18/21] employee_shifts');
    await createTableIfNotExists(conn, 'employee_shifts', `
      CREATE TABLE \`employee_shifts\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`karyawan_id\` INT NOT NULL,
        \`shift_id\` INT NOT NULL,
        \`hari\` INT DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // ═══════════════════════════════════════════════
    // 19. JADWAL_KERJA
    // ═══════════════════════════════════════════════
    console.log('📋 [19/21] jadwal_kerja');
    await createTableIfNotExists(conn, 'jadwal_kerja', `
      CREATE TABLE \`jadwal_kerja\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`nama\` VARCHAR(255) NOT NULL,
        \`instansi_id\` INT DEFAULT NULL,
        \`keterangan\` TEXT DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // ═══════════════════════════════════════════════
    // 20. PENGUMUMAN
    // ═══════════════════════════════════════════════
    console.log('📋 [20/21] pengumuman');
    await createTableIfNotExists(conn, 'pengumuman', `
      CREATE TABLE \`pengumuman\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`instansi_id\` INT DEFAULT NULL,
        \`judul\` VARCHAR(255) NOT NULL,
        \`isi\` TEXT NOT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'pengumuman', 'instansi_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'pengumuman', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    // ═══════════════════════════════════════════════
    // 21. AUDIT_LOGS
    // ═══════════════════════════════════════════════
    console.log('📋 [21/21] audit_logs');
    await createTableIfNotExists(conn, 'audit_logs', `
      CREATE TABLE \`audit_logs\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`admin_id\` INT DEFAULT NULL,
        \`admin_nama\` VARCHAR(255) DEFAULT NULL,
        \`action\` VARCHAR(100) NOT NULL,
        \`detail\` JSON DEFAULT NULL,
        \`ip_address\` VARCHAR(50) DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await addColumnIfNotExists(conn, 'audit_logs', 'admin_id', 'INT DEFAULT NULL');
    await addColumnIfNotExists(conn, 'audit_logs', 'admin_nama', 'VARCHAR(255) DEFAULT NULL');
    await addColumnIfNotExists(conn, 'audit_logs', 'action', "VARCHAR(100) NOT NULL DEFAULT 'UNKNOWN'");
    await addColumnIfNotExists(conn, 'audit_logs', 'ip_address', 'VARCHAR(50) DEFAULT NULL');

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    // ═══════════════════════════════════════════════
    // HASIL AKHIR
    // ═══════════════════════════════════════════════
    console.log('\n' + '═'.repeat(55));
    console.log('📊 Tabel yang ada di database setelah migrasi:');
    const [tables] = await conn.query('SHOW TABLES');
    tables.forEach((t, i) => {
      const name = Object.values(t)[0];
      console.log(`   ${String(i + 1).padStart(2)}. ${name}`);
    });

    console.log('\n🎉 Migrasi database selesai!');
    console.log('   Semua tabel sudah disesuaikan dengan kode backend.');

  } catch (err) {
    console.error('\n❌ FATAL ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (conn) {
      await conn.end();
      console.log('\n🔌 Koneksi ditutup.');
    }
  }
}

runMigration();
