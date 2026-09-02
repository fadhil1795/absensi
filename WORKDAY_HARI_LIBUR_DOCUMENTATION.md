# Dokumentasi: Workday & Hari Libur di Database

## 📋 Ringkasan
Sistem ADMS menggunakan dua konsep berbeda untuk mengelola hari libur:
1. **Hari Kerja (`hari_kerja`)** - Hari-hari dalam seminggu yang merupakan hari kerja reguler
2. **Hari Libur (`hari_libur` di table instansi)** - Hari-hari dalam seminggu yang merupakan hari libur mingguan
3. **Holidays (table `holidays`)** - Tanggal-tanggal khusus yang merupakan hari libur (nasional, perusahaan)

---

## 1. FORMAT DATA

### 1.1 Hari Kerja & Hari Libur (dalam `instansi` table)
**Format**: Comma-separated numbers (0-6)
- `0` = Minggu (Sunday)
- `1` = Senin (Monday)
- `2` = Selasa (Tuesday)
- `3` = Rabu (Wednesday)
- `4` = Kamis (Thursday)
- `5` = Jum'at (Friday)
- `6` = Sabtu (Saturday)

**Contoh hari_kerja**: `"1,2,3,4,5"` = Senin hingga Jumat
**Contoh hari_libur**: `"0,6"` = Minggu dan Sabtu

### 1.2 Holidays (tabel `holidays`)
**Format**: Date string (YYYY-MM-DD)

**Contoh**: `"2024-12-25"` = Hari Natal

---

## 2. SCHEMA DATABASE

### 2.1 Tabel `instansi` (Kolom Terkait)

