import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, CheckCircle2, AlertTriangle, Briefcase, Clock, Award, AlertCircle, TrendingUp } from 'lucide-react';
import StatsCard from '../components/shared/StatsCard';
import DailyAttendanceChart from '../components/shared/DailyAttendanceChart';
import MonthlyAttendanceChart from '../components/shared/MonthlyAttendanceChart';
import AttendanceDistributionChart from '../components/shared/AttendanceDistributionChart';
import RecentActivityList from '../components/shared/RecentActivityList';

import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { theme, isDarkMode } = useTheme();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_BASE_URL}/api/dashboard/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, []);

    if (loading || !stats) {
        return <div className="p-8 text-center text-gray-400">Loading dashboard data...</div>;
    }

    // Stats Cards Data (Matched to User Request)
    const statsCards = [
        {
            title: 'TOTAL KARYAWAN',
            value: stats.total_karyawan?.toString() || '0',
            icon: Users,
            trend: { value: 0, isPositive: true },
            color: 'blue' as const
        },
        {
            title: 'TOTAL HADIR',
            value: stats.hadir_hari_ini?.toString() || '0',
            icon: CheckCircle2,
            trend: { value: 0, isPositive: true },
            color: 'emerald' as const
        },
        {
            title: 'TERLAMBAT',
            value: stats.total_terlambat?.toString() || '0',
            icon: AlertTriangle,
            trend: { value: 0, isPositive: false },
            color: 'orange' as const
        },
        {
            title: 'TIDAK HADIR (ALPHA)',
            value: stats.belum_absen?.toString() || '0',
            icon: Users,
            trend: { value: 0, isPositive: false },
            color: 'red' as const
        }
    ];

    // Activity Mapper
    const activities = stats.recent_logs?.map((log: any, idx: number) => ({
        id: idx,
        user: log.karyawan_nama,
        action: `Checked ${log.status === 'Hadir' ? 'In' : 'Out'}`,
        time: log.scan_time, // Raw time, component should format
        status: log.status === 'Hadir' ? 'success' : 'warning',
        details: log.departemen
    })) || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Dashboard Overview</h1>
                    <p className={`${theme.subTextColor}`}>Monitoring real-time statistics & analisis performa kehadiran.</p>
                </div>
                {/* Active Shifts Display */}
                {stats.active_shifts && stats.active_shifts.length > 0 && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : `bg-${theme.primary}-100 border-${theme.primary}-200 text-${theme.primary}-700`}`}>
                        <span className="text-sm font-medium">Active Shifts:</span>
                        <div className="flex gap-2">
                            {stats.active_shifts.map((shift: string, idx: number) => (
                                <span key={idx} className={`text-xs px-2 py-0.5 rounded ${isDarkMode ? 'bg-indigo-500/20 text-white' : `bg-white text-${theme.primary}-700 border border-${theme.primary}-200`}`}>
                                    {shift}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsCards.map((stat, index) => (
                    <StatsCard key={index} {...stat} />
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Charts) */}
                <div className="lg:col-span-2 space-y-6">
                    <DailyAttendanceChart
                        data={stats.weekly_breakdown?.length ? stats.weekly_breakdown : (stats.daily_attendance || [])}
                        title="Tren Kehadiran 7 Hari Terakhir"
                    />
                    <MonthlyAttendanceChart
                        data={stats.monthly_attendance || []}
                        title="Grafik Absensi Bulanan"
                    />
                </div>

                {/* Right Column (Distribution & Activity) */}
                <div className="space-y-6">
                    <AttendanceDistributionChart
                        data={stats.attendance_distribution || []}
                        title="Distribusi Kehadiran Hari Ini"
                    />
                    <RecentActivityList
                        activities={activities}
                        title="Aktivitas Terkini"
                    />
                </div>
            </div>

            {/* Additional Analytics Grid: Disiplin Departemen & Top Late */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Peringkat Disiplin Departemen */}
                <div className={`${theme.cardBg} border ${theme.cardBorder} p-6 rounded-2xl transition-colors duration-300 shadow-sm`}>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                                <Briefcase className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className={`text-base font-bold ${theme.headingColor}`}>Kedisiplinan Departemen</h3>
                                <p className={`text-xs ${theme.subTextColor}`}>Persentase tepat waktu 30 hari terakhir</p>
                            </div>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10">
                            <TrendingUp className="w-3 h-3" /> Akurasi Tinggi
                        </span>
                    </div>

                    {!stats.department_performance || stats.department_performance.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-500">
                            Belum ada data absensi per departemen.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {stats.department_performance.map((dept: any, idx: number) => {
                                const rate = Number(dept.persentase_tepat_waktu || 0);
                                const badgeColor = rate >= 85
                                    ? (isDarkMode ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50')
                                    : rate >= 65
                                    ? (isDarkMode ? 'text-amber-400 bg-amber-500/10' : 'text-amber-700 bg-amber-50')
                                    : (isDarkMode ? 'text-red-400 bg-red-500/10' : 'text-red-700 bg-red-50');

                                return (
                                    <div key={dept.id || idx} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold ${theme.headingColor}`}>{dept.departemen_nama}</span>
                                                <span className={`text-[10px] ${theme.subTextColor}`}>({dept.total_karyawan} karyawan)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${badgeColor}`}>
                                                    {rate}% Tepat Waktu
                                                </span>
                                            </div>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    rate >= 85
                                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                                        : rate >= 65
                                                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                                        : 'bg-gradient-to-r from-red-500 to-rose-400'
                                                }`}
                                                style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
                                            <span>Hadir: <b className="text-emerald-500">{dept.total_hadir || 0}</b></span>
                                            <span>Telat: <b className="text-amber-500">{dept.total_terlambat || 0}</b></span>
                                            <span>Alpa: <b className="text-red-500">{dept.total_alpa || 0}</b></span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 2. Top 5 Karyawan Paling Sering Terlambat */}
                <div className={`${theme.cardBg} border ${theme.cardBorder} p-6 rounded-2xl transition-colors duration-300 shadow-sm`}>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className={`text-base font-bold ${theme.headingColor}`}>Perhatian Kedisiplinan</h3>
                                <p className={`text-xs ${theme.subTextColor}`}>Top karyawan paling sering terlambat (60 hari terakhir)</p>
                            </div>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] text-orange-400 font-semibold px-2 py-0.5 rounded-full bg-orange-500/10">
                            <AlertCircle className="w-3 h-3" /> Evaluasi HRD
                        </span>
                    </div>

                    {!stats.top_late_employees || stats.top_late_employees.length === 0 ? (
                        <div className="py-8 text-center text-xs text-emerald-500 flex flex-col items-center justify-center gap-2">
                            <Award className="w-8 h-8 text-emerald-500/80" />
                            <span>Luar biasa! Tidak ada catatan karyawan terlambat dalam 60 hari terakhir.</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stats.top_late_employees.map((emp: any, idx: number) => {
                                const rankColors = [
                                    'bg-amber-500 text-white shadow-amber-500/30 shadow-md',
                                    'bg-slate-300 text-gray-900',
                                    'bg-amber-700 text-white',
                                    'bg-white/10 text-gray-400',
                                    'bg-white/10 text-gray-400'
                                ];

                                return (
                                    <div
                                        key={emp.id || idx}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                                            isDarkMode ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-gray-50/70 border-gray-100 hover:bg-gray-100/70'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rankColors[idx] || 'bg-white/10 text-gray-400'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className={`text-xs font-semibold ${theme.headingColor}`}>{emp.karyawan_nama}</div>
                                                <div className={`text-[10px] ${theme.subTextColor}`}>
                                                    NIK: {emp.karyawan_nik} • {emp.departemen_nama || '-'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                                {emp.total_terlambat}x Telat
                                            </span>
                                            <div className="text-[10px] text-gray-400 mt-0.5">
                                                Total <span className="font-mono font-medium text-amber-400">{emp.total_menit_terlambat}</span> mnt
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
