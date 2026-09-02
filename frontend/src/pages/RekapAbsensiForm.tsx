import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save } from 'lucide-react';
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
}

const RekapAbsensiForm = () => {
    const { theme, isDarkMode } = useTheme();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [record, setRecord] = useState<RekapAbsensiItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        jam_masuk: '',
        jam_pulang: '',
        status_kehadiran: ''
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
                    status_kehadiran: item.status_kehadiran
                });
            } catch (err: any) {
                console.error('Failed to load record:', err);
                setError(err.response?.data?.error || 'Failed to load record');
            } finally {
                setLoading(false);
            }
        };

        fetchRecord();
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
                {loading ? (
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
        </div>
    );
};

export default RekapAbsensiForm;