```sql
CREATE TABLE `instansi` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `kode` VARCHAR(50) NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  `alamat` TEXT DEFAULT NULL,
  `telepon` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  
  -- WORKDAY FIELDS
  `hari_kerja` VARCHAR(20) DEFAULT NULL 
    COMMENT '0=Minggu,1=Senin,...,6=Sabtu. Contoh: 1,2,3,4,5 = Senin-Jumat',
  
  `hari_libur` VARCHAR(50) DEFAULT NULL 
    COMMENT 'Comma-separated day numbers. Contoh: 0,6 = Minggu & Sabtu',
  
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kode` (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.2 Tabel `holidays` (Special Dates)

```sql
CREATE TABLE `holidays` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tanggal` VARCHAR(10) NOT NULL 
    COMMENT 'YYYY-MM-DD format',
  `keterangan` VARCHAR(255) DEFAULT NULL 
    COMMENT 'Deskripsi liburan (e.g., "Lebaran", "Hari Raya")',
  `instansi_id` INT DEFAULT NULL 
    COMMENT 'NULL = global/nasional, specific ID = untuk instansi tertentu',
  `is_national` TINYINT(1) DEFAULT 0,
  `description` VARCHAR(255) DEFAULT NULL,
  `date` VARCHAR(10) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3. QUERY SQL UNTUK UPDATE FIELD

### 3.1 Update Hari Kerja (hari_kerja)

```sql
-- Update hari kerja untuk satu instansi
UPDATE instansi 
SET hari_kerja = '1,2,3,4,5'  -- Senin-Jumat
WHERE id = 1;

-- Update hari kerja ke NULL (reset ke default)
UPDATE instansi 
SET hari_kerja = NULL
WHERE id = 1;

-- Update multiple instansi dengan default value
UPDATE instansi 
SET hari_kerja = '1,2,3,4,5' 
WHERE hari_kerja IS NULL;
```

### 3.2 Update Hari Libur Mingguan (hari_libur di instansi)

```sql
-- Update hari libur mingguan untuk satu instansi
UPDATE instansi 
SET hari_libur = '0,6'  -- Minggu dan Sabtu
WHERE id = 1;

-- Update hari libur untuk multiple instansi
UPDATE instansi 
SET hari_libur = '0,6' 
WHERE id IN (1, 2, 3);

-- Clear hari libur
UPDATE instansi 
SET hari_libur = NULL 
WHERE id = 1;
```

### 3.3 Insert Holiday (Tanggal Khusus)

```sql
-- Insert nasional holiday (berlaku untuk semua instansi)
INSERT INTO holidays (tanggal, keterangan, instansi_id, is_national) 
VALUES ('2024-12-25', 'Hari Raya Natal', NULL, 1);

-- Insert holiday untuk instansi tertentu
INSERT INTO holidays (tanggal, keterangan, instansi_id, is_national) 
VALUES ('2024-06-15', 'Perayaan Perusahaan', 2, 0);

-- Insert multiple holidays
INSERT INTO holidays (tanggal, keterangan, instansi_id, is_national) VALUES
('2024-01-01', 'Tahun Baru', NULL, 1),
('2024-02-14', 'Hari Cinta Kasih', NULL, 0),
('2024-12-25', 'Natal', NULL, 1);
```

### 3.4 Delete Holiday

```sql
-- Delete holiday tertentu
DELETE FROM holidays 
WHERE id = 5;

-- Delete semua holiday untuk instansi tertentu
DELETE FROM holidays 
WHERE instansi_id = 2;

-- Delete holiday berdasarkan tanggal
DELETE FROM holidays 
WHERE tanggal = '2024-12-25';
```

---

## 4. ENDPOINT/ROUTE YANG MENGELOLA

### 4.1 Work Days Management (`/api/work-days`)

**File**: [src/routes/workdayRoutes.ts](src/routes/workdayRoutes.ts)

#### GET - Retrieve Work Days
```typescript
GET /api/work-days

// Super Admin - get all instansi
// Response:
[
  {
    id: 1,
    nama: "PT Maju Jaya",
    hari_kerja: [1, 2, 3, 4, 5]
  },
  ...
]

// Super Admin - get specific instansi
GET /api/work-days?instansi_id=1
// Response:
{
  id: 1,
  nama: "PT Maju Jaya",
  hari_kerja: [1, 2, 3, 4, 5]
}

// Admin/User - get own instansi (automatic)
// Response:
{
  id: 1,
  nama: "PT Maju Jaya",
  hari_kerja: [1, 2, 3, 4, 5]
}
```

#### PUT - Update Work Days
```typescript
PUT /api/work-days
Authorization: Bearer {token}

// Request Body (Super Admin):
{
  "instansi_id": 1,
  "hari_kerja": [1, 2, 3, 4, 5]  // Array of day numbers
}

// Request Body (Admin/User):
{
  "hari_kerja": [1, 2, 3, 4, 5]  // instansi_id automatically from token
}

// Response:
{
  "message": "Work day settings updated",
  "instansi_id": 1,
  "hari_kerja": [1, 2, 3, 4, 5]
}
```

**Requirements**:
- Authentication required ✓
- Validation: Array of integers 0-6 ✓
- Duplicates removed, sorted automatically ✓

---

### 4.2 Instansi Management (`/api/instansi`)

**File**: [src/routes/instansiRoutes.ts](src/routes/instansiRoutes.ts)

#### PUT - Update Instansi (termasuk `hari_libur`)
```typescript
PUT /api/instansi/:id
Authorization: Bearer {token}

// Request Body (dapat berisi hari_libur):
{
  "nama": "PT Maju Jaya",
  "alamat": "Jl. Sudirman No. 1",
  "telepon": "021-1234567",
  "email": "info@maju.com",
  "jam_masuk": "08:00",
  "jam_pulang": "17:00",
  "toleransi_keterlambatan": 15,
  "min_jam_kerja": 8.0,
  "hari_libur": "0,6"  // Minggu dan Sabtu
}

// Response:
{
  "id": 1,
  "nama": "PT Maju Jaya",
  "alamat": "Jl. Sudirman No. 1",
  "telepon": "021-1234567",
  "email": "info@maju.com",
  "jam_masuk": "08:00",
  "jam_pulang": "17:00",
  "toleransi_keterlambatan": 15,
  "min_jam_kerja": 8.0
}
```

**Location in code** (line 89):
```typescript
if (req.body.hari_libur !== undefined) { 
  updates.push('hari_libur = ?'); 
  params.push(req.body.hari_libur); 
}
```

---

### 4.3 Leave/Holidays Management (`/api/leave`)

**File**: [src/routes/leaveRoutes.ts](src/routes/leaveRoutes.ts)

#### GET - Get Holidays
```typescript
GET /api/leave/holidays
Authorization: Bearer {token}

// Super Admin - all holidays
// Super Admin with instansi filter
GET /api/leave/holidays?instansi_id=1

// Admin/User - only their instansi holidays
```

#### POST - Create Holiday
```typescript
POST /api/leave/holidays
Authorization: Bearer {token}

// Request Body (Nasional Holiday - Super Admin only):
{
  "date": "2024-12-25",
  "description": "Hari Raya Natal",
  "is_national": true
}

// Request Body (Instansi Holiday):
{
  "date": "2024-06-15",
  "description": "Perayaan Perusahaan",
  "is_national": false,
  "instansi_id": 2  // Optional for Admin/User (uses their instansi)
}

// Response:
{
  "id": 10,
  "date": "2024-12-25",
  "description": "Hari Raya Natal",
  "is_national": true,
  "instansi_id": null
}
```

#### DELETE - Delete Holiday
```typescript
DELETE /api/leave/holidays/:id
Authorization: Bearer {token}
```

---

## 5. BAGAIMANA DATA DIGUNAKAN

### 5.1 Dalam Rekap Absensi Calculation

**File**: [src/routes/rekapRoutes.ts](src/routes/rekapRoutes.ts)

Data `hari_libur` dan `holidays` digunakan untuk:

```typescript
// 1. Fetch instansi with their weekly off days
const [instansiRes] = await db.query(
  'SELECT id, hari_libur FROM instansi WHERE id = ?', 
  [targetInstansiId]
);

// 2. Fetch holidays (special dates)
const [holidays] = await db.query(
  'SELECT * FROM holidays WHERE tanggal BETWEEN ? AND ? AND (instansi_id IS NULL OR instansi_id = ?)',
  [start_date, end_date, targetInstansiId]
);

// 3. Check if date is weekly off or holiday
const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
const liburDays = (instansi?.hari_libur || '').split(',').map(Number);
const isWeeklyOff = liburDays.includes(dayOfWeek);

const isHoliday = holidays.find(h => {
  const hDate = formatDate(new Date(h.tanggal));
  return hDate === dateStr && (h.instansi_id === null || h.instansi_id === targetInstansiId);
});

// 4. Mark attendance accordingly
if (isWeeklyOff || isHoliday) {
  // Mark as Libur
  await upsertRekap(emp.id, shift.id, targetInstansiId, dateStr, null, null, 'Libur', 0, 0, 0);
} else {
  // Mark as Alpa (jika tidak ada absensi)
  // atau hitung jam kerja
}
```

### 5.2 Dalam Frontend (WorkdaySettings Component)

**File**: [frontend/src/pages/WorkdaySettings.tsx](frontend/src/pages/WorkdaySettings.tsx)

- Menampilkan UI untuk select working days
- Communicate dengan `/api/work-days` endpoint
- Default: Monday-Friday (1-5)

---

## 6. INITIALIZATION & DEFAULT VALUES

### 6.1 Default Values
- **hari_kerja** (default): `"1,2,3,4,5"` (Senin-Jumat)
- **hari_libur** (default): `"0,6"` (Minggu & Sabtu) atau dapat dikonfigurasi
- New instansi biasanya mengikuti default ini

### 6.2 Migration Scripts

**File**: [backend/add_hari_kerja_column.js](backend/add_hari_kerja_column.js)
```javascript
// Adds hari_kerja column with default
ALTER TABLE instansi ADD COLUMN hari_kerja VARCHAR(20) DEFAULT NULL 
COMMENT '0=Minggu,1=Senin,...,6=Sabtu. Contoh: 1,2,3,4,5 = Senin-Jumat'
```

**File**: [backend/update_existing_instansi.js](backend/update_existing_instansi.js)
```javascript
// Update existing rows to default hari_kerja
UPDATE instansi SET hari_kerja = '1,2,3,4,5' WHERE hari_kerja IS NULL
```

---

## 7. PERMISSION & AUTHORIZATION

### 7.1 Hari Kerja (workdayRoutes)
- **GET**: Authenticated users (Super Admin sees all, others see their own)
- **PUT**: 
  - Super Admin: dapat update any instansi (pass `instansi_id`)
  - Admin/User: hanya dapat update instansi mereka sendiri

### 7.2 Holidays (leaveRoutes)
- **GET**: User melihat holidays untuk instansi mereka
- **POST**: Admin/Super Admin only
  - National holiday: Super Admin only
  - Instansi holiday: Admin/Super Admin
- **DELETE**: Admin/Super Admin only

### 7.3 Instansi (instansiRoutes)
- **PUT**: Admin/Super Admin dengan conditional logic berdasarkan role

---

## 8. CONTOH PENGGUNAAN PRAKTIS

### Skenario 1: Set Hari Kerja Senin-Sabtu (dengan Minggu libur)
```bash
curl -X PUT http://localhost:5000/api/work-days \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "instansi_id": 1,
    "hari_kerja": [1, 2, 3, 4, 5, 6]
  }'
```

### Skenario 2: Set Hari Libur Mingguan via Instansi Update
```bash
curl -X PUT http://localhost:5000/api/instansi/1 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "hari_libur": "0,6"
  }'
```

### Skenario 3: Tambah Hari Libur Nasional (Lebaran)
```bash
curl -X POST http://localhost:5000/api/leave/holidays \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-04-10",
    "description": "Hari Raya Idul Fitri",
    "is_national": true
  }'
```

---

## 9. CATATAN PENTING

1. **Hari Kerja vs Hari Libur**: 
   - `hari_kerja` = Hari-hari yang dipilih sebagai hari kerja
   - `hari_libur` = Hari-hari yang merupakan hari libur mingguan
   - Idealnya: `hari_kerja` + `hari_libur` = 7 hari

2. **Validasi Data**:
   - Day numbers harus 0-6
   - Format separator: comma (`,`)
   - No spaces (atau di-trim otomatis)
   - Duplikat dihapus, sorted otomatis

3. **Performance**:
   - Data di-cache dalam memory selama proses rekap
   - Queries untuk hari libur dimulai dari table scan, sebaiknya tambah index jika diperlukan

4. **Timezone**:
   - Semua tanggal dalam format YYYY-MM-DD (no time)
   - Gunakan timezone server untuk konsistensi

---

## 10. FILES REFERENSI

| File | Fungsi |
|------|--------|
| [src/routes/workdayRoutes.ts](src/routes/workdayRoutes.ts) | Mengelola hari kerja mingguan |
| [src/routes/instansiRoutes.ts](src/routes/instansiRoutes.ts) | Update instansi (termasuk hari_libur) |
| [src/routes/leaveRoutes.ts](src/routes/leaveRoutes.ts) | Mengelola hari libur khusus (holidays) |
| [src/routes/rekapRoutes.ts](src/routes/rekapRoutes.ts) | Menggunakan hari_kerja & holidays untuk rekap |
| [prisma/schema.prisma](prisma/schema.prisma) | Prisma schema (jika menggunakan ORM) |
| [migrate_db.js](migrate_db.js) | Database migration script |
| [migrate_db.sql](migrate_db.sql) | SQL version of migration |
| [frontend/src/pages/WorkdaySettings.tsx](frontend/src/pages/WorkdaySettings.tsx) | Frontend UI untuk setting hari kerja |

---

*Dokumentasi dibuat berdasarkan analisis codebase ADMS Absensi - Backend & Frontend*
