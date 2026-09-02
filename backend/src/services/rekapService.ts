import db from '../db';
import { RowDataPacket } from 'mysql2';

// Helper: Format Date to YYYY-MM-DD
const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// Helper: Upsert Rekap
async function upsertRekapHelper(
    karyawanId: number, shiftId: number | null, instansiId: number, tanggal: string,
    jamMasuk: string | null, jamPulang: string | null, status: string,
    terlambat: number, pulangCepat: number, durasi: number
) {
    const sql = `
        INSERT INTO rekap_absensi 
        (karyawan_id, shift_id, instansi_id, tanggal, jam_masuk, jam_keluar, status_kehadiran, terlambat_menit, pulang_cepat_menit, durasi_kerja_menit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            shift_id = VALUES(shift_id),
            jam_masuk = VALUES(jam_masuk),
            jam_keluar = VALUES(jam_keluar),
            status_kehadiran = VALUES(status_kehadiran),
            terlambat_menit = VALUES(terlambat_menit),
            pulang_cepat_menit = VALUES(pulang_cepat_menit),
            durasi_kerja_menit = VALUES(durasi_kerja_menit),
            updated_at = NOW()
    `;
    await db.query(sql, [karyawanId, shiftId, instansiId, tanggal, jamMasuk, jamPulang, status, terlambat, pulangCepat, durasi]);
}

