
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Edit2, Trash2, X, LayoutGrid } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface Departemen {
    id: number;
    nama: string;
    // karyawan_id: number | null; // Optional if we want to keep it in type for safety effectively unused
    // manager_nama: string | null;
    created_at: string;
}

const DepartemenManagement = () => {
    const { theme, isDarkMode } = useTheme();
    const [departemens, setDepartemens] = useState<Departemen[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        id: 0,
        nama: ''
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 10;

    const token = localStorage.getItem('token');

    const fetchDepartemens = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/api/departemen`, {
                params: {
                    page: currentPage,
                    limit: itemsPerPage,
                    search: searchTerm
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setDepartemens(res.data.data);
            setTotalPages(Math.ceil(res.data.total / itemsPerPage));
        } catch (error) {
            console.error('Failed to fetch departemens', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartemens();
    }, [currentPage, searchTerm, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                nama: formData.nama,
            };

            if (isEditMode) {
                await axios.put(`${API_BASE_URL}/api/departemen/${formData.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_BASE_URL}/api/departemen`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setIsModalOpen(false);
            fetchDepartemens();
            resetForm();
        } catch (error: any) {
            console.error('Failed to save departemen', error);
            const status = error.response?.status;
            const data = error.response?.data;
            const errMsg = data?.error || error.message;
            alert(`Error: ${errMsg}\nStatus: ${status}\nData: ${JSON.stringify(data)}`);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this department?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/departemen/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchDepartemens();
        } catch (error: any) {
            console.error('Failed to delete departemen', error);
            const msg = error.response?.data?.error || 'Failed to delete departemen';
            alert(msg);
        }
    };

    const resetForm = () => {
        setFormData({ id: 0, nama: '' });
        setIsEditMode(false);
    };

    const openEditModal = (dept: Departemen) => {
        setFormData({
            id: dept.id,
            nama: dept.nama,
        });
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className={`flex items-center gap-2 ${theme.subTextColor} text-sm mb-1`}>
                        <span>Departemens</span>
                        <span>&gt;</span>
                        <span>List</span>
                    </div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Departemens</h1>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className={`bg-${theme.primary}-600 hover:bg-${theme.primary}-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors`}
                >
                    <Plus size={20} />
                    <span>New departemen</span>
                </button>
            </div>

            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl overflow-hidden transition-colors duration-300`}>
                <div className={`p-4 border-b ${theme.cardBorder} flex gap-4`}>
                    <div className="relative flex-1 max-w-md">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.subTextColor}`} size={20} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full ${isDarkMode ? 'bg-[#131720] text-gray-200' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-${theme.primary}-500`}
                        />
                    </div>
                    <button className={`p-2 ${theme.subTextColor} hover:${theme.headingColor} rounded-lg hover:${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <LayoutGrid size={20} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`border-b ${theme.cardBorder} ${theme.subTextColor} text-sm`}>
                                <th className="p-4 w-10">
                                    <input type="checkbox" className={`rounded ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-200 border-gray-300'}`} />
                                </th>
                                <th className="p-4 font-medium">Name</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-400">Loading...</td>
                                </tr>
                            ) : departemens.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-400">No departments found</td>
                                </tr>
                            ) : (
                                departemens.map((dept) => (
                                    <tr key={dept.id} className={`border-b ${theme.cardBorder} ${isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors`}>
                                        <td className="p-4">
                                            <input type="checkbox" className={`rounded ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-200 border-gray-300'}`} />
                                        </td>
                                        <td className={`p-4 font-medium ${theme.headingColor}`}>{dept.nama}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(dept)}
                                                    className={`p-1.5 ${isDarkMode ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-100'} rounded flex items-center gap-1`}
                                                >
                                                    <Edit2 size={16} />
                                                    <span className="text-sm">Edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(dept.id)}
                                                    className={`p-1.5 ${isDarkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-100'} rounded`}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className={`p-4 border-t ${theme.cardBorder} flex items-center justify-between text-sm ${theme.subTextColor}`}>
                    <p>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, departemens.length + ((currentPage - 1) * itemsPerPage))} of many results</p>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 ${isDarkMode ? 'bg-[#131720]' : 'bg-gray-50'} border ${theme.cardBorder} rounded-lg`}>Per page 10</span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-1 ${isDarkMode ? 'bg-[#131720] hover:bg-gray-800' : 'bg-gray-50 hover:bg-gray-100'} border ${theme.cardBorder} rounded-lg disabled:opacity-50`}
                            >
                                Prev
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    className={`px-3 py-1 border ${theme.cardBorder} rounded-lg ${currentPage === p ? `bg-${theme.primary}-600 text-white border-${theme.primary}-600` : `${isDarkMode ? 'bg-[#131720] hover:bg-gray-800' : 'bg-gray-50 hover:bg-gray-100'}`}`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-1 ${isDarkMode ? 'bg-[#131720] hover:bg-gray-800' : 'bg-gray-50 hover:bg-gray-100'} border ${theme.cardBorder} rounded-lg disabled:opacity-50`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl w-full max-w-md p-6 transition-colors duration-300`}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className={`text-xl font-bold ${theme.headingColor}`}>
                                {isEditMode ? 'Edit Departemen' : 'New Departemen'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className={`${theme.subTextColor} hover:${theme.headingColor}`}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>
                                    Nama Departemen
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nama}
                                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-[#131720] text-white' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded-lg px-4 py-2 focus:outline-none focus:border-${theme.primary}-500`}
                                    placeholder="e.g. Teknologi Informasi"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className={`px-4 py-2 ${theme.subTextColor} hover:${theme.headingColor}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`bg-${theme.primary}-600 hover:bg-${theme.primary}-700 text-white px-4 py-2 rounded-lg`}
                                >
                                    {isEditMode ? 'Save Changes' : 'Create Departemen'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartemenManagement;
