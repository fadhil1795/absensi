import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, CheckCircle2, AlertTriangle } from 'lucide-react';
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
                    <p className={`${theme.subTextColor}`}>Monitoring real-time statistics across all instances.</p>
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
                        data={stats.daily_attendance || []}
                        title="Grafik Absensi Mingguan" // Changed title to reflect weekly data
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
        </div>
    );
};

export default SuperAdminDashboard;
