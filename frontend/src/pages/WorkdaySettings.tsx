import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    CalendarDays, Save, CheckCircle2, Building2, RefreshCw,
    Sun, Sunrise, Info, ChevronDown
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

// 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
const HARI = [
    { value: 1, label: 'Senin',  short: 'Sen', isWeekend: false },
    { value: 2, label: 'Selasa', short: 'Sel', isWeekend: false },
    { value: 3, label: 'Rabu',   short: 'Rab', isWeekend: false },
    { value: 4, label: 'Kamis',  short: 'Kam', isWeekend: false },
    { value: 5, label: "Jum'at", short: 'Jum', isWeekend: false },
    { value: 6, label: 'Sabtu',  short: 'Sab', isWeekend: true },
    { value: 0, label: 'Minggu', short: 'Min', isWeekend: true },
];

const PRESETS = [
    { label: 'Senin – Jumat',  days: [1, 2, 3, 4, 5] },
    { label: 'Senin – Sabtu', days: [1, 2, 3, 4, 5, 6] },
    { label: 'Semua Hari',    days: [0, 1, 2, 3, 4, 5, 6] },
    { label: 'Senin – Kamis', days: [1, 2, 3, 4] },
];

interface InstansiOption {
    id: number;
    nama: string;
    hari_kerja: number[];
}

