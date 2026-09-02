import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface AttendanceSummary {
    id: string;
    tanggal: string;
    karyawan_nama: string;
    karyawan_nik: string;
    jabatan: string;
    departemen: string;
    jam_masuk: string | null;
    jam_keluar: string | null;
    jam_kerja: string;
    status: string;
    terlambat_menit: number;
    pulang_cepat_menit: number;
}

const LaporanAbsensiForm = () => {
    const { theme, isDarkMode } = useTheme();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [record, setRecord] = useState<AttendanceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        jam_masuk: '',
        jam_keluar: '',
        status: ''
    });

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!id) return;

        const fetchRecord = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${API_BASE_URL}/api/absensi/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const data: AttendanceSummary = response.data;
                setRecord(data);
                setForm({
                    jam_masuk: data.jam_masuk || '',
                    jam_keluar: data.jam_keluar || '',
                    status: data.status || 'Hadir'
                });
            } catch (err: any) {
                console.error('Failed to load attendance record:', err);
                setError(err.response?.data?.error || 'Failed to load attendance record');
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
            await axios.put(`${API_BASE_URL}/api/absensi/${id}`, {
                jam_masuk: form.jam_masuk,
                jam_keluar: form.jam_keluar,
                status_kehadiran: form.status
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/dashboard/laporan');
        } catch (err: any) {
            console.error('Failed to save attendance record:', err);
            setError(err.response?.data?.error || 'Failed to update attendance record');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <button
                    type="button"
                    onClick={() => navigate('/dashboard/laporan')}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Laporan
                </button>
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Edit Absensi</h1>
                    <p className={`${theme.subTextColor} text-sm mt-1`}>Update data absensi karyawan untuk tanggal terpilih.</p>
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
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Departemen</label>
                                <input
                                    type="text"
                                    value={record.departemen}
                                    disabled
                                    className={`w-full ${isDarkMode ? 'bg-[#111315] text-gray-400' : 'bg-gray-100 text-gray-600'} border ${theme.cardBorder} rounded px-3 py-2 cursor-not-allowed`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Jabatan</label>
                                <input
                                    type="text"
                                    value={record.jabatan}
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
                                    placeholder="07:30:00"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Jam Pulang (HH:MM:SS)</label>
                                <input
                                    type="text"
                                    value={form.jam_keluar}
                                    onChange={(e) => setForm({ ...form, jam_keluar: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-[#111315] text-white' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded px-3 py-2 focus:border-${theme.primary}-500 outline-none`}
                                    placeholder="17:00:00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Status Kehadiran</label>
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
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
                                onClick={() => navigate('/dashboard/laporan')}
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

export default LaporanAbsensiForm;