export const rekapService = {
    /**
     * Sync Realtime Rekap (Insert or Update)
     */
    async syncRekapRealtime(instansiId: number, pin: string, scanTime: string) {
        // Parse scanTime manually to ensure consistency (Assume format YYYY-MM-DD HH:MM:SS or ISO)
        const d = new Date(scanTime);
        // Use local components to avoid UTC shift if server is local
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        const dateStr = `${year}-${month}-${day}`;
        const timeStr = `${hours}:${minutes}:${seconds}`;

        // 1. Get Karyawan & Shift Info (Checking override in karyawan_jadwal first)
        const [karyawan] = await db.query<RowDataPacket[]>(`
            SELECT 
                k.id, 
                COALESCE(kj.shift_id, k.shift_id) AS shift_id, 
                COALESCE(sj.jam_masuk, s.jam_masuk) AS jam_masuk, 
                COALESCE(sj.jam_pulang, s.jam_pulang) AS jam_pulang, 
                COALESCE(sj.toleransi_keterlambatan, s.toleransi_keterlambatan) AS toleransi_keterlambatan
            FROM karyawan k
            LEFT JOIN shifts s ON k.shift_id = s.id
            LEFT JOIN karyawan_jadwal kj ON kj.karyawan_id = k.id AND kj.tanggal = ?
            LEFT JOIN shifts sj ON kj.shift_id = sj.id
            WHERE k.pin = ? AND k.instansi_id = ?
        `, [dateStr, pin, instansiId]);

        if (karyawan.length === 0) {
            console.warn(`[Rekap] Karyawan PIN ${pin} not found in Instansi ${instansiId}`);
            return;
        }

        const emp = karyawan[0];

        // 2. Check Existing Rekap
        const [existing] = await db.query<RowDataPacket[]>(`
            SELECT id, jam_masuk, jam_keluar FROM rekap_absensi 
            WHERE karyawan_id = ? AND tanggal = ?
        `, [emp.id, dateStr]);

        // Check holiday/weekend status
        let isWeeklyOff = false;
        let isHoliday = false;
        try {
            const [holiday] = await db.query<RowDataPacket[]>(
                'SELECT id FROM holidays WHERE tanggal = ? AND (instansi_id IS NULL OR instansi_id = ?)',
                [dateStr, instansiId]
            );
            const [instansiRes] = await db.query<RowDataPacket[]>('SELECT hari_kerja FROM instansi WHERE id = ?', [instansiId]);
            const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
            const hariKerja = (instansiRes[0]?.hari_kerja || '1,2,3,4,5').split(',').map(Number);
            isWeeklyOff = !hariKerja.includes(dayOfWeek);
            isHoliday = holiday.length > 0;
        } catch (e) {
            console.error('[Rekap] Error checking weekend/holiday:', e);
        }

        try {
            if (existing.length === 0) {
                // --- FIRST SCAN: Definitely Masuk ---
                let terlambat = 0;
                let status = 'Hadir';

                if (isWeeklyOff || isHoliday) {
                    status = 'Lembur';
                } else if (emp.jam_masuk) {
                    const scanDate = new Date(`${dateStr}T${timeStr}`);
                    const shiftDate = new Date(`${dateStr}T${emp.jam_masuk}`);
                    const diffMins = Math.floor((scanDate.getTime() - shiftDate.getTime()) / 60000);
                    if (diffMins > (emp.toleransi_keterlambatan || 0)) terlambat = diffMins;
                }

                await db.query(`
                    INSERT INTO rekap_absensi 
                    (karyawan_id, shift_id, instansi_id, tanggal, jam_masuk, status_kehadiran, terlambat_menit, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `, [emp.id, emp.shift_id || null, instansiId, dateStr, timeStr, status, terlambat]);

                console.log(`[Rekap] Inserted Check-In (First Scan) for ID ${emp.id} at ${timeStr}`);

            } else {
                // --- SUBSEQUENT SCAN: Min/Max Logic ---
                const record = existing[0];
                let newMasuk = record.jam_masuk;
                let newKeluar = record.jam_keluar;
                let changed = false;

                // Compare for Earliest (Masuk)
                if (timeStr < newMasuk) {
                    newMasuk = timeStr;
                    changed = true;
                    console.log(`[Rekap] Found earlier scan. Updating Masuk to ${newMasuk}`);
                }

                // Compare for Latest (Keluar)
                // Logic: If scan > newMasuk, it's a potential Out.
                // We always take the LATEST scan as Out.
                if (timeStr > newMasuk) {
                    if (!newKeluar || timeStr > newKeluar) {
                        newKeluar = timeStr;
                        changed = true;
                        console.log(`[Rekap] Found later scan. Updating Keluar to ${newKeluar}`);
                    }
                }

                if (changed) {
                    // Recalculate Metrics
                    let terlambat = 0;
                    let pulangCepat = 0;
                    let durasi = 0;

                    // Terlambat
                    if (emp.jam_masuk && !isWeeklyOff && !isHoliday) {
                        const scanDate = new Date(`${dateStr}T${newMasuk}`);
                        const shiftDate = new Date(`${dateStr}T${emp.jam_masuk}`);
                        const diffMins = Math.floor((scanDate.getTime() - shiftDate.getTime()) / 60000);
                        if (diffMins > (emp.toleransi_keterlambatan || 0)) terlambat = diffMins;
                    }

                    // Pulang Cepat & Durasi
                    if (newKeluar) {
                        const masukDate = new Date(`${dateStr}T${newMasuk}`);
                        const keluarDate = new Date(`${dateStr}T${newKeluar}`);
                        durasi = Math.floor((keluarDate.getTime() - masukDate.getTime()) / 60000);

                        if (emp.jam_pulang && !isWeeklyOff && !isHoliday) {
                            const shiftKeluarDate = new Date(`${dateStr}T${emp.jam_pulang}`);
                            const diffMins = Math.floor((shiftKeluarDate.getTime() - keluarDate.getTime()) / 60000);
                            if (diffMins > 0) pulangCepat = diffMins;
                        }
                    }

                    let status = (isWeeklyOff || isHoliday) ? 'Lembur' : 'Hadir';

                    await db.query(`
                        UPDATE rekap_absensi 
                        SET jam_masuk = ?, 
                            jam_keluar = ?, 
                            status_kehadiran = ?,
                            terlambat_menit = ?, 
                            pulang_cepat_menit = ?, 
                            durasi_kerja_menit = ?,
                            updated_at = NOW()
                        WHERE id = ?
                    `, [newMasuk, newKeluar, status, terlambat, pulangCepat, durasi, record.id]);
                }
            }
        } catch (error: any) {
            console.error('[Rekap] Sync Error:', error);
            throw error;
        }
    },

    /**
     * Manual Update (CRUD)
     */
    async updateManualRekap(
        rekapId: number,
        data: { jam_masuk?: string, jam_keluar?: string, status_kehadiran?: string }
    ) {
        // 1. Get Existing Data
        const [rows] = await db.query<RowDataPacket[]>(`
            SELECT r.*, s.jam_masuk as shift_masuk, s.jam_pulang as shift_pulang, s.toleransi_keterlambatan
            FROM rekap_absensi r
            LEFT JOIN shifts s ON r.shift_id = s.id
            WHERE r.id = ?
        `, [rekapId]);

        if (rows.length === 0) throw new Error('Rekap data not found');
        const current = rows[0];

        // 2. Merge Data
        const jamMasukVal = data.jam_masuk !== undefined ? data.jam_masuk : current.jam_masuk;
        const jamKeluarVal = data.jam_keluar !== undefined ? data.jam_keluar : current.jam_keluar;
        const statusVal = data.status_kehadiran || current.status_kehadiran;

        // 3. Recalculate Metrics
        let terlambat = 0;
        let pulangCepat = 0;
        let durasi = 0;
        const dateBase = typeof current.tanggal === 'string' 
            ? current.tanggal 
            : formatDate(new Date(current.tanggal));

        // Calc Terlambat
        if (jamMasukVal && current.shift_masuk) {
            const scanDate = new Date(`${dateBase}T${jamMasukVal}`);
            const shiftDate = new Date(`${dateBase}T${current.shift_masuk}`);
            const diffMins = Math.floor((scanDate.getTime() - shiftDate.getTime()) / 60000);
            const tolerance = current.toleransi_keterlambatan || 0;
            if (diffMins > tolerance) terlambat = diffMins;
        }

        // Calc Durasi & Pulang Cepat
        if (jamMasukVal && jamKeluarVal) {
            const masukDate = new Date(`${dateBase}T${jamMasukVal}`);
            const keluarDate = new Date(`${dateBase}T${jamKeluarVal}`);
            durasi = Math.floor((keluarDate.getTime() - masukDate.getTime()) / 60000);

            if (current.shift_pulang) {
                const shiftKeluarDate = new Date(`${dateBase}T${current.shift_pulang}`);
                const diffMins = Math.floor((shiftKeluarDate.getTime() - keluarDate.getTime()) / 60000);
                if (diffMins > 0) pulangCepat = diffMins;
            }
        }

        // 4. Update DB
        await db.query(`
            UPDATE rekap_absensi 
            SET jam_masuk = ?, 
                jam_keluar = ?, 
                status_kehadiran = ?, 
                terlambat_menit = ?, 
                pulang_cepat_menit = ?, 
                durasi_kerja_menit = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [jamMasukVal, jamKeluarVal, statusVal, terlambat, pulangCepat, durasi, rekapId]);

        return { message: 'Updated successfully' };
    },

    /**
     * Generate 'Alpha' (Absent) for employees who have no record for specific date
     */
    async generateAlpha(instansiId: number, dateStr: string) {
        // 1. Get all employees in this instansi with their shift for the day
        const [karyawan] = await db.query<RowDataPacket[]>(`
            SELECT k.id, COALESCE(kj.shift_id, k.shift_id) AS shift_id 
            FROM karyawan k
            LEFT JOIN karyawan_jadwal kj ON kj.karyawan_id = k.id AND kj.tanggal = ?
            WHERE k.instansi_id = ?
        `, [dateStr, instansiId]);

        if (karyawan.length === 0) return { message: 'No employees found' };

        let count = 0;
        for (const emp of karyawan) {
            // Check if record exists
            const [existing] = await db.query<RowDataPacket[]>('SELECT id FROM rekap_absensi WHERE karyawan_id = ? AND tanggal = ?', [emp.id, dateStr]);

            if (existing.length === 0) {
                // Check for Approved Leave
                const [leave] = await db.query<RowDataPacket[]>(`
                    SELECT jc.nama 
                    FROM cuti c
                    JOIN jenis_cuti jc ON c.jenis_cuti_id = jc.id
                    WHERE c.karyawan_id = ? 
                    AND ? BETWEEN c.start_date AND c.end_date 
                    AND c.status = 'APPROVED'
                    LIMIT 1
                `, [emp.id, dateStr]);

                const status = leave.length > 0 ? leave[0].nama : 'Alpa';

                // INSERT Record (Alpha or Leave Type)
                await db.query(`
                    INSERT INTO rekap_absensi 
                    (karyawan_id, shift_id, instansi_id, tanggal, status_kehadiran, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                `, [emp.id, emp.shift_id, instansiId, dateStr, status]);
                count++;
            }
        }
        return { message: `Generated ${count} records (Alpa/Cuti) for ${dateStr}` };
    },

    /**
     * Process Rekap range for a specific instansi (used by batch and automatic scheduler)
     */
    async processRekapRange(targetInstansiId: number, start_date: string, end_date: string) {
        // A. Get Employees with Mobile User ID
        const [karyawanList] = await db.query<RowDataPacket[]>(
            `SELECT k.id, k.nama, k.pin, k.shift_id, au.id as mobile_user_id 
             FROM karyawan k 
             LEFT JOIN app_users au ON k.id = au.karyawan_id 
             WHERE k.instansi_id = ?`,
            [targetInstansiId]
        );

        // B. Get Shifts
        const [shifts] = await db.query<RowDataPacket[]>('SELECT * FROM shifts WHERE instansi_id = ?', [targetInstansiId]);
        const shiftMap = new Map();
        shifts.forEach((s: any) => shiftMap.set(s.id, s));

        // C. Get Instansi Info (For Working Days)
        const [instansiRes] = await db.query<RowDataPacket[]>('SELECT id, hari_kerja FROM instansi WHERE id = ?', [targetInstansiId]);
        const instansiMap = new Map();
        instansiRes.forEach((i: any) => instansiMap.set(i.id, i));

        // D. Get Holidays in Range
        const [holidays] = await db.query<RowDataPacket[]>(
            'SELECT * FROM holidays WHERE tanggal BETWEEN ? AND ? AND (instansi_id IS NULL OR instansi_id = ?)',
            [start_date, end_date, targetInstansiId]
        );

        // D2. Get Shift Overrides in Range
        const [overrides] = await db.query<RowDataPacket[]>(
            'SELECT * FROM karyawan_jadwal WHERE tanggal BETWEEN ? AND ?',
            [start_date, end_date]
        );
        const overrideMap = new Map();
        overrides.forEach(o => {
            const dateStr = formatDate(new Date(o.tanggal));
            overrideMap.set(`${o.karyawan_id}_${dateStr}`, o.shift_id);
        });

        // D3. Get Approved Leaves in Range
        const [allLeaves] = await db.query<RowDataPacket[]>(
            `SELECT c.*, jc.nama as jenis_cuti 
             FROM cuti c 
             JOIN jenis_cuti jc ON c.jenis_cuti_id = jc.id 
             WHERE c.status = 'APPROVED' 
             AND (c.start_date <= ? AND c.end_date >= ?)`,
            [end_date, start_date]
        );

        const start = new Date(start_date);
        const end = new Date(end_date);
        let processedCount = 0;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = formatDate(d);

            for (const emp of karyawanList) {
                // 1. Determine Shift (Check override first)
                const overrideShiftId = overrideMap.get(`${emp.id}_${dateStr}`);
                const activeShiftId = overrideShiftId || emp.shift_id;
                const shift = shiftMap.get(activeShiftId);
                
                if (!shift) {
                    continue;
                }

                // 2. Check for Leaves
                const leave = allLeaves.find(l => {
                    const sDate = formatDate(new Date(l.start_date));
                    const eDate = formatDate(new Date(l.end_date));
                    return l.karyawan_id === emp.id && dateStr >= sDate && dateStr <= eDate;
                });

                // 3. Fetch Logs
                const [logs] = await db.query<RowDataPacket[]>(
                    `SELECT scan_time FROM absensi 
                     WHERE pin = ? 
                     AND instansi_id = ?
                     AND DATE(scan_time) = ? 
                     ORDER BY scan_time ASC`,
                    [emp.pin, targetInstansiId, dateStr]
                );

                let mobileData: any = null;
                if (emp.mobile_user_id) {
                    const [mobRes] = await db.query<RowDataPacket[]>(
                        `SELECT jam_masuk, jam_pulang, status FROM mobile_absensi WHERE user_id = ? AND tanggal = ?`,
                        [emp.mobile_user_id, dateStr]
                    );
                    if (mobRes.length > 0) mobileData = mobRes[0];
                }

                // 4. Check Holidays / Weekends
                const instansi = instansiMap.get(targetInstansiId);
                const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
                const hariKerja = (instansi?.hari_kerja || '1,2,3,4,5').split(',').map(Number);
                const isWeeklyOff = !hariKerja.includes(dayOfWeek);

                const isHoliday = holidays.find(h => {
                    const hDate = formatDate(new Date(h.tanggal));
                    return hDate === dateStr && (h.instansi_id === null || h.instansi_id === targetInstansiId);
                });

                const hasMachineLogs = logs.length > 0;
                const hasMobileLogs = mobileData != null;

                if (!hasMachineLogs && !hasMobileLogs) {
                    if (leave) {
                        await upsertRekapHelper(emp.id, shift.id, targetInstansiId, dateStr, null, null, leave.jenis_cuti, 0, 0, 0);
                    } else if (isWeeklyOff || isHoliday) {
                        await upsertRekapHelper(emp.id, shift.id, targetInstansiId, dateStr, null, null, 'Libur', 0, 0, 0);
                    } else {
                        await upsertRekapHelper(emp.id, shift.id, targetInstansiId, dateStr, null, null, 'Alpa', 0, 0, 0);
                    }
                    processedCount++;
                    continue;
                }

                const shiftMasukTime = new Date(`${dateStr}T${shift.jam_masuk}`);
                const shiftPulangTime = new Date(`${dateStr}T${shift.jam_pulang}`);

                const masukWindowStart = new Date(shiftMasukTime); masukWindowStart.setHours(masukWindowStart.getHours() - 3);
                const masukWindowEnd = new Date(shiftMasukTime); masukWindowEnd.setHours(masukWindowEnd.getHours() + 4);

                const pulangWindowStart = new Date(shiftPulangTime); pulangWindowStart.setHours(pulangWindowStart.getHours() - 2);
                const pulangWindowEnd = new Date(shiftPulangTime); pulangWindowEnd.setHours(pulangWindowEnd.getHours() + 5);

                let actualMasuk: Date | null = null;
                let actualPulang: Date | null = null;

                for (const log of logs) {
                    const t = new Date(log.scan_time);
                    if (t >= masukWindowStart && t <= masukWindowEnd) {
                        actualMasuk = t;
                        break;
                    }
                }

                if (actualMasuk) {
                    for (let i = logs.length - 1; i >= 0; i--) {
                        const t = new Date(logs[i].scan_time);
                        if (t.getTime() > actualMasuk.getTime() + (5 * 60 * 1000)) {
                            actualPulang = t;
                            break;
                        }
                    }
                } else {
                    for (let i = logs.length - 1; i >= 0; i--) {
                        const t = new Date(logs[i].scan_time);
                        if (t >= pulangWindowStart && t <= pulangWindowEnd) {
                            actualPulang = t;
                            break;
                        }
                    }
                }

                if (mobileData) {
                    if (mobileData.jam_masuk) {
                        const mMasuk = new Date(`${dateStr}T${mobileData.jam_masuk}`);
                        if (!actualMasuk || mMasuk < actualMasuk) {
                            actualMasuk = mMasuk;
                        }
                    }
                    if (mobileData.jam_pulang) {
                        const mPulang = new Date(`${dateStr}T${mobileData.jam_pulang}`);
                        if (!actualPulang || mPulang > actualPulang) {
                            actualPulang = mPulang;
                        }
                    }
                }

                let status = 'Alpa';
                let terlambat = 0;
                let pulangCepat = 0;
                let durasi = 0;

                if (actualMasuk || actualPulang) {
                    status = (isWeeklyOff || isHoliday) ? 'Lembur' : 'Hadir';
                }

                if (actualMasuk && actualPulang) {
                    durasi = Math.floor((actualPulang.getTime() - actualMasuk.getTime()) / (1000 * 60));
                }

                if (actualMasuk && !isWeeklyOff && !isHoliday) {
                    const diffMs = actualMasuk.getTime() - shiftMasukTime.getTime();
                    const diffMins = Math.floor(diffMs / (1000 * 60));
                    if (diffMins > shift.toleransi_keterlambatan) {
                        terlambat = diffMins;
                        if (targetInstansiId !== 5) {
                            status = 'Terlambat';
                        }
                    }
                }

                if (actualPulang && !isWeeklyOff && !isHoliday) {
                    const diffMs = shiftPulangTime.getTime() - actualPulang.getTime();
                    const diffMins = Math.floor(diffMs / (1000 * 60));
                    if (diffMins > 0) {
                        pulangCepat = diffMins;
                    }
                }

                await upsertRekapHelper(
                    emp.id,
                    shift.id,
                    targetInstansiId,
                    dateStr,
                    actualMasuk ? actualMasuk.toTimeString().split(' ')[0] : null,
                    actualPulang ? actualPulang.toTimeString().split(' ')[0] : null,
                    status,
                    terlambat,
                    pulangCepat,
                    durasi
                );
                processedCount++;
            }
        }
        return processedCount;
    }
};
