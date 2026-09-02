
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Plus, Trash2, CalendarRange } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface Holiday {
    id: number;
    tanggal: string;
    keterangan: string;
    instansi_id: number | null;
    instansi_nama?: string;
}

interface HolidayGroup {
    ids: number[];
    tanggal_mulai: string;
    tanggal_selesai: string;
    keterangan: string;
    instansi_id: number | null;
    instansi_nama?: string;
    count: number;
}

interface Instansi {
    id: number;
    nama: string;
}

const HolidayManagement = () => {
    const { theme, isDarkMode } = useTheme();
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [instansis, setInstansis] = useState<Instansi[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRangeMode, setIsRangeMode] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-01-01'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-12-31'));

    // Form
    const [formData, setFormData] = useState({
        tanggal: format(new Date(), 'yyyy-MM-dd'),
        tanggal_mulai: format(new Date(), 'yyyy-MM-dd'),
        tanggal_selesai: format(new Date(), 'yyyy-MM-dd'),
        keterangan: '',
        instansi_id: '' // Empty = Global (if Super Admin)
    });

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    // Group consecutive holidays with same description
    const groupHolidays = (list: Holiday[]): HolidayGroup[] => {
        if (list.length === 0) return [];

        // Sort by date ascending
        const sorted = [...list].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

        const groups: HolidayGroup[] = [];
        let currentGroup: HolidayGroup = {
            ids: [sorted[0].id],
            tanggal_mulai: sorted[0].tanggal,
            tanggal_selesai: sorted[0].tanggal,
            keterangan: sorted[0].keterangan,
            instansi_id: sorted[0].instansi_id,
            instansi_nama: sorted[0].instansi_nama,
            count: 1
        };

        for (let i = 1; i < sorted.length; i++) {
            const curr = sorted[i];
            const prevDate = new Date(currentGroup.tanggal_selesai);
            const currDate = new Date(curr.tanggal);
            const daysDiff = differenceInDays(currDate, prevDate);

            // Group if same description, same instansi, and consecutive days
            if (
                curr.keterangan === currentGroup.keterangan &&
                curr.instansi_id === currentGroup.instansi_id &&
                daysDiff === 1
            ) {
                currentGroup.tanggal_selesai = curr.tanggal;
                currentGroup.ids.push(curr.id);
                currentGroup.count++;
            } else {
                groups.push(currentGroup);
                currentGroup = {
                    ids: [curr.id],
                    tanggal_mulai: curr.tanggal,
                    tanggal_selesai: curr.tanggal,
                    keterangan: curr.keterangan,
                    instansi_id: curr.instansi_id,
                    instansi_nama: curr.instansi_nama,
                    count: 1
                };
            }
        }
        groups.push(currentGroup);

        return groups;
    };

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const [holRes, insRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/holidays?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                isSuperAdmin ? axios.get(`${API_BASE_URL}/api/instansi`, {
                    headers: { Authorization: `Bearer ${token}` }
                }) : Promise.resolve({ data: [] })
            ]);

            setHolidays(holRes.data);
            if (isSuperAdmin) setInstansis(insRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                keterangan: formData.keterangan,
                instansi_id: formData.instansi_id || undefined
            };

            if (isRangeMode) {
                payload.tanggal_mulai = formData.tanggal_mulai;
                payload.tanggal_selesai = formData.tanggal_selesai;
            } else {
                payload.tanggal = formData.tanggal;
            }

            await axios.post(`${API_BASE_URL}/api/holidays`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsModalOpen(false);
            setFormData({ ...formData, keterangan: '' }); // Reset partial
            fetchData();
        } catch (error: any) {
            const msg = error?.response?.data?.error || 'Gagal menambahkan hari libur';
            alert(msg);
        }
    };

    const handleDeleteGroup = async (ids: number[]) => {
        const label = ids.length > 1 ? `Hapus ${ids.length} hari libur dalam rentang ini?` : 'Hapus hari libur ini?';
        if (!confirm(label)) return;
        try {
            await Promise.all(
                ids.map(id =>
                    axios.delete(`${API_BASE_URL}/api/holidays/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                )
            );
            fetchData();
        } catch (error) {
            alert('Gagal menghapus');
        }
    };

    // Calculate range days for preview
    const getRangeDays = () => {
        if (!isRangeMode) return 0;
        const start = new Date(formData.tanggal_mulai);
        const end = new Date(formData.tanggal_selesai);
        if (end < start) return 0;
        return differenceInDays(end, start) + 1;
    };

    const formatDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'dd MMMM yyyy', { locale: localeId });
        } catch {
            return dateStr;
        }
    };

    const groupedHolidays = groupHolidays(holidays);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Manajemen Hari Libur</h1>
                    <p className={theme.subTextColor}>Kelola hari libur nasional dan instansi.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className={`flex items-center gap-2 bg-${theme.primary}-600 hover:bg-${theme.primary}-500 text-white px-4 py-2 rounded-lg transition-colors`}
                >
                    <Plus className="w-4 h-4" /> Tambah Hari Libur
                </button>
            </div>

            {/* Filters */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-xl flex gap-4 items-end`}>
                <div>
                    <label className={`text-xs ${theme.subTextColor} mb-1 block`}>Dari</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`bg-${isDarkMode ? 'gray-800' : 'gray-50'} border ${theme.cardBorder} rounded px-3 py-2 text-sm ${theme.headingColor}`} />
                </div>
                <div>
                    <label className={`text-xs ${theme.subTextColor} mb-1 block`}>Sampai</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`bg-${isDarkMode ? 'gray-800' : 'gray-50'} border ${theme.cardBorder} rounded px-3 py-2 text-sm ${theme.headingColor}`} />
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? <p className="text-gray-500">Memuat...</p> : groupedHolidays.map((g, idx) => (
                    <div key={`${g.ids[0]}-${idx}`} className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-xl hover:border-${theme.primary}-500/30 transition-colors group relative shadow-sm`}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${g.instansi_id ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    {g.count > 1 ? <CalendarRange className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className={`font-bold ${theme.headingColor}`}>{g.keterangan}</h3>
                                    {g.count > 1 ? (
                                        <div>
                                            <p className={`text-sm ${theme.subTextColor}`}>
                                                {formatDate(g.tanggal_mulai)} — {formatDate(g.tanggal_selesai)}
                                            </p>
                                            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                                                {g.count} hari
                                            </p>
                                        </div>
                                    ) : (
                                        <p className={`text-sm ${theme.subTextColor}`}>{formatDate(g.tanggal_mulai)}</p>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => handleDeleteGroup(g.ids)} className={`${theme.subTextColor} hover:text-red-400 transition-colors`}>
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className={`mt-3 pt-3 border-t ${theme.cardBorder} flex justify-between items-center text-xs`}>
                            <span className={`px-2 py-0.5 rounded ${g.instansi_id ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                {g.instansi_id ? (g.instansi_nama || 'Instansi Tertentu') : 'Nasional / Global'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {!loading && groupedHolidays.length === 0 && (
                <div className={`text-center py-12 ${theme.subTextColor}`}>
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Belum ada hari libur dalam rentang tanggal ini.</p>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 w-full max-w-md shadow-xl`}>
                        <h2 className={`text-xl font-bold ${theme.headingColor} mb-4`}>Tambah Hari Libur</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={`block text-sm ${theme.subTextColor} mb-1`}>Keterangan</label>
                                <input
                                    type="text" required
                                    value={formData.keterangan}
                                    onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-3 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                    placeholder="cth: Cuti Bersama, Hari Kemerdekaan"
                                />
                            </div>

                            {/* Mode Toggle */}
                            <div className={`flex items-center gap-3 p-3 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
                                <button
                                    type="button"
                                    onClick={() => setIsRangeMode(false)}
                                    className={`flex-1 text-center py-2 rounded-md text-sm font-medium transition-all ${!isRangeMode
                                            ? `bg-${theme.primary}-600 text-white shadow`
                                            : `${theme.subTextColor} hover:${theme.headingColor}`
                                        }`}
                                >
                                    <Calendar className="w-4 h-4 inline mr-1.5" />
                                    Tanggal Tunggal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsRangeMode(true)}
                                    className={`flex-1 text-center py-2 rounded-md text-sm font-medium transition-all ${isRangeMode
                                            ? `bg-${theme.primary}-600 text-white shadow`
                                            : `${theme.subTextColor} hover:${theme.headingColor}`
                                        }`}
                                >
                                    <CalendarRange className="w-4 h-4 inline mr-1.5" />
                                    Rentang Tanggal
                                </button>
                            </div>

                            {!isRangeMode ? (
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Tanggal</label>
                                    <input
                                        type="date" required
                                        value={formData.tanggal}
                                        onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                                        className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-3 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={`block text-sm ${theme.subTextColor} mb-1`}>Tanggal Mulai</label>
                                            <input
                                                type="date" required
                                                value={formData.tanggal_mulai}
                                                onChange={e => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                                                className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-3 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-sm ${theme.subTextColor} mb-1`}>Tanggal Selesai</label>
                                            <input
                                                type="date" required
                                                value={formData.tanggal_selesai}
                                                min={formData.tanggal_mulai}
                                                onChange={e => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                                                className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-3 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                            />
                                        </div>
                                    </div>
                                    {getRangeDays() > 0 && (
                                        <div className={`text-sm px-3 py-2 rounded-lg ${isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                            📅 Akan membuat <strong>{getRangeDays()} hari libur</strong> dari{' '}
                                            {formatDate(formData.tanggal_mulai)} sampai {formatDate(formData.tanggal_selesai)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {isSuperAdmin && (
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Berlaku Untuk</label>
                                    <select
                                        value={formData.instansi_id}
                                        onChange={e => setFormData({ ...formData, instansi_id: e.target.value })}
                                        className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-3 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                    >
                                        <option value="">Global (Semua Instansi)</option>
                                        {instansis.map(i => (
                                            <option key={i.id} value={i.id}>{i.nama}</option>
                                        ))}
                                    </select>
                                    <p className={`text-xs ${theme.subTextColor} mt-1`}>Kosongkan untuk Hari Libur Nasional yang berlaku untuk semua.</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className={`${theme.subTextColor} hover:${theme.headingColor}`}>Batal</button>
                                <button type="submit" className={`bg-${theme.primary}-600 hover:bg-${theme.primary}-500 text-white px-4 py-2 rounded-lg`}>Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HolidayManagement;
