
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, RefreshCcw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface RealtimeData {
    id: string;
    instansi_nama?: string; // If backend provides it, otherwise implied
    karyawan_nama: string;
    karyawan_nik: string;
    departemen: string;
    shift_nama: string; // Add this
    jam_masuk: string;
    jam_keluar: string;
    status: string;
    terlambat_menit: number;
    updated_at: string;
}

const RealtimeAbsensi = () => {
    const { theme, isDarkMode } = useTheme();
    const [data, setData] = useState<RealtimeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [shifts, setShifts] = useState<{ id: number; nama: string }[]>([]);
    const [selectedShift, setSelectedShift] = useState<string>('');

    const token = localStorage.getItem('token');

    const fetchData = async () => {
        setLoading(true);
        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            // Reusing existing summary endpoint which works for Super Admin (all instances)
            const response = await axios.get(`${API_BASE_URL}/api/absensi/summary`, {
                params: {
                    start_date: today,
                    end_date: today,
                    shift_id: selectedShift || undefined
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(response.data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch realtime data', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial Fetch & Polling
    useEffect(() => {
        // Fetch Shifts
        const fetchShifts = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/shifts`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setShifts(res.data);
            } catch (e) {
                console.error("Failed to fetch shifts", e);
            }
        };
        fetchShifts();
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30 seconds
        return () => clearInterval(interval);
    }, [selectedShift]); // Refetch when shift filter changes

    const filteredData = data.filter(item =>
        item.karyawan_nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.karyawan_nik.includes(searchQuery) ||
        (item.departemen && item.departemen.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getStatusStyle = (status: string, terlambat: number) => {
        if (terlambat > 0) return "bg-red-500/10 text-red-500 border-red-500/20";
        if (status === 'Hadir') return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        if (status === 'Pulang Cepat') return "bg-amber-500/10 text-amber-500 border-amber-500/20";
        return `${isDarkMode ? 'bg-gray-500/10 text-gray-500 border-gray-500/20' : 'bg-gray-200 text-gray-500 border-gray-300'}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor} flex items-center gap-2`}>
                        <Clock className={`w-6 h-6 ${isDarkMode ? 'text-indigo-500' : `text-${theme.primary}-600`}`} />
                        Live Monitoring
                        <span className={`text-xs font-normal ${theme.subTextColor} ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-200 border-gray-300'} px-2 py-1 rounded-full border`}>
                            Realtime
                        </span>
                    </h1>
                    <p className={`${theme.subTextColor} text-sm mt-1`}>
                        Memantau aktivitas check-in/out hari ini ({format(new Date(), 'dd MMM yyyy')})
                    </p>
                </div>
                <div className={`flex items-center gap-3 text-sm ${theme.subTextColor}`}>
                    <span>Updated: {format(lastUpdated, 'HH:mm:ss')}</span>
                    <button
                        onClick={fetchData}
                        className={`p-2 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} rounded-lg transition-colors`}
                        title="Refresh Now"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats Cards (Optional Quick View) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`${theme.cardBg} p-4 rounded-xl border ${theme.cardBorder}`}>
                    <div className={`${theme.subTextColor} text-xs uppercase tracking-wider`}>Total Scan Hari Ini</div>
                    <div className={`text-2xl font-bold ${theme.headingColor} mt-1`}>{data.length}</div>
                </div>
                <div className={`${theme.cardBg} p-4 rounded-xl border ${theme.cardBorder}`}>
                    <div className={`${theme.subTextColor} text-xs uppercase tracking-wider`}>Hadir Tepat Waktu</div>
                    <div className="text-2xl font-bold text-emerald-500 mt-1">
                        {data.filter(i => i.status === 'Hadir' && (i.terlambat_menit || 0) === 0).length}
                    </div>
                </div>
                <div className={`${theme.cardBg} p-4 rounded-xl border ${theme.cardBorder}`}>
                    <div className={`${theme.subTextColor} text-xs uppercase tracking-wider`}>Terlambat</div>
                    <div className="text-2xl font-bold text-red-500 mt-1">
                        {data.filter(i => (i.terlambat_menit || 0) > 0).length}
                    </div>
                </div>
                <div className={`${theme.cardBg} p-4 rounded-xl border ${theme.cardBorder}`}>
                    <div className={`${theme.subTextColor} text-xs uppercase tracking-wider`}>Sudah Pulang</div>
                    <div className="text-2xl font-bold text-blue-500 mt-1">
                        {data.filter(i => i.jam_keluar && i.jam_keluar !== '00:00:00').length}
                    </div>
                </div>
            </div>

            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 space-y-4`}>
                {/* Search */}
                <div className="relative max-w-md">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.subTextColor}`} />
                    <input
                        type="text"
                        placeholder="Cari Nama, NIK, atau Departemen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full ${isDarkMode ? 'bg-[#1A1D21] text-white' : 'bg-gray-50 text-gray-900'} pl-10 pr-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none placeholder:${isDarkMode ? 'text-gray-600' : 'text-gray-400'} text-sm`}
                    />
                </div>

                {/* Shift Filter */}
                <div className="w-48">
                    <select
                        value={selectedShift}
                        onChange={(e) => setSelectedShift(e.target.value)}
                        className={`w-full ${isDarkMode ? 'bg-[#1A1D21] text-white' : 'bg-gray-50 text-gray-900'} px-3 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none text-sm`}
                    >
                        <option value="">All Shifts</option>
                        {shifts.map(s => (
                            <option key={s.id} value={s.id}>{s.nama}</option>
                        ))}
                    </select>
                </div>


                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className={`${theme.subTextColor} text-xs font-medium border-b ${theme.cardBorder}`}>
                            <tr>
                                <th className="px-4 py-3 font-normal">Waktu</th>
                                <th className="px-4 py-3 font-normal">Nama Karyawan</th>
                                <th className="px-4 py-3 font-normal">Departemen</th>
                                <th className="px-4 py-3 font-normal">Shift</th>
                                <th className="px-4 py-3 font-normal">Jam Masuk</th>
                                <th className="px-4 py-3 font-normal">Jam Pulang</th>
                                <th className="px-4 py-3 font-normal">Keterlambatan</th>
                                <th className="px-4 py-3 font-normal">Status</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-200'} text-sm`}>
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={`px-4 py-8 text-center ${theme.subTextColor}`}>
                                        Belum ada data absensi hari ini.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((row) => (
                                    <tr key={row.id} className={`${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                        <td className={`px-4 py-3 ${theme.subTextColor} text-xs font-mono`}>
                                            {/* Ideally logic to show 'Just Now' if very recent */}
                                            {row.jam_keluar ? row.jam_keluar : row.jam_masuk}
                                        </td>
                                        <td className={`px-4 py-3 ${theme.headingColor} font-medium`}>
                                            {row.karyawan_nama}
                                            <div className={`text-[10px] ${theme.subTextColor}`}>{row.karyawan_nik}</div>
                                        </td>
                                        <td className={`px-4 py-3 ${theme.subTextColor}`}>{row.departemen || '-'}</td>
                                        <td className={`px-4 py-3 ${theme.subTextColor}`}>{row.shift_nama || '-'}</td>
                                        <td className="px-4 py-3 text-emerald-500 font-mono font-medium">{row.jam_masuk}</td>
                                        <td className="px-4 py-3 text-blue-500 font-mono font-medium">{row.jam_keluar || '-'}</td>
                                        <td className="px-4 py-3">
                                            {row.terlambat_menit > 0 ? (
                                                <span className="text-red-500 font-medium">+{row.terlambat_menit}m</span>
                                            ) : (
                                                <span className={theme.subTextColor}>-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${getStatusStyle(row.status, row.terlambat_menit)}`}>
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RealtimeAbsensi;
