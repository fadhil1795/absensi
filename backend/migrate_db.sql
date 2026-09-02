-- ============================================================
-- MIGRATION SCRIPT - Penyesuaian Struktur Database
-- Database: adms_absensi
-- Dibuat berdasarkan kode backend (mysql2)
-- Jalankan: node migrate_db.js
-- ============================================================

-- Disable FK checks sementara
SET FOREIGN_KEY_CHECKS = 0;

-- ==========================================
-- 1. INSTANSI
-- ==========================================
CREATE TABLE IF NOT EXISTS `instansi` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `kode` VARCHAR(50) NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  `alamat` TEXT DEFAULT NULL,
  `telepon` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `hari_libur` VARCHAR(50) DEFAULT NULL COMMENT 'Comma-separated days, e.g. 0,6',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kode` (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tambah kolom yang mungkin belum ada
ALTER TABLE `instansi` 
  ADD COLUMN IF NOT EXISTS `hari_libur` VARCHAR(50) DEFAULT NULL;

-- ==========================================
-- 2. ROLES
-- ==========================================
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `is_system` TINYINT(1) NOT NULL DEFAULT 0,
  `instansi_id` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `roles`
  ADD COLUMN IF NOT EXISTS `description` TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `is_system` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `instansi_id` INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ==========================================
-- 3. ROLE PERMISSIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `role_id` INT NOT NULL,
  `permission_key` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_perm_unique` (`role_id`, `permission_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 4. ADMIN
-- ==========================================
CREATE TABLE IF NOT EXISTS `admin` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
  `role_id` INT DEFAULT NULL,
  `instansi_id` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `admin`
  ADD COLUMN IF NOT EXISTS `role_id` INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ==========================================
-- 5. APP_USERS (Mobile App Users)
-- ==========================================
CREATE TABLE IF NOT EXISTS `app_users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `karyawan_id` INT DEFAULT NULL,
  `username` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `karyawan_id` (`karyawan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 6. MESIN
-- ==========================================
CREATE TABLE IF NOT EXISTS `mesin` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `sn` VARCHAR(100) NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `lokasi` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
  `instansi_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sn` (`sn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 7. DEPARTEMEN
-- ==========================================
CREATE TABLE IF NOT EXISTS `departemen` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nama` VARCHAR(255) NOT NULL,
  `instansi_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 8. SHIFTS
-- ==========================================
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `instansi_id` INT NOT NULL,
  `nama` VARCHAR(100) NOT NULL,
  `jam_masuk` VARCHAR(8) NOT NULL COMMENT 'HH:MM:SS',
  `jam_pulang` VARCHAR(8) NOT NULL COMMENT 'HH:MM:SS',
  `min_jam_kerja` DECIMAL(4,2) DEFAULT NULL,
  `toleransi_keterlambatan` INT NOT NULL DEFAULT 0 COMMENT 'in minutes',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `shifts`
  ADD COLUMN IF NOT EXISTS `instansi_id` INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `min_jam_kerja` DECIMAL(4,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `toleransi_keterlambatan` INT NOT NULL DEFAULT 0;

-- ==========================================
-- 9. KARYAWAN
-- ==========================================
CREATE TABLE IF NOT EXISTS `karyawan` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pin` VARCHAR(50) DEFAULT NULL,
  `nik` VARCHAR(50) DEFAULT NULL,
  `nama` VARCHAR(255) NOT NULL,
  `departemen` VARCHAR(255) DEFAULT NULL,
  `instansi_id` INT NOT NULL,
  `shift_id` INT DEFAULT NULL,
  `departemen_id` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nik` (`nik`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `karyawan`
  ADD COLUMN IF NOT EXISTS `shift_id` INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `departemen_id` INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ==========================================
-- 10. ABSENSI (Raw Machine Logs)
-- ==========================================
CREATE TABLE IF NOT EXISTS `absensi` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pin` VARCHAR(50) DEFAULT NULL,
  `karyawan_id` INT DEFAULT NULL,
  `scan_time` DATETIME NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_pin_date` (`pin`, `scan_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `absensi`
  ADD COLUMN IF NOT EXISTS `pin` VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `karyawan_id` INT DEFAULT NULL;

-- ==========================================
-- 11. MOBILE ABSENSI
-- ==========================================
CREATE TABLE IF NOT EXISTS `mobile_absensi` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `tanggal` VARCHAR(10) NOT NULL COMMENT 'YYYY-MM-DD',
  `jam_masuk` VARCHAR(8) DEFAULT NULL COMMENT 'HH:MM:SS',
  `jam_pulang` VARCHAR(8) DEFAULT NULL COMMENT 'HH:MM:SS',
  `status` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_date_unique` (`user_id`, `tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 12. REKAP ABSENSI
-- ==========================================
CREATE TABLE IF NOT EXISTS `rekap_absensi` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `karyawan_id` INT NOT NULL,
  `shift_id` INT NOT NULL,
  `instansi_id` INT NOT NULL,
  `tanggal` VARCHAR(10) NOT NULL COMMENT 'YYYY-MM-DD',
  `jam_masuk` VARCHAR(8) DEFAULT NULL COMMENT 'HH:MM:SS',
  `jam_keluar` VARCHAR(8) DEFAULT NULL COMMENT 'HH:MM:SS',
  `status_kehadiran` VARCHAR(50) NOT NULL DEFAULT 'Alpa',
  `terlambat_menit` INT NOT NULL DEFAULT 0,
  `pulang_cepat_menit` INT NOT NULL DEFAULT 0,
  `durasi_kerja_menit` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `karyawan_tanggal_unique` (`karyawan_id`, `tanggal`),
  INDEX `idx_instansi_tanggal` (`instansi_id`, `tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `rekap_absensi`
  ADD COLUMN IF NOT EXISTS `shift_id` INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `instansi_id` INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `jam_keluar` VARCHAR(8) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `terlambat_menit` INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `pulang_cepat_menit` INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `durasi_kerja_menit` INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ==========================================
-- 13. HOLIDAYS
-- ==========================================
CREATE TABLE IF NOT EXISTS `holidays` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tanggal` VARCHAR(10) NOT NULL COMMENT 'YYYY-MM-DD',
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `instansi_id` INT DEFAULT NULL COMMENT 'NULL = global holiday',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `holidays`
  ADD COLUMN IF NOT EXISTS `tanggal` VARCHAR(10) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `keterangan` VARCHAR(255) DEFAULT NULL;

-- ==========================================
-- 14. JENIS CUTI
-- ==========================================
CREATE TABLE IF NOT EXISTS `jenis_cuti` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `instansi_id` INT DEFAULT NULL,
  `nama` VARCHAR(100) NOT NULL,
  `kuota` INT DEFAULT NULL,
  `is_paid` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 15. CUTI (Leave Requests)
-- ==========================================
CREATE TABLE IF NOT EXISTS `cuti` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `karyawan_id` INT NOT NULL,
  `jenis_cuti_id` INT NOT NULL,
  `start_date` VARCHAR(10) NOT NULL COMMENT 'YYYY-MM-DD',
  `end_date` VARCHAR(10) NOT NULL COMMENT 'YYYY-MM-DD',
  `reason` TEXT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING,APPROVED,REJECTED',
  `approved_by` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 16. LEMBUR (Overtime)
-- ==========================================
CREATE TABLE IF NOT EXISTS `lembur` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `karyawan_id` INT NOT NULL,
  `tanggal` VARCHAR(10) NOT NULL COMMENT 'YYYY-MM-DD',
  `jam_mulai` VARCHAR(8) DEFAULT NULL,
  `jam_selesai` VARCHAR(8) DEFAULT NULL,
  `durasi` INT DEFAULT NULL COMMENT 'in minutes',
  `keterangan` TEXT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 17. KARYAWAN JADWAL (Shift Overrides)
-- ==========================================
CREATE TABLE IF NOT EXISTS `karyawan_jadwal` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `karyawan_id` INT NOT NULL,
  `shift_id` INT NOT NULL,
  `tanggal` VARCHAR(10) NOT NULL COMMENT 'YYYY-MM-DD',
  `instansi_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `karyawan_tanggal_unique` (`karyawan_id`, `tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `karyawan_jadwal`
  ADD COLUMN IF NOT EXISTS `instansi_id` INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ==========================================
-- 18. EMPLOYEE SHIFTS (Recurring Assignments)
-- ==========================================
CREATE TABLE IF NOT EXISTS `employee_shifts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `karyawan_id` INT NOT NULL,
  `shift_id` INT NOT NULL,
  `hari` INT DEFAULT NULL COMMENT '0=Sun, 6=Sat',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 19. JADWAL KERJA
-- ==========================================
CREATE TABLE IF NOT EXISTS `jadwal_kerja` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nama` VARCHAR(255) NOT NULL,
  `instansi_id` INT DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 20. PENGUMUMAN (Announcements)
-- ==========================================
CREATE TABLE IF NOT EXISTS `pengumuman` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `instansi_id` INT DEFAULT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `isi` TEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- 21. AUDIT LOGS
-- ==========================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `admin_id` INT DEFAULT NULL,
  `admin_nama` VARCHAR(255) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `detail` JSON DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Re-enable FK checks
SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- SEED: System Roles (jika belum ada)
-- ==========================================
INSERT IGNORE INTO `roles` (`name`, `description`, `is_system`) VALUES
  ('SUPER_ADMIN', 'Super Administrator dengan akses penuh', 1),
  ('ADMIN', 'Administrator instansi', 1);

-- ==========================================
-- SELESAI
-- ==========================================
SELECT 'Migration selesai!' AS status;
