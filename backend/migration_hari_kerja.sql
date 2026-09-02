-- ================================================
-- MIGRATION: Tambah kolom hari_kerja ke tabel instansi
-- Jalankan di MySQL database: adms_absensi
-- ================================================

-- Cek terlebih dahulu apakah kolom sudah ada, jika tidak tambahkan
ALTER TABLE instansi 
ADD COLUMN IF NOT EXISTS hari_kerja VARCHAR(20) DEFAULT NULL 
COMMENT '0=Minggu,1=Senin,2=Selasa,3=Rabu,4=Kamis,5=Jumat,6=Sabtu. Contoh: 1,2,3,4,5 = Senin-Jumat';

-- Jika MySQL versi lama (< 8.0) yang tidak support IF NOT EXISTS, gunakan ini:
-- ALTER TABLE instansi ADD COLUMN hari_kerja VARCHAR(20) DEFAULT NULL;

-- Set default Senin-Jumat untuk semua instansi yang belum punya setting
UPDATE instansi SET hari_kerja = '1,2,3,4,5' WHERE hari_kerja IS NULL;

-- Verifikasi
SELECT id, nama, hari_kerja FROM instansi;
