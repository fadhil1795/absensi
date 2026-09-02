import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Clock, CheckCircle, Smartphone } from 'lucide-react';
import StatsCard from '../components/shared/StatsCard';
import OverviewChart from '../components/shared/OverviewChart';
import { format } from 'date-fns';
import { API_BASE_URL } from '../config';

interface DashboardStats {
    total_karyawan: number;
    total_mesin: number;
    mesin_online: number;
    hadir_hari_ini: number;
    total_scan_hari_ini: number;
    recent_logs: any[];
    attendance_chart: { name: string; value: number }[];
}

const InstansiDashboard = () => {
    const [stats, setStats] = useState<DashboardStats>({
        total_karyawan: 0,
        total_mesin: 0,
        mesin_online: 0,
        hadir_hari_ini: 0,
        total_scan_hari_ini: 0,
        recent_logs: [],
        attendance_chart: []
    });

    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/dashboard/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(res.data);
            } catch (error) {
                console.error('Failed to fetch dashboard stats', error);
            }
        };

        fetchStats();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [token]);

    const statCards = [
        {
            title: 'Karyawan Aktif',
            value: stats.total_karyawan.toString(),
            icon: Users,
            color: 'blue' as const,
            trend: { value: 0, isPositive: true } // Static trend for now
        },
        {
            title: 'Kehadiran Hari Ini',
            value: `${stats.hadir_hari_ini} / ${stats.total_karyawan}`,
            icon: CheckCircle,
            description: stats.total_karyawan > 0 ? `${Math.round((stats.hadir_hari_ini / stats.total_karyawan) * 100)}% Attendance Rate` : 'No Employees',
            color: 'emerald' as const,
            trend: { value: 0, isPositive: true }
        },
        {
            title: 'Mesin Absensi',
            value: `${stats.mesin_online} Online`,
            icon: Smartphone, // Using Smartphone as proxy for Device
            description: `Total ${stats.total_mesin} Mesin`,
            color: 'indigo' as const,
            trend: { value: 0, isPositive: true }
        },
        {
            title: 'Total Scans',
            value: stats.total_scan_hari_ini.toString(),
            icon: Clock,
            description: 'Scans Today',
            color: 'purple' as const,
            trend: { value: 0, isPositive: true }
        }
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Dashboard Instansi</h1>
            <p className="text-gray-400">Ringkasan aktivitas absensi hari ini.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <StatsCard key={index} {...stat} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <OverviewChart data={stats.attendance_chart || []} title="Statistik Kedatangan Pagi Ini" />
                </div>
                <div className="bg-gray-900 border border-white/10 p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-4">Log Absensi Terbaru</h3>
                    <div className="space-y-4">
                        {stats.recent_logs.length === 0 ? (
                            <p className="text-gray-500 text-sm">Belum ada aktivitas.</p>
                        ) : (
                            stats.recent_logs.map((log: any, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold text-xs">
                                            {log.karyawan_nama ? log.karyawan_nama.charAt(0) : '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{log.karyawan_nama || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500">{log.departemen || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">
                                            {format(new Date(log.scan_time), 'HH:mm')}
                                        </p>
                                        <p className={`text-xs ${log.status === 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                                            {log.status === 0 ? 'Masuk' : 'Pulang'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstansiDashboard;
