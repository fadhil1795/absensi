import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Clock, Save, X, Building2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface Shift {
    id: number;
    nama: string;
    jam_masuk: string;
    jam_pulang: string;
    min_jam_kerja: number;
    toleransi_keterlambatan: number;
    instansi_id?: number;
}

interface Instansi {
    id: number;
    nama: string;
}

const ShiftManagement = () => {
    const { theme, isDarkMode } = useTheme();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [instansis, setInstansis] = useState<Instansi[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);

    const [selectedInstansi, setSelectedInstansi] = useState('');

    const [formData, setFormData] = useState({
        nama: '',
        jam_masuk: '08:00',
        min_jam_kerja: 8,
        toleransi_keterlambatan: 0,
        jam_pulang: '16:00',
        instansi_id: ''
    });

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    // Fetch Instansi for Super Admin
    useEffect(() => {
        if (isSuperAdmin) {
            axios.get(`${API_BASE_URL}/api/instansi`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => setInstansis(res.data))
                .catch(err => console.error(err));
        }
    }, [isSuperAdmin, token]);

    const fetchShifts = async () => {
        setLoading(true);
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/api/shifts`;
            if (selectedInstansi) {
                url += `?instansi_id=${selectedInstansi}`;
            }
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShifts(response.data);
        } catch (error) {
            console.error('Error fetching shifts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShifts();
    }, [selectedInstansi]);

    // Auto-calc jam pulang
    useEffect(() => {
        const [h, m] = formData.jam_masuk.split(':').map(Number);
        if (!isNaN(h)) {
            const endH = (h + parseInt(formData.min_jam_kerja as any)) % 24;
            const p = (n: number) => n.toString().padStart(2, '0');
            setFormData(prev => ({ ...prev, jam_pulang: `${p(endH)}:${p(m || 0)}` }));
        }
    }, [formData.jam_masuk, formData.min_jam_kerja]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // If Super Admin and no instance selected for new shift, warn
        if (isSuperAdmin && !editingShift && !formData.instansi_id) {
            alert('Please select an Instansi');
            return;
        }

        try {
            if (editingShift) {
                await axios.put(`${API_BASE_URL}/api/shifts/${editingShift.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_BASE_URL}/api/shifts`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchShifts();
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error('Error saving shift:', error);
            alert('Failed to save shift');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this shift?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/shifts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchShifts();
        } catch (error) {
            console.error('Error deleting shift:', error);
            alert('Failed to delete shift');
        }
    };

    const handleEdit = (shift: Shift) => {
        setEditingShift(shift);
        setFormData({
            nama: shift.nama,
            jam_masuk: shift.jam_masuk.substring(0, 5),
            jam_pulang: shift.jam_pulang.substring(0, 5),
            min_jam_kerja: shift.min_jam_kerja,
            toleransi_keterlambatan: shift.toleransi_keterlambatan,
            instansi_id: shift.instansi_id ? shift.instansi_id.toString() : ''
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingShift(null);
        setFormData({
            nama: '',
            jam_masuk: '08:00',
            min_jam_kerja: 8,
            toleransi_keterlambatan: 0,
            jam_pulang: '16:00',
            instansi_id: selectedInstansi || '' // Auto-fill if filter active
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Manajemen Sesi / Mapel</h1>
                    <p className={`${theme.subTextColor}`}>Kelola Sesi Kegiatan Belajar Mengajar (KBM) dan Mata Pelajaran.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    {isSuperAdmin && (
                        <div className="relative flex-1 md:w-64">
                            <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.subTextColor}`} />
                            <select
                                value={selectedInstansi}
                                onChange={(e) => setSelectedInstansi(e.target.value)}
                                className={`w-full ${isDarkMode ? 'bg-[#1A1D21] text-white' : 'bg-gray-50 text-gray-900'} pl-10 pr-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none appearance-none cursor-pointer`}
                            >
                                <option value="">All Instances</option>
                                {instansis.map(i => (
                                    <option key={i.id} value={i.id}>{i.nama}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className={`flex items-center gap-2 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : `bg-${theme.primary}-600 hover:bg-${theme.primary}-500`} text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap`}
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Sesi/Mapel
                    </button>
                </div>
            </div>

            {/* Shift List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="text-gray-400">Loading...</div>
                ) : shifts.length === 0 ? (
                    <div className="text-gray-400">No shifts found. Create one to get started.</div>
                ) : (
                    shifts.map(shift => (
                        <div key={shift.id} className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-5 hover:border-${theme.primary}-500/50 transition-colors`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className={`text-lg font-bold ${theme.headingColor}`}>{shift.nama}</h3>
                                    <div className={`flex items-center gap-2 text-sm ${theme.subTextColor} mt-1`}>
                                        <Clock className="w-4 h-4" />
                                        {shift.jam_masuk?.substring(0, 5)} - {shift.jam_pulang?.substring(0, 5)}
                                    </div>
                                    {isSuperAdmin && shift.instansi_id && (
                                        <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                                            {instansis.find(i => i.id === shift.instansi_id)?.nama || 'Unknown Instansi'}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(shift)} className={`p-2 ${theme.subTextColor} hover:${theme.headingColor} hover:${isDarkMode ? 'bg-white/5' : 'bg-black/5'} rounded-lg`}>
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(shift.id)} className={`p-2 ${theme.subTextColor} hover:text-red-400 hover:${isDarkMode ? 'bg-white/5' : 'bg-black/5'} rounded-lg`}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className={`space-y-2 text-sm ${theme.subTextColor}`}>
                                <div className="flex justify-between">
                                    <span>Min Work Hours:</span>
                                    <span className={theme.headingColor}>{shift.min_jam_kerja} hrs</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tolerance:</span>
                                    <span className={theme.headingColor}>{shift.toleransi_keterlambatan} mins</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl w-full max-w-md overflow-hidden transition-colors duration-300`}>
                        <div className={`flex justify-between items-center p-6 border-b ${theme.cardBorder}`}>
                            <h2 className={`text-xl font-bold ${theme.headingColor}`}>
                                {editingShift ? 'Edit Sesi/Mapel' : 'Tambah Sesi/Mapel'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className={`${theme.subTextColor} hover:${theme.headingColor}`}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {isSuperAdmin && (
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Instansi</label>
                                    <select
                                        required
                                        value={formData.instansi_id}
                                        onChange={(e) => setFormData({ ...formData, instansi_id: e.target.value })}
                                        className={`w-full ${isDarkMode ? 'bg-[#111315] text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none appearance-none`}
                                        disabled={!!editingShift} // Maybe allow moving shifts? For now lock it.
                                    >
                                        <option value="">Select Instansi</option>
                                        {instansis.map(i => (
                                            <option key={i.id} value={i.id}>{i.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className={`block text-sm ${theme.subTextColor} mb-1`}>Nama Sesi / Mata Pelajaran</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nama}
                                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                    placeholder="e.g. Matematika Kls X"
                                    className={`w-full ${isDarkMode ? 'bg-[#111315] text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Jam Masuk</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.jam_masuk}
                                        onChange={(e) => setFormData({ ...formData, jam_masuk: e.target.value })}
                                        className={`w-full ${isDarkMode ? 'bg-[#111315] text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Min Hours</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="24"
                                        value={formData.min_jam_kerja}
                                        onChange={(e) => setFormData({ ...formData, min_jam_kerja: parseInt(e.target.value) })}
                                        className={`w-full ${isDarkMode ? 'bg-[#111315] text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Tolerance (Mins)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.toleransi_keterlambatan}
                                        onChange={(e) => setFormData({ ...formData, toleransi_keterlambatan: parseInt(e.target.value) })}
                                        className={`w-full ${isDarkMode ? 'bg-[#111315] text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Est. Pulang</label>
                                    <input
                                        type="time"
                                        readOnly
                                        value={formData.jam_pulang}
                                        className={`w-full ${isDarkMode ? 'bg-gray-800/50 text-gray-500' : 'bg-gray-200 text-gray-500'} px-4 py-2 rounded-lg border ${theme.cardBorder} outline-none cursor-not-allowed`}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className={`px-4 py-2 ${theme.subTextColor} hover:${theme.headingColor} transition-colors`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`flex items-center gap-2 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : `bg-${theme.primary}-600 hover:bg-${theme.primary}-500`} text-white px-6 py-2 rounded-lg transition-colors`}
                                >
                                    <Save className="w-4 h-4" />
                                    Simpan Sesi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftManagement;
