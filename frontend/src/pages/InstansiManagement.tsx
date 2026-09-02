import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Building2, Plus, Search, Edit, Trash2, MapPin, Globe, X, Save, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface Instansi {
    id: number;
    nama: string;
    alamat: string;
    latitude: string | null;
    longitude: string | null;
    ip_address: string | null;
}

const InstansiManagement = () => {
    const { theme, isDarkMode } = useTheme();
    const navigate = useNavigate();
    const [instansis, setInstansis] = useState<Instansi[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInstansi, setEditingInstansi] = useState<Instansi | null>(null);
    const [formData, setFormData] = useState({
        nama: '',
        alamat: '',
        latitude: '',
        longitude: ''
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
        if (!confirm('Are you sure used want to delete this instansi?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/instansi/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInstansis(instansis.filter(i => i.id !== id));
        } catch (error) {
            alert('Failed to delete instansi');
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
            alert(error.response?.data?.error || 'Failed to save instansi');
        }
    };

    const openModal = (instansi?: Instansi) => {
        if (instansi) {
            setEditingInstansi(instansi);
            setFormData({
                nama: instansi.nama,
                alamat: instansi.alamat,
                latitude: instansi.latitude || '',
                longitude: instansi.longitude || ''
            });
        } else {
            setEditingInstansi(null);
            setFormData({
                nama: '',
                alamat: '',
                latitude: '',
                longitude: ''
            });
        }
        setIsModalOpen(true);
    };

    const filtered = instansis.filter(i =>
        i.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.alamat.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Instansi Management</h1>
                    <p className={`${theme.subTextColor}`}>Manage registered institutions and locations.</p>
                </div>
            </div>

            {/* Controls */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between transition-colors duration-300`}>
                <div className="relative flex-1 max-w-md">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <input
                        type="text"
                        placeholder="Search instansi..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} pl-10 pr-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                    />
                </div>
                <button
                    onClick={() => openModal()}
                    className={`flex items-center gap-2 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-red-600 hover:bg-red-700'} text-white px-4 py-2 rounded-lg transition-colors`}
                >
                    <Plus className="w-4 h-4" />
                    Add Instansi
                </button>
            </div>

            {/* List */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl overflow-hidden transition-colors duration-300`}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} text-left`}>
                                <th className={`px-6 py-4 text-xs font-semibold ${theme.subTextColor} uppercase`}>Name</th>
                                <th className={`px-6 py-4 text-xs font-semibold ${theme.subTextColor} uppercase`}>Address</th>
                                <th className={`px-6 py-4 text-xs font-semibold ${theme.subTextColor} uppercase`}>Coordinates</th>
                                <th className={`px-6 py-4 text-xs font-semibold ${theme.subTextColor} uppercase`}>IP Address</th>
                                <th className={`px-6 py-4 text-xs font-semibold ${theme.subTextColor} uppercase text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-200'}`}>
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No instansi found.</td></tr>
                            ) : (
                                filtered.map(i => (
                                    <tr key={i.id} className={`${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-red-100 text-red-600'}`}>
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div className={`${theme.headingColor} font-medium`}>{i.nama}</div>
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 ${theme.subTextColor} text-sm`}>
                                            {i.alamat}
                                        </td>
                                        <td className="px-6 py-4">
                                            {i.latitude ? (
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <MapPin className="w-3 h-3" />
                                                    {i.latitude}, {i.longitude}
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {i.ip_address ? (
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Globe className="w-3 h-3" />
                                                    {i.ip_address}
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openModal(i)} className={`p-2 ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'} rounded-lg transition-colors`}>
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/dashboard/izin?instansi_id=${i.id}`)}
                                                    title="View Leave Requests"
                                                    className={`p-2 ${isDarkMode ? 'text-blue-400 hover:text-blue-300 hover:bg-white/5' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'} rounded-lg transition-colors`}
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(i.id)} className={`p-2 ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-white/5' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'} rounded-lg transition-colors`}>
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
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
                                {editingInstansi ? 'Edit Instansi' : 'Add New Instansi'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className={`${theme.subTextColor} hover:${theme.headingColor}`}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className={`block text-sm ${theme.subTextColor} mb-1`}>Instansi Name</label>
                                <input required type="text" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })} className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`} placeholder="PT. Example Indonesia" />
                            </div>

                            <div>
                                <label className={`block text-sm ${theme.subTextColor} mb-1`}>Address</label>
                                <textarea required rows={3} value={formData.alamat} onChange={e => setFormData({ ...formData, alamat: e.target.value })} className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`} placeholder="Jl. Sudirman No. 1..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Latitude</label>
                                    <input type="text" value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`} placeholder="-6.200000" />
                                </div>
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Longitude</label>
                                    <input type="text" value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`} placeholder="106.816666" />
                                </div>
                            </div>

                            <div className={`flex justify-end gap-3 pt-6 border-t ${theme.cardBorder} mt-2`}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className={`px-4 py-2 ${theme.subTextColor} hover:${theme.headingColor} transition-colors`}>Cancel</button>
                                <button type="submit" className={`flex items-center gap-2 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-red-600 hover:bg-red-700'} text-white px-6 py-2 rounded-lg transition-colors`}>
                                    <Save className="w-4 h-4" />
                                    Save Instansi
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
