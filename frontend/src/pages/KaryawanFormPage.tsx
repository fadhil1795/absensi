import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface Karyawan {
    id: number;
    pin: string;
    nik: string;
    nama: string;
    departemen: string;
    instansi_id: number;
    instansi_nama?: string;
    shift_id?: number;
    shift_nama?: string;
    departemen_id?: number | null;
}

interface Instansi {
    id: number;
    nama: string;
}

interface Shift {
    id: number;
    nama: string;
    jam_masuk: string;
    jam_pulang: string;
    instansi_id: number;
}

interface Departemen {
    id: number;
    nama: string;
    karyawan_id: number | null;
}

const KaryawanFormPage = () => {
    const { theme, isDarkMode } = useTheme();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [instansis, setInstansis] = useState<Instansi[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [departemens, setDepartemens] = useState<Departemen[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        pin: '',
        nik: '',
        nama: '',
        departemen: '',
        instansi_id: '',
        shift_id: '',
        departemen_id: ''
    });

    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [instansiRes, shiftRes, deptRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/instansi`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_BASE_URL}/api/shifts`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_BASE_URL}/api/departemen`, { params: { limit: 100 }, headers: { Authorization: `Bearer ${token}` } })
                ]);

                setInstansis(instansiRes.data);
                setShifts(shiftRes.data);
                setDepartemens(deptRes.data.data || []);

                if (isEditMode && id) {
                    const response = await axios.get(`${API_BASE_URL}/api/karyawan/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const karyawan: Karyawan = response.data;
                    setFormData({
                        pin: karyawan.pin,
                        nik: karyawan.nik,
                        nama: karyawan.nama,
                        departemen: karyawan.departemen || '',
                        instansi_id: karyawan.instansi_id.toString(),
                        shift_id: karyawan.shift_id ? karyawan.shift_id.toString() : '',
                        departemen_id: karyawan.departemen_id ? karyawan.departemen_id.toString() : ''
                    });
                }
            } catch (error) {
                console.error('Failed to load karyawan form data:', error);
                alert('Failed to load form data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, isEditMode, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (isEditMode && id) {
                await axios.put(`${API_BASE_URL}/api/karyawan/${id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_BASE_URL}/api/karyawan`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            navigate('/dashboard/karyawan');
        } catch (error: any) {
            console.error('Error saving karyawan:', error);
            alert(error.response?.data?.error || 'Gagal menyimpan karyawan.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={() => navigate('/dashboard/karyawan')}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Karyawan
                </button>
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>{isEditMode ? 'Edit Karyawan' : 'Tambah Karyawan'}</h1>
                    <p className={`${theme.subTextColor} text-sm`}>
                        {isEditMode ? 'Update the selected employee data.' : 'Create a new employee record.'}
                    </p>
                </div>
                <div />
            </div>

            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-6 shadow-sm transition-colors duration-300`}>
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Loading form data...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Instansi</label>
                                <select
                                    required
                                    value={formData.instansi_id}
                                    onChange={(e) => setFormData({ ...formData, instansi_id: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none appearance-none`}
                                >
                                    <option value="">Select Instansi</option>
                                    {instansis.map(i => (
                                        <option key={i.id} value={i.id}>{i.nama}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Shift</label>
                                <select
                                    value={formData.shift_id}
                                    onChange={(e) => setFormData({ ...formData, shift_id: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none appearance-none`}
                                >
                                    <option value="">Select Shift</option>
                                    {shifts
                                        .filter(s => !formData.instansi_id || s.instansi_id.toString() === formData.instansi_id)
                                        .map(s => (
                                            <option key={s.id} value={s.id}>{s.nama} ({s.jam_masuk.substring(0, 5)}-{s.jam_pulang.substring(0, 5)})</option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>PIN (ID Mesin)</label>
                                <input
                                    required
                                    value={formData.pin}
                                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none`}
                                    placeholder="Ex: 100"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>NIK</label>
                                <input
                                    required
                                    value={formData.nik}
                                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none`}
                                    placeholder="Ex: 170845"
                                />
                            </div>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Full Name</label>
                            <input
                                required
                                value={formData.nama}
                                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none`}
                                placeholder="Nama lengkap"
                            />
                        </div>

                        <div>
                            <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Departemen</label>
                            <select
                                value={formData.departemen_id}
                                onChange={(e) => {
                                    const selectedDept = departemens.find(d => d.id.toString() === e.target.value);
                                    setFormData({
                                        ...formData,
                                        departemen_id: e.target.value,
                                        departemen: selectedDept ? selectedDept.nama : ''
                                    });
                                }}
                                className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none appearance-none`}
                            >
                                <option value="">Select Departemen</option>
                                {departemens.map(d => (
                                    <option key={d.id} value={d.id}>{d.nama}</option>
                                ))}
                            </select>
                        </div>

                        <div className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-4 border-t ${theme.cardBorder}`}>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/karyawan')}
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
                                {saving ? 'Saving...' : 'Save Karyawan'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default KaryawanFormPage;
