import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Building2, Plus, Search, Edit, Trash2, Phone, Mail, X, Save, FileText, Hash
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';
import { usePermissions } from '../hooks/usePermissions';

interface Instansi {
    id: number;
    kode: string;
    nama: string;
    alamat: string | null;
    telepon: string | null;
    email: string | null;
    api_key?: string | null;
    hari_kerja?: string | null;
    jam_masuk?: string | null;
    jam_pulang?: string | null;
}

const InstansiManagement = () => {
    const { theme, isDarkMode } = useTheme();
    const navigate = useNavigate();
    const { hasOperation, loading: permsLoading } = usePermissions();

    const canView = hasOperation('instansi', 'view');
    const canAdd = hasOperation('instansi', 'add');
    const canEdit = hasOperation('instansi', 'edit');
    const canDelete = hasOperation('instansi', 'delete');
    const canViewLeaves = hasOperation('leaves', 'view');

    const [instansis, setInstansis] = useState<Instansi[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInstansi, setEditingInstansi] = useState<Instansi | null>(null);
    const [formData, setFormData] = useState({
        kode: '',
        nama: '',
        alamat: '',
        telepon: '',
        email: ''
    });

    const token = localStorage.getItem('token');

    // Fetch Data
    useEffect(() => {
        fetchInstansi();
    }, [token]);

    const fetchInstansi = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/instansi`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInstansis(response.data);
        } catch (error) {
            console.error('Failed to fetch instansi', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus instansi ini?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/instansi/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInstansis(instansis.filter(i => i.id !== id));
        } catch (error: any) {
            const errRes = error.response?.data;
            const msg = errRes?.details 
                ? `${errRes.error}: ${errRes.details}` 
                : (errRes?.error || 'Failed to delete instansi');
            alert(msg);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingInstansi) {
                await axios.put(`${API_BASE_URL}/api/instansi/${editingInstansi.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_BASE_URL}/api/instansi`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setIsModalOpen(false);
            fetchInstansi();
        } catch (error: any) {
            const errRes = error.response?.data;
            const msg = errRes?.details 
                ? `${errRes.error}: ${errRes.details}` 
                : (errRes?.error || error.message || 'Failed to save instansi');
            alert(msg);
        }
    };

    const openModal = (instansi?: Instansi) => {
        if (instansi) {
            setEditingInstansi(instansi);
            setFormData({
                kode: instansi.kode || '',
                nama: instansi.nama || '',
                alamat: instansi.alamat || '',
                telepon: instansi.telepon || '',
                email: instansi.email || ''
            });
        } else {
            setEditingInstansi(null);
            setFormData({
                kode: '',
                nama: '',
                alamat: '',
                telepon: '',
                email: ''
            });
        }
        setIsModalOpen(true);
    };

    const filtered = instansis.filter(i =>
        (i.nama && i.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (i.kode && i.kode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (i.alamat && i.alamat.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (i.email && i.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Instansi Management</h1>
                    <p className={`${theme.subTextColor}`}>Manage registered institutions, work units, and contacts.</p>
                </div>
            </div>

            {/* Controls */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between transition-colors duration-300`}>
                <div className="relative flex-1 max-w-md">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <input
                        type="text"
                        placeholder="Cari kode, nama instansi, atau alamat..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} pl-10 pr-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                    />
                </div>
                {canAdd && (
                    <button
                        onClick={() => openModal()}
                        className={`flex items-center gap-2 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-red-600 hover:bg-red-700'} text-white px-4 py-2 rounded-lg transition-colors shadow-sm`}
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Instansi
                    </button>
                )}
            </div>

            {/* List */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl overflow-hidden transition-colors duration-300`}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} text-left`}>
                                <th className={`px-6 py-4 text-xs font-semibold ${theme.subTextColor} uppercase`}>Kode</th>
                                <th className={`px-6 py-4 text-xs font-semibold ${theme.subTextColor} uppercase`}>Nama Instansi</th>
                                <th className={`px-6 py-4 text-xs font-semibold ${theme.subTextColor} uppercase`}>Alamat</th>
                                <th className={`px-6 py-4 text-xs font-semibold ${theme.subTextColor} uppercase`}>Kontak</th>
                                <th className={`px-6 py-4 text-xs font-semibold ${theme.subTextColor} uppercase text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-200'}`}>
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Belum ada instansi yang terdaftar.</td></tr>
                            ) : (
                                filtered.map(i => (
                                    <tr key={i.id} className={`${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1 rounded-md ${
                                                isDarkMode ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/50' : 'bg-red-50 text-red-700 border border-red-200'
                                            }`}>
                                                <Hash className="w-3 h-3 opacity-60" />
                                                {i.kode || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-red-100 text-red-600'}`}>
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className={`${theme.headingColor} font-semibold`}>{i.nama}</div>
                                                    {i.hari_kerja && (
                                                        <div className="text-xs text-gray-400 mt-0.5">Hari kerja: {i.hari_kerja}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 ${theme.subTextColor} text-sm max-w-xs truncate`}>
                                            {i.alamat || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1 text-xs">
                                                {i.telepon && (
                                                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                                        <Phone className="w-3.5 h-3.5" />
                                                        <span>{i.telepon}</span>
                                                    </div>
                                                )}
                                                {i.email && (
                                                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                                        <Mail className="w-3.5 h-3.5" />
                                                        <span>{i.email}</span>
                                                    </div>
                                                )}
                                                {!i.telepon && !i.email && (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {canEdit && (
                                                    <button 
                                                        onClick={() => openModal(i)} 
                                                        title="Edit Instansi"
                                                        className={`p-2 ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'} rounded-lg transition-colors`}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canViewLeaves && (
                                                    <button
                                                        onClick={() => navigate(`/dashboard/izin?instansi_id=${i.id}`)}
                                                        title="Lihat Data Cuti/Izin Instansi Ini"
                                                        className={`p-2 ${isDarkMode ? 'text-blue-400 hover:text-blue-300 hover:bg-white/5' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'} rounded-lg transition-colors`}
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button 
                                                        onClick={() => handleDelete(i.id)} 
                                                        title="Hapus Instansi"
                                                        className={`p-2 ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-white/5' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'} rounded-lg transition-colors`}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl w-full max-w-lg overflow-hidden shadow-xl transition-colors duration-300`}>
                        <div className={`flex justify-between items-center p-6 border-b ${theme.cardBorder}`}>
                            <h2 className={`text-xl font-bold ${theme.headingColor}`}>
                                {editingInstansi ? 'Edit Instansi' : 'Tambah Instansi Baru'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className={`${theme.subTextColor} hover:${theme.headingColor}`}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>
                                    Kode Instansi <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={formData.kode}
                                    onChange={e => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none font-mono uppercase`}
                                    placeholder="Contoh: SMK01, UNTG02, atau 007"
                                />
                                <p className="text-xs text-gray-400 mt-1">Kode unik identifikasi instansi (maksimal 20 karakter).</p>
                            </div>

                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>
                                    Nama Instansi <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={formData.nama}
                                    onChange={e => setFormData({ ...formData, nama: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                    placeholder="Contoh: SMK Sritanjung Banyuwangi"
                                />
                            </div>

                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Alamat</label>
                                <textarea
                                    rows={3}
                                    value={formData.alamat}
                                    onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none resize-none`}
                                    placeholder="Contoh: Jl. Brawijaya No. 12, Banyuwangi"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Telepon</label>
                                    <input
                                        type="tel"
                                        value={formData.telepon}
                                        onChange={e => setFormData({ ...formData, telepon: e.target.value })}
                                        className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                        placeholder="081234567890"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                        placeholder="admin@smksritanjung.sch.id"
                                    />
                                </div>
                            </div>

                            <div className={`flex justify-end gap-3 pt-6 border-t ${theme.cardBorder} mt-2`}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className={`px-4 py-2 ${theme.subTextColor} hover:${theme.headingColor} transition-colors`}>
                                    Batal
                                </button>
                                <button type="submit" className={`flex items-center gap-2 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-red-600 hover:bg-red-700'} text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-sm`}>
                                    <Save className="w-4 h-4" />
                                    Simpan Instansi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstansiManagement;
