import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, History, User, ArrowRight, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';
import { usePermissions } from '../hooks/usePermissions';

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
}

interface EditHistoryItem {
    id: number;
    user_id: number;
    user_name: string;
    created_at: string;
    before: { jam_masuk?: string | null; jam_pulang?: string | null; status_kehadiran?: string } | null;
    after: { jam_masuk?: string | null; jam_pulang?: string | null; status_kehadiran?: string } | null;
    alasan: string;
    admin_role: string;
}

const RekapAbsensiForm = () => {
    const { theme, isDarkMode } = useTheme();
    const { hasOperation, loading: permsLoading } = usePermissions();
    const canEdit = hasOperation('rekap', 'edit');
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [record, setRecord] = useState<RekapAbsensiItem | null>(null);
    const [history, setHistory] = useState<EditHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        jam_masuk: '',
        jam_pulang: '',
        status_kehadiran: '',
        alasan: ''
    });

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!id) return;

        const fetchRecord = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${API_BASE_URL}/api/rekap/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const item: RekapAbsensiItem = response.data;
                setRecord(item);
                setForm({
                    jam_masuk: item.jam_masuk || '',
                    jam_pulang: item.jam_pulang || '',
                    status_kehadiran: item.status_kehadiran,
                    alasan: ''
                });
            } catch (err: any) {
                console.error('Failed to load record:', err);
                setError(err.response?.data?.error || 'Failed to load record');
            } finally {
                setLoading(false);
            }
        };

        fetchRecord();

        const fetchHistory = async () => {
            setLoadingHistory(true);
            try {
                const res = await axios.get(`${API_BASE_URL}/api/rekap/${id}/history`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setHistory(res.data || []);
            } catch (e) {
                console.error('Failed to load history:', e);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [id, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        setSaving(true);
        setError('');

        try {
            await axios.put(`${API_BASE_URL}/api/rekap/${id}`, form, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/dashboard/rekap');
        } catch (err: any) {
            console.error('Failed to save record:', err);
            setError(err.response?.data?.error || 'Failed to save record');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <button
                    type="button"
                    onClick={() => navigate('/dashboard/rekap')}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Rekap
                </button>
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Edit Rekap Absensi</h1>
                    <p className={`${theme.subTextColor} text-sm mt-1`}>Update jam masuk, jam pulang, atau status kehadiran.</p>
                </div>
                <div />
            </div>

            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-6 shadow-sm transition-colors duration-300`}>
                {!permsLoading && !canEdit ? (
                    <div className="text-center py-14 space-y-3">
                        <div className="text-amber-500 font-semibold text-lg">Akses Ditolak</div>
                        <p className={`text-sm ${theme.subTextColor}`}>
                            Role Anda tidak memiliki izin untuk mengedit absensi (<code>rekap.edit</code>).
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/rekap')}
                            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
                        >
                            Kembali ke Rekap
                        </button>
                    </div>
                ) : loading ? (
                    <div className="text-center py-14 text-gray-500">Loading attendance record...</div>
                ) : error ? (
                    <div className="text-center py-14 text-red-500">{error}</div>
                ) : record ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Nama Karyawan</label>
                                <input
                                    type="text"
                                    value={record.karyawan_nama}
                                    disabled
                                    className={`w-full ${isDarkMode ? 'bg-[#111315] text-gray-400' : 'bg-gray-100 text-gray-600'} border ${theme.cardBorder} rounded px-3 py-2 cursor-not-allowed`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>NIK</label>
                                <input
                                    type="text"
                                    value={record.karyawan_nik}
                                    disabled
                                    className={`w-full ${isDarkMode ? 'bg-[#111315] text-gray-400' : 'bg-gray-100 text-gray-600'} border ${theme.cardBorder} rounded px-3 py-2 cursor-not-allowed`}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Tanggal</label>
                                <input
                                    type="text"
                                    value={record.tanggal}
                                    disabled
                                    className={`w-full ${isDarkMode ? 'bg-[#111315] text-gray-400' : 'bg-gray-100 text-gray-600'} border ${theme.cardBorder} rounded px-3 py-2 cursor-not-allowed`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Shift</label>
                                <input
                                    type="text"
                                    value={record.shift_nama || '-'}
                                    disabled
                                    className={`w-full ${isDarkMode ? 'bg-[#111315] text-gray-400' : 'bg-gray-100 text-gray-600'} border ${theme.cardBorder} rounded px-3 py-2 cursor-not-allowed`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Status Saat Ini</label>
                                <input
                                    type="text"
                                    value={record.status_kehadiran}
                                    disabled
                                    className={`w-full ${isDarkMode ? 'bg-[#111315] text-gray-400' : 'bg-gray-100 text-gray-600'} border ${theme.cardBorder} rounded px-3 py-2 cursor-not-allowed`}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Jam Masuk (HH:MM:SS)</label>
                                <input
                                    type="text"
                                    value={form.jam_masuk}
                                    onChange={(e) => setForm({ ...form, jam_masuk: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-[#111315] text-white' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded px-3 py-2 focus:border-${theme.primary}-500 outline-none`}
                                    placeholder="08:00:00"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Jam Pulang (HH:MM:SS)</label>
                                <input
                                    type="text"
                                    value={form.jam_pulang}
                                    onChange={(e) => setForm({ ...form, jam_pulang: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-[#111315] text-white' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded px-3 py-2 focus:border-${theme.primary}-500 outline-none`}
                                    placeholder="17:00:00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Status Kehadiran</label>
                            <select
                                value={form.status_kehadiran}
                                onChange={(e) => setForm({ ...form, status_kehadiran: e.target.value })}
                                className={`w-full ${isDarkMode ? 'bg-[#111315] text-white' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded px-3 py-2 focus:border-${theme.primary}-500 outline-none`}
                            >
                                <option value="Hadir">Hadir</option>
                                <option value="Terlambat">Terlambat</option>
                                <option value="Pulang Cepat">Pulang Cepat</option>
                                <option value="Alpa">Alpa</option>
                                <option value="Izin">Izin</option>
                                <option value="Sakit">Sakit</option>
                                <option value="Libur">Libur</option>
                                <option value="Belum Pulang">Belum Pulang</option>
                            </select>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>
                                Alasan / Catatan Perubahan <span className="text-xs text-gray-500">(Opsional)</span>
                            </label>
                            <input
                                type="text"
                                value={form.alasan}
                                onChange={(e) => setForm({ ...form, alasan: e.target.value })}
                                className={`w-full ${isDarkMode ? 'bg-[#111315] text-white' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded px-3 py-2 focus:border-${theme.primary}-500 outline-none`}
                                placeholder="Contoh: Koreksi lupa tap pulang, Izin dinas luar sekolah, dll."
                            />
                        </div>

                        {error && (
                            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/rekap')}
                                className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'} transition-colors`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-red-600 hover:bg-red-700'} transition-colors ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-14 text-gray-500">Record not found.</div>
                )}
            </div>

            {/* Riwayat Perubahan (Audit Trail) */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-6 shadow-sm transition-colors duration-300`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-500" />
                        <h2 className={`text-base font-bold ${theme.headingColor}`}>Riwayat Perubahan Absensi</h2>
                    </div>
                    <span className={`text-xs ${theme.subTextColor}`}>
                        {history.length} kali perubahan tercatat
                    </span>
                </div>

                {loadingHistory ? (
                    <div className="py-6 text-center text-xs text-gray-500">Memuat riwayat perubahan...</div>
                ) : history.length === 0 ? (
                    <div className={`py-6 text-center text-xs ${theme.subTextColor}`}>
                        Belum ada riwayat pengeditan manual untuk record absensi ini.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((item, idx) => (
                            <div
                                key={item.id || idx}
                                className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50/70 border-gray-200'} space-y-2.5`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                                            <User className="w-3.5 h-3.5" />
                                        </div>
                                        <span className={`font-semibold ${theme.headingColor}`}>{item.user_name || 'Admin'}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                                            {item.admin_role || 'Admin'}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-mono">
                                        {item.created_at ? format(new Date(item.created_at), 'dd/MM/yyyy HH:mm:ss') : '-'}
                                    </span>
                                </div>

                                {/* Comparison changes */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-xs">
                                    {/* Status Change */}
                                    <div className={`p-2.5 rounded-lg border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white border-gray-200'}`}>
                                        <div className="text-[10px] text-gray-400 mb-1">Status Kehadiran</div>
                                        <div className="flex items-center gap-2 font-medium">
                                            <span className={item.before?.status_kehadiran ? 'line-through opacity-70' : ''}>
                                                {item.before?.status_kehadiran || '-'}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
                                            <span className="text-emerald-500 font-bold">
                                                {item.after?.status_kehadiran || '-'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Jam Masuk */}
                                    <div className={`p-2.5 rounded-lg border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white border-gray-200'}`}>
                                        <div className="text-[10px] text-gray-400 mb-1">Jam Masuk</div>
                                        <div className="flex items-center gap-2 font-mono">
                                            <span className={item.before?.jam_masuk ? 'line-through opacity-70' : ''}>
                                                {item.before?.jam_masuk || '-'}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
                                            <span className="font-semibold">{item.after?.jam_masuk || '-'}</span>
                                        </div>
                                    </div>

                                    {/* Jam Pulang */}
                                    <div className={`p-2.5 rounded-lg border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-white border-gray-200'}`}>
                                        <div className="text-[10px] text-gray-400 mb-1">Jam Pulang</div>
                                        <div className="flex items-center gap-2 font-mono">
                                            <span className={item.before?.jam_pulang ? 'line-through opacity-70' : ''}>
                                                {item.before?.jam_pulang || '-'}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
                                            <span className="font-semibold">{item.after?.jam_pulang || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Alasan / Catatan */}
                                {item.alasan && item.alasan !== '-' && item.alasan !== 'Tidak ada keterangan' && (
                                    <div className="flex items-start gap-1.5 text-xs text-amber-500/90 pt-1">
                                        <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                        <span>Catatan: <em>"{item.alasan}"</em></span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RekapAbsensiForm;
