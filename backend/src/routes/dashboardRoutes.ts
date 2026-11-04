import { Router } from 'express';
import db from '../db';
import { authenticate } from '../middleware/authMiddleware';
import { RowDataPacket } from 'mysql2';

const router = Router();

// Get Dashboard Stats
// Get Dashboard Stats
router.get('/stats', authenticate, async (req: any, res) => {
    try {
        let instansiId = req.user.instansi_id;

        // SUPER_ADMIN default: View ALL (instansiId = null), unless specific filter requested
        if (req.user.role === 'SUPER_ADMIN') {
            instansiId = req.query.instansi_id || null;
        }

        const statsQuery = instansiId ? ' WHERE instansi_id = ?' : '';
        const params = instansiId ? [instansiId] : [];

        // 1. Total Karyawan
        const [karyawanRes] = await db.query<RowDataPacket[]>(
            `SELECT COUNT(*) as count FROM karyawan ${statsQuery}`,
            params
        );
        const totalKaryawan = karyawanRes[0].count;

        // 2. Active Shifts
        // Find shifts where NOW() is between jam_masuk and jam_pulang (simplified)
        // Note: This logic assumes simple day shifts. Overnight shifts might need more complex logic (start > end).
        const currentTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
        let shiftQuery = `SELECT DISTINCT nama FROM shifts WHERE ? BETWEEN jam_masuk AND jam_pulang`;
        const shiftParams: any[] = [currentTime];
        if (instansiId) {
            shiftQuery += ' AND instansi_id = ?';
            shiftParams.push(instansiId);
        }

        const [activeShiftsRes] = await db.query<RowDataPacket[]>(shiftQuery, shiftParams);
        const activeShifts = activeShiftsRes.map((s: any) => s.nama);

        // 3. Today's Attendance (Using rekap_absensi for accurate status)
        const todayStr = new Date().toISOString().split('T')[0];
        let attendanceQuery = `
            SELECT
                COUNT(*) as total_present,
                SUM(CASE WHEN status_kehadiran = 'Terlambat' THEN 1 ELSE 0 END) as total_late,
                SUM(CASE WHEN status_kehadiran = 'Hadir' THEN 1 ELSE 0 END) as total_on_time,
                SUM(CASE WHEN jam_keluar IS NOT NULL THEN 1 ELSE 0 END) as total_pulang
            FROM rekap_absensi
            WHERE tanggal = ? AND (status_kehadiran = 'Hadir' OR status_kehadiran = 'Terlambat' OR status_kehadiran = 'Pulang Cepat' OR status_kehadiran = 'Belum Pulang')
        `;
        const attParams: any[] = [todayStr];

        if (instansiId) {
            attendanceQuery += ' AND instansi_id = ?';
            attParams.push(instansiId);
        }

        const [attRes] = await db.query<RowDataPacket[]>(attendanceQuery, attParams);
        const totalHadir = attRes[0].total_present || 0;
        const totalTerlambat = attRes[0].total_late || 0;
        const totalOnTime = attRes[0].total_on_time || 0;
        const totalPulang = attRes[0].total_pulang || 0;
        const totalBelumAbsen = Math.max(0, totalKaryawan - totalHadir); // Basic calc

        // 4. Mesin Info (Keep for verification, though UI might replace it)
        const [mesinRes] = await db.query<RowDataPacket[]>(
            `SELECT COUNT(*) as count, SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) as online_count FROM mesin ${statsQuery}`,
            params
        );

        // 5. Recent Logs (Last 5)
        let logsQuery = `
            SELECT 
                r.jam_masuk as scan_time, 
                r.status_kehadiran as status, 
                k.nama as karyawan_nama, 
                d.nama as departemen 
            FROM rekap_absensi r
            JOIN karyawan k ON r.karyawan_id = k.id
            LEFT JOIN departemen d ON k.departemen_id = d.id
            WHERE r.tanggal = ?
        `;
        if (instansiId) logsQuery += ' AND r.instansi_id = ?';
        logsQuery += ' ORDER BY r.updated_at DESC LIMIT 5';

        const [logsRes] = await db.query<RowDataPacket[]>(logsQuery, attParams);

        // 6. Weekly History (Last 7 Days)
        // 6. Weekly History (Last 7 Days)
        let weeklyQuery = `
            SELECT DATE_FORMAT(tanggal, '%a') as day_name, COUNT(*) as count
            FROM rekap_absensi
            WHERE tanggal >= DATE_SUB(?, INTERVAL 7 DAY)
        `;
        if (instansiId) weeklyQuery += ' AND instansi_id = ?';
        weeklyQuery += ' GROUP BY day_name ORDER BY MIN(tanggal) ASC';

        const [weeklyRes] = await db.query<RowDataPacket[]>(weeklyQuery, attParams);

        // Fill missing days with 0 if needed (frontend can handle or we map here)
        const weeklyData = weeklyRes.map((r: any) => ({ name: r.day_name, value: r.count }));

        // 7. Monthly History (Current Year)
        let monthlyQuery = `
            SELECT DATE_FORMAT(tanggal, '%b') as month_name, COUNT(*) as count
            FROM rekap_absensi
            WHERE YEAR(tanggal) = YEAR(?)
        `;
        if (instansiId) monthlyQuery += ' AND instansi_id = ?';
        monthlyQuery += ' GROUP BY month_name ORDER BY MIN(tanggal) ASC';

        const [monthlyRes] = await db.query<RowDataPacket[]>(monthlyQuery, attParams);
        const monthlyData = monthlyRes.map((r: any) => ({ name: r.month_name, value: r.count }));

        // 8. Attendance Distribution (Detailed status)
        const distributionData = [
            { name: 'Hadir', value: totalOnTime, color: '#10b981' },
            { name: 'Telat', value: totalTerlambat, color: '#f59e0b' },
            { name: 'Belum Absen', value: totalBelumAbsen, color: '#ef4444' }
        ];

        // 9. Department Discipline & Attendance Rate (30 days)
        let deptQuery = `
            SELECT 
                d.id,
                d.nama as departemen_nama,
                COUNT(DISTINCT k.id) as total_karyawan,
                SUM(CASE WHEN r.status_kehadiran = 'Hadir' THEN 1 ELSE 0 END) as total_hadir,
                SUM(CASE WHEN r.status_kehadiran = 'Terlambat' THEN 1 ELSE 0 END) as total_terlambat,
                SUM(CASE WHEN r.status_kehadiran = 'Alpa' THEN 1 ELSE 0 END) as total_alpa,
                COALESCE(
                    ROUND(
                        SUM(CASE WHEN r.status_kehadiran = 'Hadir' THEN 1 ELSE 0 END) * 100.0 / 
                        NULLIF(SUM(CASE WHEN r.status_kehadiran IN ('Hadir', 'Terlambat', 'Alpa', 'Pulang Cepat') THEN 1 ELSE 0 END), 0),
                        1
                    ),
                    0
                ) as persentase_tepat_waktu
            FROM departemen d
            JOIN karyawan k ON k.departemen_id = d.id
            LEFT JOIN rekap_absensi r ON r.karyawan_id = k.id AND r.tanggal >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `;
        const deptParams: any[] = [];
        if (instansiId) {
            deptQuery += ' WHERE k.instansi_id = ?';
            deptParams.push(instansiId);
        }
        deptQuery += ' GROUP BY d.id, d.nama ORDER BY persentase_tepat_waktu DESC, total_hadir DESC LIMIT 6';
        const [deptRes] = await db.query<RowDataPacket[]>(deptQuery, deptParams);

        // 10. Top 5 Karyawan Paling Sering Terlambat (60 Hari Terakhir / Terkini)
        let lateQuery = `
            SELECT 
                k.id,
                k.nama as karyawan_nama,
                k.nik as karyawan_nik,
                d.nama as departemen_nama,
                COUNT(r.id) as total_terlambat,
                COALESCE(SUM(r.terlambat_menit), 0) as total_menit_terlambat
            FROM rekap_absensi r
            JOIN karyawan k ON r.karyawan_id = k.id
            LEFT JOIN departemen d ON k.departemen_id = d.id
            WHERE r.status_kehadiran = 'Terlambat' 
              AND r.tanggal >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
        `;
        const lateParams: any[] = [];
        if (instansiId) {
            lateQuery += ' AND (r.instansi_id = ? OR k.instansi_id = ?)';
            lateParams.push(instansiId, instansiId);
        }
        lateQuery += ' GROUP BY k.id, k.nama, k.nik, d.nama ORDER BY total_terlambat DESC, total_menit_terlambat DESC LIMIT 5';
        const [lateRes] = await db.query<RowDataPacket[]>(lateQuery, lateParams);

        // 11. Multi-status 7-day trend
        let breakdownQuery = `
            SELECT 
                DATE_FORMAT(tanggal, '%d/%m') as date_label,
                DATE_FORMAT(tanggal, '%a') as day_name,
                SUM(CASE WHEN status_kehadiran = 'Hadir' THEN 1 ELSE 0 END) as hadir,
                SUM(CASE WHEN status_kehadiran = 'Terlambat' THEN 1 ELSE 0 END) as terlambat,
                SUM(CASE WHEN status_kehadiran = 'Alpa' THEN 1 ELSE 0 END) as alpa,
                SUM(CASE WHEN status_kehadiran IN ('Izin', 'Sakit', 'Cuti') THEN 1 ELSE 0 END) as izin
            FROM rekap_absensi
            WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        `;
        const breakdownParams: any[] = [];
        if (instansiId) {
            breakdownQuery += ' AND instansi_id = ?';
            breakdownParams.push(instansiId);
        }
        breakdownQuery += ' GROUP BY tanggal, date_label, day_name ORDER BY tanggal ASC';
        const [breakdownRes] = await db.query<RowDataPacket[]>(breakdownQuery, breakdownParams);

        res.json({
            total_karyawan: totalKaryawan,
            total_instansi: instansiId ? 1 : 24,
            active_shifts: activeShifts,
            hadir_hari_ini: totalHadir,
            belum_absen: totalBelumAbsen,
            total_pulang: totalPulang,
            total_on_time: totalOnTime,
            total_terlambat: totalTerlambat,
            mesin_online: mesinRes[0].online_count || 0,
            recent_logs: logsRes,
            daily_attendance: weeklyData,
            monthly_attendance: monthlyData,
            attendance_distribution: distributionData,
            department_performance: deptRes,
            top_late_employees: lateRes,
            weekly_breakdown: breakdownRes
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;