const WorkdaySettings = () => {
    const { theme, isDarkMode } = useTheme();

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    // Super admin can pick instansi
    const [instansiList, setInstansiList] = useState<InstansiOption[]>([]);
    const [selectedInstansiId, setSelectedInstansiId] = useState<number | null>(null);
    const [selectedInstansiNama, setSelectedInstansiNama] = useState('');

    const [hariKerja, setHariKerja] = useState<number[]>([1, 2, 3, 4, 5]);
    const [originalHariKerja, setOriginalHariKerja] = useState<number[]>([1, 2, 3, 4, 5]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // ─── Fetch ───────────────────────────────────────────────────────────────────

    const loadSettings = useCallback(async (instansiId?: number) => {
        setLoading(true);
        try {
            const params = instansiId ? `?instansi_id=${instansiId}` : '';
            const res = await axios.get(`${API_BASE_URL}/api/work-days${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (isSuperAdmin && !instansiId) {
                // Returns array (all instansis)
                const list: InstansiOption[] = Array.isArray(res.data) ? res.data : [res.data];
                setInstansiList(list);
                if (list.length > 0) {
                    setSelectedInstansiId(list[0].id);
                    setSelectedInstansiNama(list[0].nama);
                    setHariKerja(list[0].hari_kerja);
                    setOriginalHariKerja(list[0].hari_kerja);
                }
            } else {
                // Single instansi result
                const data = Array.isArray(res.data) ? res.data[0] : res.data;
                setHariKerja(data.hari_kerja);
                setOriginalHariKerja(data.hari_kerja);
                setSelectedInstansiNama(data.nama || '');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, isSuperAdmin]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // ─── Handlers ────────────────────────────────────────────────────────────────

    const handleToggleDay = (dayVal: number) => {
        setHariKerja(prev =>
            prev.includes(dayVal) ? prev.filter(d => d !== dayVal) : [...prev, dayVal]
        );
        setSaved(false);
    };

    const handlePreset = (days: number[]) => {
        setHariKerja(days);
        setSaved(false);
    };

    const handleInstansiSelect = async (instansi: InstansiOption) => {
        setSelectedInstansiId(instansi.id);
        setSelectedInstansiNama(instansi.nama);
        setDropdownOpen(false);
        setSaved(false);
        // Fetch this instansi's settings
        setLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}/api/work-days?instansi_id=${instansi.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = Array.isArray(res.data) ? res.data[0] : res.data;
            setHariKerja(data.hari_kerja);
            setOriginalHariKerja(data.hari_kerja);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: any = { hari_kerja: hariKerja };
            if (isSuperAdmin && selectedInstansiId) {
                payload.instansi_id = selectedInstansiId;
            }
            await axios.put(`${API_BASE_URL}/api/work-days`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOriginalHariKerja(hariKerja);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    const isDirty = JSON.stringify([...hariKerja].sort()) !== JSON.stringify([...originalHariKerja].sort());

    // ─── Derived ─────────────────────────────────────────────────────────────────

    const workdayCount = hariKerja.length;
    const weekdayCountWorking   = hariKerja.filter(d => d >= 1 && d <= 5).length;
    const weekendCountWorking   = hariKerja.filter(d => d === 0 || d === 6).length;

    // ─── Render ──────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className={`flex flex-col items-center gap-3 ${theme.subTextColor}`}>
                    <RefreshCw className="w-8 h-8 animate-spin opacity-40" />
                    <p className="text-sm">Memuat pengaturan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">

            {/* Page Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor} flex items-center gap-2.5`}>
                        <CalendarDays className="w-7 h-7 text-indigo-400" />
                        Pengaturan Hari Kerja
                    </h1>
                    <p className={`mt-1 text-sm ${theme.subTextColor}`}>
                        Tentukan hari kerja dan hari libur mingguan setiap instansi.
                    </p>
                </div>

                {/* Save button */}
                <button
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg
                        ${isDirty
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30 cursor-pointer'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                        }`}
                >
                    {saving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : saved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan'}
                </button>
            </div>

            {/* Instansi Selector — Super Admin only */}
            {isSuperAdmin && (
                <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-5`}>
                    <label className={`block text-xs font-semibold uppercase tracking-widest mb-3 ${theme.subTextColor}`}>
                        Pilih Instansi
                    </label>
                    <div className="relative">
                        <button
                            onClick={() => setDropdownOpen(p => !p)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${theme.cardBorder}
                                ${isDarkMode ? 'bg-gray-800/60 text-white' : 'bg-gray-50 text-gray-900'}
                                hover:border-indigo-500/60 transition-colors`}
                        >
                            <span className="flex items-center gap-2.5">
                                <Building2 className="w-4 h-4 text-indigo-400" />
                                <span className="font-medium text-sm">{selectedInstansiNama || 'Pilih instansi...'}</span>
                            </span>
                            <ChevronDown className={`w-4 h-4 ${theme.subTextColor} transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {dropdownOpen && (
                            <div className={`absolute z-20 w-full mt-2 rounded-xl border ${theme.cardBorder} ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-2xl overflow-hidden max-h-56 overflow-y-auto`}>
                                {instansiList.map(ins => (
                                    <button
                                        key={ins.id}
                                        onClick={() => handleInstansiSelect(ins)}
                                        className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors
                                            ${selectedInstansiId === ins.id
                                                ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
                                                : `${isDarkMode ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-50 text-gray-800'}`
                                            }`}
                                    >
                                        <span className="flex items-center gap-2.5">
                                            <Building2 className="w-4 h-4" />
                                            {ins.nama}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                                            {ins.hari_kerja.length} hari/minggu
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Hari Kerja', value: workdayCount, suffix: 'hari/minggu', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                    { label: 'Hari Kerja (Weekday)', value: weekdayCountWorking, suffix: 'hari', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Hari Kerja (Weekend)', value: weekendCountWorking, suffix: 'hari', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map(stat => (
                    <div key={stat.label} className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-4 text-center`}>
                        <div className={`w-10 h-10 rounded-xl ${stat.bg} mx-auto flex items-center justify-center mb-2`}>
                            <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
                        </div>
                        <p className={`text-xs ${theme.subTextColor} leading-tight`}>{stat.label}</p>
                        <p className={`text-xs font-medium ${stat.color} mt-0.5`}>{stat.suffix}</p>
                    </div>
                ))}
            </div>

            {/* Main Card */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl overflow-hidden shadow-sm`}>

                {/* Header within card */}
                <div className={`px-6 py-4 border-b ${theme.cardBorder} flex items-center justify-between`}>
                    <div>
                        <h2 className={`font-bold ${theme.headingColor}`}>Hari Aktif Minggu Ini</h2>
                        <p className={`text-xs ${theme.subTextColor} mt-0.5`}>
                            Klik hari untuk menandai sebagai hari kerja (aktif) atau hari libur
                        </p>
                    </div>
                    {selectedInstansiNama && (
                        <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${theme.cardBorder}
                            ${isDarkMode ? 'bg-white/5 text-white/60' : 'bg-gray-100 text-gray-500'}`}>
                            <Building2 className="w-3 h-3" />
                            {selectedInstansiNama}
                        </span>
                    )}
                </div>

                {/* Day Toggles */}
                <div className="p-6">
                    <div className="grid grid-cols-7 gap-3">
                        {HARI.map(hari => {
                            const isActive = hariKerja.includes(hari.value);
                            return (
                                <button
                                    key={hari.value}
                                    onClick={() => handleToggleDay(hari.value)}
                                    className={`
                                        relative flex flex-col items-center justify-center gap-2
                                        rounded-2xl p-3 h-24 transition-all duration-200 font-medium
                                        border-2 group select-none
                                        ${isActive
                                            ? hari.isWeekend
                                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-amber-500/10 shadow-lg'
                                                : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-indigo-500/10 shadow-lg'
                                            : isDarkMode
                                                ? 'bg-white/[0.02] border-white/10 text-white/30 hover:border-white/20 hover:text-white/50 hover:bg-white/5'
                                                : 'bg-gray-50 border-gray-200 text-gray-300 hover:border-gray-300 hover:text-gray-500 hover:bg-gray-100'
                                        }
                                    `}
                                    title={`${isActive ? 'Hari Kerja' : 'Hari Libur'} — klik untuk mengubah`}
                                >
                                    {/* Active indicator dot */}
                                    {isActive && (
                                        <div className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full
                                            ${hari.isWeekend ? 'bg-amber-400' : 'bg-indigo-400'} animate-pulse`}
                                        />
                                    )}

                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors
                                        ${isActive
                                            ? hari.isWeekend ? 'bg-amber-500/30' : 'bg-indigo-500/30'
                                            : isDarkMode ? 'bg-white/5' : 'bg-gray-200/60'
                                        }`}>
                                        {hari.isWeekend
                                            ? <Sun className={`w-5 h-5 ${isActive ? (hari.value === 0 ? 'text-amber-300' : 'text-amber-400') : isDarkMode ? 'text-white/20' : 'text-gray-300'}`} />
                                            : <Sunrise className={`w-5 h-5 ${isActive ? 'text-indigo-300' : isDarkMode ? 'text-white/20' : 'text-gray-300'}`} />
                                        }
                                    </div>

                                    <div className="text-center leading-none">
                                        <p className={`text-sm font-bold ${isActive ? '' : isDarkMode ? 'text-white/30' : 'text-gray-400'}`}>{hari.short}</p>
                                        <p className={`text-[9px] mt-0.5 font-medium uppercase tracking-wider
                                            ${isActive
                                                ? hari.isWeekend ? 'text-amber-400/80' : 'text-indigo-400/80'
                                                : isDarkMode ? 'text-white/20' : 'text-gray-300'
                                            }`}>
                                            {isActive ? 'Kerja' : 'Libur'}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Visual timeline bar */}
                    <div className={`mt-6 p-4 rounded-xl ${isDarkMode ? 'bg-white/[0.03]' : 'bg-gray-50'} border ${theme.cardBorder}`}>
                        <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${theme.subTextColor}`}>
                            Jadwal Mingguan
                        </p>
                        <div className="flex gap-1.5">
                            {HARI.map(hari => {
                                const isActive = hariKerja.includes(hari.value);
                                return (
                                    <div key={hari.value} className="flex-1">
                                        <div className={`h-8 rounded-md transition-all duration-300 flex items-center justify-center
                                            ${isActive
                                                ? hari.isWeekend
                                                    ? 'bg-amber-500/40'
                                                    : 'bg-indigo-500/40'
                                                : isDarkMode ? 'bg-white/5' : 'bg-gray-200'
                                            }`}>
                                            <span className={`text-[10px] font-bold
                                                ${isActive
                                                    ? hari.isWeekend ? 'text-amber-400' : 'text-indigo-400'
                                                    : isDarkMode ? 'text-white/20' : 'text-gray-300'
                                                }`}>{hari.short}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-4 mt-3">
                            <span className="flex items-center gap-1.5 text-xs text-indigo-400">
                                <div className="w-3 h-3 rounded bg-indigo-500/40" /> Hari Kerja (Weekday)
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-amber-400">
                                <div className="w-3 h-3 rounded bg-amber-500/40" /> Hari Kerja (Weekend)
                            </span>
                            <span className={`flex items-center gap-1.5 text-xs ${theme.subTextColor}`}>
                                <div className={`w-3 h-3 rounded ${isDarkMode ? 'bg-white/5' : 'bg-gray-200'}`} /> Hari Libur
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Presets */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-5`}>
                <h3 className={`text-sm font-bold ${theme.headingColor} mb-4 flex items-center gap-2`}>
                    <Info className="w-4 h-4 text-indigo-400" />
                    Preset Cepat
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {PRESETS.map(preset => {
                        const isSelected = JSON.stringify([...hariKerja].sort((a, b) => a - b)) ===
                            JSON.stringify([...preset.days].sort((a, b) => a - b));
                        return (
                            <button
                                key={preset.label}
                                onClick={() => handlePreset(preset.days)}
                                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2 text-left
                                    ${isSelected
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                                        : `border-transparent ${isDarkMode ? 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                                    }`}
                            >
                                <span className="block">{preset.label}</span>
                                <span className={`text-xs font-normal mt-0.5 block ${isSelected ? 'text-indigo-200' : theme.subTextColor}`}>
                                    {preset.days.length} hari/minggu
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Info Note */}
            <div className={`flex gap-3 p-4 rounded-xl border ${isDarkMode ? 'border-blue-500/20 bg-blue-500/5' : 'border-blue-200 bg-blue-50'}`}>
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-blue-300/80' : 'text-blue-600'}`}>
                    Pengaturan hari kerja ini akan mempengaruhi perhitungan <strong>rekap absensi</strong>,
                    validasi kehadiran, dan laporan kehadiran. Hari yang tidak ditandai sebagai hari kerja
                    akan dianggap sebagai hari libur dan tidak dihitung dalam alpa/keterlambatan.
                </p>
            </div>

        </div>
    );
};

export default WorkdaySettings;
