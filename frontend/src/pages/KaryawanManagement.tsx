import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Edit, Trash2, User, Briefcase, Building2, Upload, Clock } from 'lucide-react';
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
}

interface Instansi {
    id: number;
    nama: string;
}

const KaryawanManagement = () => {
    const { theme, isDarkMode } = useTheme();
    const [karyawans, setKaryawans] = useState<Karyawan[]>([]);
    const [instansis, setInstansis] = useState<Instansi[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInstansi, setSelectedInstansi] = useState<string>('');
    const navigate = useNavigate();

    const token = localStorage.getItem('token');

    const fetchData = async () => {
        try {
            const [karyawanRes, instansiRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/karyawan`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_BASE_URL}/api/instansi`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setKaryawans(karyawanRes.data);
            setInstansis(instansiRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredKaryawans = karyawans.filter(k => {
        const matchesSearch = k.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
            k.nik.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesInstansi = selectedInstansi ? k.instansi_id.toString() === selectedInstansi : true;
        return matchesSearch && matchesInstansi;
    });

    const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            const lines = text.split('\n');
            const data = lines
                .slice(1) // Skip header assuming it exists, or check first line
                .filter(line => line.trim() !== '')
                .map(line => {
                    const [pin, nik, nama, departemen, instansi_id] = line.split(',');
                    return {
                        pin: pin?.trim(),
                        nik: nik?.trim(),
                        nama: nama?.trim(),
                        departemen: departemen?.trim(),
                        instansi_id: instansi_id?.trim()
                    };
                })
                .filter(item => item.pin && item.nik && item.nama && item.instansi_id); // Basic validation

            if (data.length === 0) {
                alert('No valid data found in CSV.');
                return;
            }

            try {
                await axios.post(`${API_BASE_URL}/api/karyawan/bulk`, data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                alert('Employees imported successfully!');
                fetchData();
            } catch (error: any) {
                console.error('Error importing CSV:', error);
                alert(error.response?.data?.error || 'Failed to import CSV');
            }
        };
        reader.readAsText(file);
        // Reset input
        event.target.value = '';
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this karyawan?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/karyawan/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error('Error deleting karyawan:', error);
            alert('Failed to delete karyawan');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Karyawan Management</h1>
                    <p className={`${theme.subTextColor}`}>Manage employees across all instances.</p>
                </div>
                <div className="flex gap-3">
                    <label className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer">
                        <Upload className="w-4 h-4" />
                        Import CSV
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </label>
                    <button
                        onClick={() => navigate('/dashboard/karyawan/new')}
                        className={`flex items-center gap-2 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-red-600 hover:bg-red-700'} text-white px-4 py-2 rounded-lg transition-colors`}
                    >
                        <Plus className="w-4 h-4" />
                        Add Karyawan
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-xl flex flex-col md:flex-row gap-4 transition-colors duration-300`}>
                <div className="relative flex-1">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <input
                        type="text"
                        placeholder="Search by Name or NIK..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} pl-10 pr-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                    />
                </div>
                <div className="relative w-full md:w-64">
                    <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <select
                        value={selectedInstansi}
                        onChange={(e) => setSelectedInstansi(e.target.value)}
                        className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} pl-10 pr-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none appearance-none cursor-pointer`}
                    >
                        <option value="">All Instances</option>
                        {instansis.map(i => (
                            <option key={i.id} value={i.id}>{i.nama}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl overflow-hidden transition-colors duration-300`}>
                <table className="w-full text-left">
                    <thead className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'} ${theme.subTextColor} text-xs uppercase tracking-wider`}>
                        <tr>
                            <th className="px-6 py-4">Karyawan (PIN / NIK)</th>
                            <th className="px-6 py-4">Departemen / Shift</th>
                            <th className="px-6 py-4">Instansi</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-200'}`}>
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading data...</td></tr>
                        ) : filteredKaryawans.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No employees found</td></tr>
                        ) : (
                            filteredKaryawans.map((k) => (
                                <tr key={k.id} className={`${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-red-100 text-red-600'} flex items-center justify-center`}>
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className={`${theme.headingColor} font-medium`}>{k.nama}</p>
                                                <p className={`text-xs ${theme.subTextColor}`}>PIN: {k.pin} | NIK: {k.nik}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={`px-6 py-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-2"><Briefcase className="w-3 h-3 text-gray-500" /> {k.departemen || '-'}</span>
                                            {k.shift_nama && (
                                                <span className={`flex items-center gap-2 text-xs ${isDarkMode ? 'text-indigo-400' : 'text-red-500'}`}><Clock className="w-3 h-3" /> {k.shift_nama}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-red-100 text-red-600'}`}>
                                            {k.instansi_nama || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/dashboard/karyawan/edit/${k.id}`)}
                                                className={`p-2 ${isDarkMode ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'} rounded-lg transition-colors`}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(k.id)}
                                                className={`p-2 ${isDarkMode ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'} rounded-lg transition-colors`}
                                            >
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
    );
};

export default KaryawanManagement;
