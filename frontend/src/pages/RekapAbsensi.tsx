import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Download, RefreshCcw, Play, CheckCircle, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface RekapAbsensiItem {
    id: number;
    karyawan_id: number;
    karyawan_nama: string;
    karyawan_nik: string;
    shift_nama: string;
    tanggal: string;
    jam_masuk: string | null;
    jam_pulang: string | null;
    status_kehadiran: string;
    terlambat_menit: number;
    pulang_cepat_menit: number;
    durasi_kerja_menit: number;
}

interface RekapStatsItem {
    karyawan_id: number;
    karyawan_nama: string;
    karyawan_nik: string;
    departemen_nama: string;
    total_hadir: number;
    total_lembur: number;
    total_terlambat: number;
    total_pulang_cepat: number;
    total_alpa: number;
    total_sakit: number;
    total_izin: number;
    total_libur: number;
    total_belum_pulang: number;
    total_terlambat_menit: number;
    total_pulang_cepat_menit: number;
    total_durasi_menit: number;
}

const RekapAbsensi = () => {
    const { theme, isDarkMode } = useTheme();
    const [data, setData] = useState<RekapAbsensiItem[]>([]);
    const [summaryData, setSummaryData] = useState<RekapStatsItem[]>([]);
    const [activeTab, setActiveTab] = useState<'detail' | 'summary' | 'personal'>('detail');
    const [karyawanList, setKaryawanList] = useState<{ id: number; nama: string; nik: string }[]>([]);
    const [selectedKaryawanID, setSelectedKaryawanID] = useState<string>('');
    const [shifts, setShifts] = useState<{ id: number; nama: string }[]>([]); // New Shift State
    const [selectedShift, setSelectedShift] = useState<string>(''); // New Shift State

    // Edit Modal State
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [countdown, setCountdown] = useState(30);
    const [isSyncing, setIsSyncing] = useState(false);

    const token = localStorage.getItem('token');

    // Helper: Badge Color
    const getStatusBadge = (status: string) => {
        let styles = isDarkMode ? "bg-gray-500/10 text-gray-400 border-gray-500/20" : "bg-gray-100 text-gray-600 border-gray-200";
        switch (status) {
            case 'Hadir': styles = isDarkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-100 text-emerald-700 border-emerald-200"; break;
            case 'Lembur': styles = isDarkMode ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-100 text-indigo-700 border-indigo-200"; break;
            case 'Terlambat': styles = isDarkMode ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-yellow-100 text-yellow-700 border-yellow-200"; break;
            case 'Pulang Cepat': styles = isDarkMode ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-100 text-orange-700 border-orange-200"; break;
            case 'Alpa': styles = isDarkMode ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-100 text-red-700 border-red-200"; break;
            case 'Izin': styles = isDarkMode ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-100 text-blue-700 border-blue-200"; break;
            case 'Sakit': styles = isDarkMode ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-100 text-purple-700 border-purple-200"; break;
        }
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles}`}>
                {status}
            </span>
        );
    };

    // Format Date Helper
    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return '-';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    }

    const handleExportExcel = () => {
        if (activeTab === 'detail' || activeTab === 'personal') {
            const worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
                'Nama': item.karyawan_nama,
                'NIK': item.karyawan_nik,
                'Shift': item.shift_nama,
                'Tanggal': formatDateDisplay(item.tanggal),
                'Jam Masuk': item.jam_masuk || '-',
                'Jam Pulang': item.jam_pulang || '-',
                'Status': item.status_kehadiran,
                'Telat (Min)': item.terlambat_menit,
                'Pulang Cepat (Min)': item.pulang_cepat_menit,
                'Durasi (Min)': item.durasi_kerja_menit
            })));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Detail Absensi");
            XLSX.writeFile(workbook, "Detail_Absensi.xlsx");
        } else {
            const worksheet = XLSX.utils.json_to_sheet(summaryData.map(item => ({
                'Nama': item.karyawan_nama,
                'NIK': item.karyawan_nik,
                'Departemen': item.departemen_nama,
                'Total Hadir': item.total_hadir,
                'Total Lembur': item.total_lembur,
                'Total Telat': item.total_terlambat,
                'Total Alpa': item.total_alpa,
                'Total Sakit': item.total_sakit,
                'Total Izin': item.total_izin,
                'Total Menit Telat': item.total_terlambat_menit,
                'Total Jam Kerja': (item.total_durasi_menit / 60).toFixed(1)
            })));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Summary");
            XLSX.writeFile(workbook, "Rekap_Summary.xlsx");
        }
    };

    // Handle Delete
    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this record?')) return;

        try {
            await axios.delete(`${API_BASE_URL}/api/rekap/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccessMsg('Record deleted successfully');
            fetchData(); // Refresh
        } catch (err: any) {
            console.error(err);
            setError('Failed to delete record');
        }
    };

    // Open Edit Modal
    const navigate = useNavigate();

    const handleEdit = (item: RekapAbsensiItem) => {
        navigate(`/dashboard/rekap/edit/${item.id}`);
    };

    const handleProcess = async () => {
        if (!startDate || !endDate) return;
        setProcessing(true);
        setSuccessMsg('');
        setError('');

        try {
            const res = await axios.post(`${API_BASE_URL}/api/rekap/process`, {
                start_date: startDate,
                end_date: endDate
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSuccessMsg(`Processing complete! ${res.data.processed} records updated.`);
            await fetchData();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Processing failed');
        } finally {
            setProcessing(false);
        }
    };

    // Fetch Employees for Dropdown
    useEffect(() => {
        const fetchKaryawan = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/karyawan`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setKaryawanList(res.data);
            } catch (e) {
                console.error("Failed to fetch employees", e);
            }
        };

        const fetchShifts = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/shifts`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setShifts(res.data);
            } catch (e) {
                console.error("Failed to fetch shifts", e);
            }
        }

        fetchKaryawan();
        fetchShifts();
    }, []);

    // Fetch Data (showLoading=false untuk auto-refresh diam-diam)
    const fetchData = async (showLoading = true) => {
        if (showLoading) {
            setLoading(true);
            setError('');
        } else {
            setIsSyncing(true);
        }
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            if (activeTab === 'personal') {
                if (!selectedKaryawanID) {
                    if (showLoading) setLoading(false);
                    else setIsSyncing(false);
                    return;
                }
                params.append('karyawan_id', selectedKaryawanID);

                // Fetch Stats for Cards
                const statsRes = await axios.get(`${API_BASE_URL}/api/rekap/stats?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSummaryData(statsRes.data);

                // Fetch Logs for Table
                const logsRes = await axios.get(`${API_BASE_URL}/api/rekap?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(logsRes.data);

            } else if (activeTab === 'detail') {
                if (selectedShift) params.append('shift_id', selectedShift);
                const response = await axios.get(`${API_BASE_URL}/api/rekap?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(response.data);
            } else {
                const response = await axios.get(`${API_BASE_URL}/api/rekap/stats?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSummaryData(response.data);
            }
            setLastUpdated(new Date());
            setCountdown(30); // reset countdown setelah fetch selesai
        } catch (err) {
            console.error(err);
            if (showLoading) setError('Failed to fetch data');
        } finally {
            if (showLoading) setLoading(false);
            else setIsSyncing(false);
        }
    };

    // ... (Keep existing handles) ...

    useEffect(() => {
        fetchData();
    }, [activeTab, selectedKaryawanID, selectedShift, startDate, endDate]);

    useEffect(() => {
        const interval = setInterval(() => fetchData(false), 30000); // silent auto-refresh
        return () => clearInterval(interval);
    }, [activeTab, selectedKaryawanID, selectedShift, startDate, endDate]);

    // Countdown 30 → 0 setiap detik, reset saat lastUpdated berubah
    useEffect(() => {
        setCountdown(30);
    }, [lastUpdated]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Helper for Personal Stats Card
    const StatCard = ({ title, value, colorClass }: { title: string, value: number, colorClass: string }) => (
        <div className={`p-4 rounded-xl border ${colorClass} flex flex-col items-center justify-center text-center transition-colors duration-300`}>
            <div className="text-3xl font-bold mb-1">{value}</div>
            <div className="text-xs uppercase tracking-wider opacity-80">{title}</div>
        </div>
    );



    return (
        <div className="space-y-6">
            {/* ... (Header) ... */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Rekap Absensi Shift</h1>
                    <p className={`${theme.subTextColor} text-sm mt-1`}>Data absensi disinkronkan otomatis. Tidak perlu klik Proses.</p>
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-xs ${theme.subTextColor}`}>Last sync: {format(lastUpdated, 'HH:mm:ss')}</span>
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                            LIVE
                        </span>
                        {isSyncing && (
                            <span className="text-blue-400 text-xs animate-pulse">memperbarui...</span>
                        )}
                        <span className={`text-xs ${theme.subTextColor}`}>
                            refresh in <span className="font-mono font-bold">{countdown}s</span>
                        </span>
                    </div>
                    {/* Progress bar countdown */}
                    <div className={`mt-2 h-0.5 w-48 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden`}>
                        <div
                            className="h-full bg-emerald-400 transition-all duration-1000 ease-linear rounded-full"
                            style={{ width: `${(countdown / 30) * 100}%` }}
                        />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm"
                    >
                        <Download className="w-4 h-4" /> Export Excel
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className={`flex gap-4 border-b ${theme.cardBorder} overflow-x-auto transition-colors duration-300`}>
                <button
                    onClick={() => setActiveTab('detail')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'detail'
                        ? `border-${theme.primary}-500 text-${theme.primary}-500`
                        : `border-transparent ${theme.subTextColor} hover:${theme.headingColor}`
                        }`}
                >
                    Detail Logs (All)
                </button>
                <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'summary'
                        ? `border-${theme.primary}-500 text-${theme.primary}-500`
                        : `border-transparent ${theme.subTextColor} hover:${theme.headingColor}`
                        }`}
                >
                    Summary (All)
                </button>
                <button
                    onClick={() => setActiveTab('personal')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'personal'
                        ? `border-${theme.primary}-500 text-${theme.primary}-500`
                        : `border-transparent ${theme.subTextColor} hover:${theme.headingColor}`
                        }`}
                >
                    Personal Recap (Per Karyawan)
                </button>
            </div>

            {/* Actions Bar */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 transition-colors duration-300`}>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    {activeTab === 'personal' && (
                        <div className="flex-1 md:max-w-xs">
                            <label className={`text-xs ${theme.subTextColor} mb-1 block`}>Select Karyawan</label>
                            <select
                                value={selectedKaryawanID}
                                onChange={(e) => setSelectedKaryawanID(e.target.value)}
                                className={`w-full ${isDarkMode ? 'bg-[#1A1D21] text-gray-300' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded px-3 py-2 text-sm focus:border-${theme.primary}-500 outline-none`}
                            >
                                <option value="">-- Pilih Karyawan --</option>
                                {karyawanList.map(k => (
                                    <option key={k.id} value={k.id}>{k.nama} - {k.nik}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(activeTab === 'detail' || activeTab === 'summary') && (
                        <div className="flex-1 md:max-w-xs">
                            <label className={`text-xs ${theme.subTextColor} mb-1 block`}>Filter Shift</label>
                            <select
                                value={selectedShift}
                                onChange={(e) => setSelectedShift(e.target.value)}
                                className={`w-full ${isDarkMode ? 'bg-[#1A1D21] text-gray-300' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded px-3 py-2 text-sm focus:border-${theme.primary}-500 outline-none`}
                            >
                                <option value="">-- All Shifts --</option>
                                {shifts.map(s => (
                                    <option key={s.id} value={s.id}>{s.nama}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className={`text-xs ${theme.subTextColor} mb-1 block`}>Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className={`bg-${isDarkMode ? '[#1A1D21]' : 'gray-50'} border ${theme.cardBorder} rounded px-3 py-2 text-sm ${theme.headingColor} focus:border-${theme.primary}-500 outline-none`}
                        />
                    </div>
                    <div>
                        <label className={`text-xs ${theme.subTextColor} mb-1 block`}>End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className={`bg-${isDarkMode ? '[#1A1D21]' : 'gray-50'} border ${theme.cardBorder} rounded px-3 py-2 text-sm ${theme.headingColor} focus:border-${theme.primary}-500 outline-none`}
                        />
                    </div>

                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} text-white rounded-lg transition-colors text-sm`}
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>

                    {/* Process button: secondary/tersembunyi - biasanya tidak diperlukan */}
                    <button
                        onClick={handleProcess}
                        disabled={processing}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border ${
                            isDarkMode
                                ? 'border-white/15 text-gray-500 hover:bg-white/5 hover:text-gray-300'
                                : 'border-gray-300 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                        } rounded-lg transition-colors text-xs ml-auto`}
                        title="Manual process — biasanya tidak diperlukan karena sistem sudah auto-sync"
                    >
                        {processing ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        {processing ? 'Processing...' : 'Process'}
                    </button>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                    Data realtime disinkronkan otomatis dan diperbarui setiap 30 detik.
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                        <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                )}
                {successMsg && (
                    <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-400 text-sm">
                        <CheckCircle className="w-4 h-4" /> {successMsg}
                    </div>
                )}
            </div>

            {/* PERSONAL STATS CARDS */}
            {activeTab === 'personal' && summaryData.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <StatCard
                        title="Kehadiran"
                        value={summaryData[0].total_hadir}
                        colorClass={isDarkMode ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200"}
                    />
                    <StatCard
                        title="Lembur"
                        value={summaryData[0].total_lembur}
                        colorClass={isDarkMode ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : "bg-indigo-50 text-indigo-600 border-indigo-200"}
                    />
                    <StatCard
                        title="Terlambat"
                        value={summaryData[0].total_terlambat}
                        colorClass={isDarkMode ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-yellow-50 text-yellow-600 border-yellow-200"}
                    />
                    <StatCard
                        title="Pulang Cepat"
                        value={summaryData[0].total_pulang_cepat}
                        colorClass={isDarkMode ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-orange-50 text-orange-600 border-orange-200"}
                    />
                    <StatCard
                        title="Tanpa Ket (Alpa)"
                        value={summaryData[0].total_alpa}
                        colorClass={isDarkMode ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-red-50 text-red-600 border-red-200"}
                    />
                    <StatCard
                        title="Cuti / Izin / Sakit"
                        value={summaryData[0].total_izin || 0}
                        colorClass={isDarkMode ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200"}
                    />
                </div>
            )}

            {/* Table */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl overflow-hidden transition-colors duration-300`}>
                <div className="overflow-x-auto">
                    {activeTab === 'summary' ? (
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className={`${isDarkMode ? 'bg-[#1A1D21]' : 'bg-gray-50'} ${theme.subTextColor} text-xs font-medium border-b ${theme.cardBorder}`}>
                                <tr>
                                    <th className="px-6 py-4">Nama Karyawan</th>
                                    <th className="px-6 py-4">Departemen</th>
                                    <th className="px-6 py-4 text-center">Hadir</th>
                                    <th className="px-6 py-4 text-center">Lembur</th>
                                    <th className="px-6 py-4 text-center">Telat</th>
                                    <th className="px-6 py-4 text-center">Alpa</th>
                                    <th className="px-6 py-4 text-center">Izin/Cuti</th>
                                    <th className="px-6 py-4 text-center">Total Telat (Min)</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-200'} text-sm`}>
                                {loading ? (
                                    <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                                ) : summaryData.length === 0 ? (
                                    <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-500">No summary data found for this period.</td></tr>
                                ) : (
                                    summaryData.map(item => (
                                        <tr key={item.karyawan_id} className={`${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                            <td className={`px-6 py-4 ${theme.headingColor}`}>
                                                {item.karyawan_nama}
                                                <div className={`text-xs ${theme.subTextColor}`}>{item.karyawan_nik}</div>
                                            </td>
                                            <td className={`px-6 py-4 ${theme.subTextColor} text-xs`}>{item.departemen_nama || '-'}</td>
                                            <td className="px-6 py-4 text-center text-emerald-400">{item.total_hadir}</td>
                                            <td className="px-6 py-4 text-center text-indigo-400">{item.total_lembur}</td>
                                            <td className="px-6 py-4 text-center text-yellow-400">{item.total_terlambat}</td>
                                            <td className="px-6 py-4 text-center text-red-400">{item.total_alpa}</td>
                                            <td className="px-6 py-4 text-center text-blue-400">{item.total_izin}</td>
                                            <td className={`px-6 py-4 text-center ${theme.headingColor} font-mono`}>{item.total_terlambat_menit || 0}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        // DETAIL TABLE (Used for 'detail' and 'personal')
                        <table className="w-full text-left whitespace-nowrap">
                            <thead className={`${isDarkMode ? 'bg-[#1A1D21]' : 'bg-gray-50'} ${theme.subTextColor} text-xs font-medium border-b ${theme.cardBorder}`}>
                                <tr>
                                    {activeTab !== 'personal' && <th className="px-6 py-4">Nama Karyawan</th>}
                                    <th className="px-6 py-4">Tanggal</th>
                                    <th className="px-6 py-4">Shift</th>
                                    <th className="px-6 py-4">Jam Masuk</th>
                                    <th className="px-6 py-4">Jam Pulang</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-center">Telat (Min)</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-200'} text-sm`}>
                                {loading ? (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan={activeTab === 'personal' ? 6 : 8} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <p>No logs found for this period.</p>
                                                <p className="text-xs text-gray-400">
                                                    Data realtime belum tersedia untuk periode ini. Silakan ubah filter atau tekan Refresh.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    data.map(item => (
                                        <tr key={item.id} className={`${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                            {activeTab !== 'personal' && (
                                                <td className={`px-6 py-4 ${theme.headingColor}`}>
                                                    {item.karyawan_nama}
                                                    <div className={`text-xs ${theme.subTextColor}`}>{item.karyawan_nik}</div>
                                                </td>
                                            )}
                                            <td className={`px-6 py-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatDateDisplay(item.tanggal)}</td>
                                            <td className={`px-6 py-4 ${theme.subTextColor} text-xs`}>{item.shift_nama || '-'}</td>
                                            <td className={`px-6 py-4 ${theme.headingColor} font-mono`}>{item.jam_masuk || '-'}</td>
                                            <td className={`px-6 py-4 ${theme.headingColor} font-mono`}>{item.jam_pulang || '-'}</td>
                                            <td className="px-6 py-4">{getStatusBadge(item.status_kehadiran)}</td>
                                            <td className={`px-6 py-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {item.terlambat_menit > 0 ? <span className="text-red-400 font-bold">{item.terlambat_menit}</span> : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RekapAbsensi;
