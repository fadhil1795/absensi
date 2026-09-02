import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Cpu, Plus, Search, Edit, Trash2, Globe, MapPin,
    Wifi, WifiOff, RefreshCw, Server, Building2, X, Save, DownloadCloud
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface Mesin {
    id: number;
    nama_mesin: string; // Updated from nama
    sn: string;
    instansi_id: number;
    instansi_nama?: string;
    lokasi: string;
    ip_address: string;
    tipe_mesin: 'FINGERPRINT' | 'FACE' | 'RFID';
    status: 'AKTIF' | 'NONAKTIF';
    is_online: boolean;
    last_sync: string | null;
    timezone: string;
}

interface Instansi {
    id: number;
    nama: string;
}

const MesinManagement = () => {
    const { theme, isDarkMode } = useTheme();
    const [mesins, setMesins] = useState<Mesin[]>([]);
    const [instansis, setInstansis] = useState<Instansi[]>([]);
    const [, setLoading] = useState(true);
    const [selectedInstansi, setSelectedInstansi] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMesin, setEditingMesin] = useState<Mesin | null>(null);
    const [formData, setFormData] = useState({
        nama: '',
        sn: '',
        instansi_id: '',
        lokasi: '',
        ip_address: '',
        tipe_mesin: 'FINGERPRINT',
        status: 'AKTIF',
        timezone: 'Asia/Jakarta'
    });

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = user.role === 'SUPER_ADMIN';

    // Fetch Initial Data
    useEffect(() => {
        const fetchInit = async () => {
            try {
                if (isSuperAdmin) {
                    const instRes = await axios.get(`${API_BASE_URL}/api/instansi`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setInstansis(instRes.data);
                }
            } catch (e) { console.error(e); }
        };
        fetchInit();
    }, [isSuperAdmin, token]);

    const fetchMesins = async () => {
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/api/mesin`;
            if (selectedInstansi) url += `?instansi_id=${selectedInstansi}`;

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMesins(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMesins();
    }, [selectedInstansi]);

    // Actions
    const handlePing = async (id: number) => {
        try {
            await axios.post(`${API_BASE_URL}/api/mesin/check-connection/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMesins(); // Refresh to show new status
            alert('Connection status updated');
        } catch (error) {
            alert('Failed to ping machine');
        }
    };

    const handleSync = async (id: number) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/mesin/sync/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMesins(); // Refresh to show new sync time
            alert(`Sync Successful: ${response.data.message}`);
        } catch (error) {
            alert('Failed to sync data from machine');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to deactivate this machine?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/mesin/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMesins();
        } catch (error) {
            alert('Failed to delete machine');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingMesin) {
                await axios.put(`${API_BASE_URL}/api/mesin/${editingMesin.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_BASE_URL}/api/mesin`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setIsModalOpen(false);
            fetchMesins();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to save machine');
        }
    };

    const openModal = (mesin?: Mesin) => {
        if (mesin) {
            setEditingMesin(mesin);
            setFormData({
                nama: mesin.nama_mesin,
                sn: mesin.sn,
                instansi_id: mesin.instansi_id.toString(),
                lokasi: mesin.lokasi || '',
                ip_address: mesin.ip_address || '',
                tipe_mesin: mesin.tipe_mesin as any,
                status: mesin.status as any,
                timezone: mesin.timezone
            });
        } else {
            setEditingMesin(null);
            setFormData({
                nama: '',
                sn: '',
                instansi_id: isSuperAdmin ? '' : user.instansi_id,
                lokasi: '',
                ip_address: '',
                tipe_mesin: 'FINGERPRINT',
                status: 'AKTIF',
                timezone: 'Asia/Jakarta'
            });
        }
        setIsModalOpen(true);
    };

    const filtered = mesins.filter(m =>
        m.nama_mesin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.sn.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeCount = mesins.filter(m => m.status === 'AKTIF').length;
    const onlineCount = mesins.filter(m => m.is_online).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Mesin Absensi</h1>
                    <p className={`${theme.subTextColor}`}>Manage attendance devices and connectivity.</p>
                </div>
                <div className="flex gap-4">
                    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} px-4 py-2 rounded-lg flex items-center gap-3 border ${theme.cardBorder}`}>
                        <Wifi className="w-4 h-4 text-emerald-400" />
                        <span className={`text-sm ${theme.subTextColor}`}>Online: <strong className={theme.headingColor}>{onlineCount}</strong></span>
                    </div>
                    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} px-4 py-2 rounded-lg flex items-center gap-3 border ${theme.cardBorder}`}>
                        <Server className="w-4 h-4 text-blue-400" />
                        <span className={`text-sm ${theme.subTextColor}`}>Total: <strong className={theme.headingColor}>{activeCount}</strong></span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between transition-colors duration-300`}>
                <div className="flex flex-1 gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.subTextColor}`} />
                        <input
                            type="text"
                            placeholder="Search by IP, Name, or SN..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} pl-10 pr-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                        />
                    </div>
                    {isSuperAdmin && (
                        <div className="relative w-64">
                            <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.subTextColor}`} />
                            <select
                                value={selectedInstansi}
                                onChange={e => setSelectedInstansi(e.target.value)}
                                className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} pl-10 pr-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none appearance-none`}
                            >
                                <option value="">All Instances</option>
                                {instansis.map(i => <option key={i.id} value={i.id}>{i.nama}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => openModal()}
                    className={`flex items-center gap-2 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : `bg-${theme.primary}-600 hover:bg-${theme.primary}-500`} text-white px-4 py-2 rounded-lg transition-colors`}
                >
                    <Plus className="w-4 h-4" />
                    Add Mesin
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(m => (
                    <div key={m.id} className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-5 hover:border-${theme.primary}-500/30 transition-all group relative overflow-hidden`}>
                        {/* Status Bar */}
                        <div className={`absolute top-0 left-0 w-1 h-full ${m.is_online ? 'bg-emerald-500' : 'bg-red-500/50'}`} />

                        <div className="pl-3">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className={`font-bold ${theme.headingColor} text-lg flex items-center gap-2`}>
                                        {m.nama_mesin}
                                        {m.status === 'NONAKTIF' && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Disabled</span>}
                                    </h3>
                                    <p className={`text-sm ${theme.subTextColor} font-mono`}>{m.sn}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleSync(m.id)} title="Tarik Data (Sync)" className={`p-2 ${theme.subTextColor} hover:text-blue-400 hover:${isDarkMode ? 'bg-white/5' : 'bg-black/5'} rounded-lg`}>
                                        <DownloadCloud className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handlePing(m.id)} title="Check Connection" className={`p-2 ${theme.subTextColor} hover:text-emerald-400 hover:${isDarkMode ? 'bg-white/5' : 'bg-black/5'} rounded-lg`}>
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => openModal(m)} className={`p-2 ${theme.subTextColor} hover:${theme.headingColor} hover:${isDarkMode ? 'bg-white/5' : 'bg-black/5'} rounded-lg`}>
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(m.id)} className={`p-2 ${theme.subTextColor} hover:text-red-400 hover:${isDarkMode ? 'bg-white/5' : 'bg-black/5'} rounded-lg`}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className={`space-y-2 mt-4 text-sm ${theme.subTextColor}`}>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2"><Globe className="w-3 h-3" /> IP Address</span>
                                    <span className={`${theme.headingColor} font-mono`}>{m.ip_address || '-'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2"><MapPin className="w-3 h-3" /> Location</span>
                                    <span className={theme.headingColor}>{m.lokasi || '-'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2"><Cpu className="w-3 h-3" /> Type</span>
                                    <span className={theme.headingColor}>{m.tipe_mesin}</span>
                                </div>
                                {isSuperAdmin && (
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2"><Building2 className="w-3 h-3" /> Instansi</span>
                                        <span className={`${isDarkMode ? 'text-indigo-400' : `text-${theme.primary}-600`}`}>{m.instansi_nama}</span>
                                    </div>
                                )}
                            </div>

                            <div className={`mt-4 pt-3 border-t ${theme.cardBorder} flex justify-between items-center text-xs`}>
                                <div className={`flex items-center gap-1.5 ${m.is_online ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {m.is_online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                    {m.is_online ? 'Online' : 'Offline'}
                                </div>
                                <span className={theme.subTextColor}>
                                    Sync: {m.last_sync ? new Date(m.last_sync).toLocaleTimeString() : 'Never'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl w-full max-w-2xl overflow-hidden shadow-xl transition-colors duration-300`}>
                        <div className={`flex justify-between items-center p-6 border-b ${theme.cardBorder}`}>
                            <h2 className={`text-xl font-bold ${theme.headingColor}`}>
                                {editingMesin ? 'Edit Mesin Absensi' : 'Add New Mesin'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className={`${theme.subTextColor} hover:${theme.headingColor}`}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Nama Mesin</label>
                                    <input required type="text" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })} className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`} />
                                </div>
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Serial Number (SN)</label>
                                    <input required type="text" value={formData.sn} onChange={e => setFormData({ ...formData, sn: e.target.value })} className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`} placeholder="Unique Serial Number" />
                                </div>
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>IP Address</label>
                                    <input type="text" value={formData.ip_address} onChange={e => setFormData({ ...formData, ip_address: e.target.value })} className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`} placeholder="192.168.1.xxx" />
                                </div>
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Timezone</label>
                                    <select value={formData.timezone} onChange={e => setFormData({ ...formData, timezone: e.target.value })} className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}>
                                        <option value="Asia/Jakarta">WIB (Jakarta)</option>
                                        <option value="Asia/Makassar">WITA (Makassar)</option>
                                        <option value="Asia/Jayapura">WIT (Jayapura)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {isSuperAdmin && (
                                    <div>
                                        <label className={`block text-sm ${theme.subTextColor} mb-1`}>Instansi</label>
                                        <select required value={formData.instansi_id} onChange={e => setFormData({ ...formData, instansi_id: e.target.value })} className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`} disabled={!!editingMesin}>
                                            <option value="">Select Instansi</option>
                                            {instansis.map(i => <option key={i.id} value={i.id}>{i.nama}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Lokasi Mesin</label>
                                    <input type="text" value={formData.lokasi} onChange={e => setFormData({ ...formData, lokasi: e.target.value })} className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`} placeholder="Lobby Utama" />
                                </div>
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Tipe Mesin</label>
                                    <select value={formData.tipe_mesin} onChange={e => setFormData({ ...formData, tipe_mesin: e.target.value as any })} className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}>
                                        <option value="FINGERPRINT">Fingerprint</option>
                                        <option value="FACE">Face Recognition</option>
                                        <option value="RFID">RFID Card</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Status</label>
                                    <div className="flex gap-4 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="status" value="AKTIF" checked={formData.status === 'AKTIF'} onChange={() => setFormData({ ...formData, status: 'AKTIF' })} className="accent-emerald-500" />
                                            <span className={theme.headingColor}>Aktif</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="status" value="NONAKTIF" checked={formData.status === 'NONAKTIF'} onChange={() => setFormData({ ...formData, status: 'NONAKTIF' })} className="accent-red-500" />
                                            <span className={theme.headingColor}>Nonaktif</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className={`col-span-1 md:col-span-2 flex justify-end gap-3 pt-4 border-t ${theme.cardBorder}`}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className={`px-4 py-2 ${theme.subTextColor} hover:${theme.headingColor} transition-colors`}>Cancel</button>
                                <button type="submit" className={`flex items-center gap-2 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : `bg-${theme.primary}-600 hover:bg-${theme.primary}-500`} text-white px-6 py-2 rounded-lg transition-colors`}>
                                    <Save className="w-4 h-4" />
                                    Save Machine
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MesinManagement;
