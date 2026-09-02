import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Plus, Trash2, Search, Building2, User, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface Schedule {
    id: number;
    karyawan_id: number;
    shift_id: number;
    tanggal: string;
    instansi_id: number;
    karyawan_nama: string;
    karyawan_nik: string;
    departemen_nama: string;
    shift_nama: string;
    jam_masuk: string;
    jam_pulang: string;
}

interface Departemen {
    id: number;
    nama: string;
}

interface Karyawan {
    id: number;
    nama: string;
    nik: string;
    departemen_id: number;
}

interface Shift {
    id: number;
    nama: string;
    jam_masuk: string;
    jam_pulang: string;
}

const ScheduleManagement = () => {
    const { theme, isDarkMode } = useTheme();
    
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [departemens, setDepartemens] = useState<Departemen[]>([]);
    const [karyawans, setKaryawans] = useState<Karyawan[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    
    // UI States
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Filter States
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
    const [endDate, setEndDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'));
    const [searchFilter, setSearchFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    
    // Form States
    const [formData, setFormData] = useState({
        karyawan_id: '',
        shift_id: '',
        isRange: false,
        tanggal: format(new Date(), 'yyyy-MM-dd'),
        tanggal_mulai: format(new Date(), 'yyyy-MM-dd'),
        tanggal_selesai: format(new Date(), 'yyyy-MM-dd'),
        instansi_id: '',
        filter_dept_modal: '' // helper to filter karyawans in modal
    });

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Fetch initial options
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [deptRes, karRes, shiftRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/departemen?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_BASE_URL}/api/karyawan`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_BASE_URL}/api/shifts`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                
                setDepartemens(deptRes.data.data || []);
                setKaryawans(karRes.data);
                setShifts(shiftRes.data);
            } catch (err) {
                console.error("Error fetching options", err);
            }
        };
        fetchOptions();
    }, []);

    // Fetch schedules
    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (deptFilter) params.append('departemen_id', deptFilter);
            
            const res = await axios.get(`${API_BASE_URL}/api/schedule?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSchedules(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, [startDate, endDate, deptFilter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                karyawan_id: formData.karyawan_id,
                shift_id: formData.shift_id,
                instansi_id: formData.instansi_id || user.instansi_id
            };

            if (formData.isRange) {
                payload.tanggal_mulai = formData.tanggal_mulai;
                payload.tanggal_selesai = formData.tanggal_selesai;
            } else {
                payload.tanggal = formData.tanggal;
            }

            await axios.post(`${API_BASE_URL}/api/schedule`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIsModalOpen(false);
            setFormData(prev => ({ ...prev, karyawan_id: '', shift_id: '' }));
            fetchSchedules();
            alert('Jadwal shift khusus berhasil disimpan.');
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Gagal menyimpan jadwal';
            alert(msg);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus jadwal (override) ini? Karyawan akan kembali ke jadwal default.')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/schedule/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSchedules();
        } catch (error) {
            alert('Gagal menghapus jadwal');
        }
    };

    const filteredSchedules = schedules.filter(s => 
        (s.karyawan_nama?.toLowerCase().includes(searchFilter.toLowerCase()) || 
         s.karyawan_nik?.toLowerCase().includes(searchFilter.toLowerCase()))
    );

    const filteredKaryawanModal = karyawans.filter(k => 
        formData.filter_dept_modal ? k.departemen_id?.toString() === formData.filter_dept_modal : true
    );

    return (
        <div className="space-y-6 flex flex-col min-h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Jadwal & Rolling Shift</h1>
                    <p className={theme.subTextColor}>Atur shift pengganti/insidental untuk karyawan pada hari tertentu.</p>
                </div>
                <button
                    onClick={() => {
                        setFormData(prev => ({...prev, isRange: false, tanggal: format(new Date(), 'yyyy-MM-dd')}));
                        setIsModalOpen(true);
                    }}
                    className={`flex items-center gap-2 bg-${theme.primary}-600 hover:bg-${theme.primary}-500 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap`}
                >
                    <Plus className="w-4 h-4" /> Tambah Rolling
                </button>
            </div>

            {/* Notification Banner */}
            <div className={`p-4 rounded-xl flex items-start gap-4 ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'} border`}>
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <div>
                    <h3 className={`font-semibold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>Informasi Shift Default vs. Rolling</h3>
                    <p className={`text-sm mt-1 leading-relaxed ${isDarkMode ? 'text-indigo-200/80' : 'text-indigo-700/80'}`}>
                        Setiap karyawan sudah memiliki jadwal shift default yang diatur permanen per unit atau per orang. Anda <strong>tidak perlu</strong> mendaftarkan jadwal harian jika karyawan bekerja sesuai shift default-nya. Fitur ini hanya untuk kondisi insidental (misal: penugasan shift beda di hari tertentu, lembur khusus, pergantian jadwal pagi ke sore).
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-xl flex flex-col md:flex-row gap-4 items-end`}>
                <div>
                    <label className={`text-xs ${theme.subTextColor} mb-1 block`}>Dari Tanggal</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`bg-${isDarkMode ? 'gray-800' : 'gray-50'} border ${theme.cardBorder} rounded px-3 py-2 text-sm ${theme.headingColor}`} />
                </div>
                <div>
                    <label className={`text-xs ${theme.subTextColor} mb-1 block`}>Sampai Tanggal</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`bg-${isDarkMode ? 'gray-800' : 'gray-50'} border ${theme.cardBorder} rounded px-3 py-2 text-sm ${theme.headingColor}`} />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className={`text-xs ${theme.subTextColor} mb-1 block`}>Departemen</label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select 
                            value={deptFilter} 
                            onChange={e => setDeptFilter(e.target.value)}
                            className={`w-full bg-${isDarkMode ? 'gray-800' : 'gray-50'} border ${theme.cardBorder} rounded pl-9 pr-3 py-2 text-sm ${theme.headingColor} appearance-none`}
                        >
                            <option value="">Semua Departemen</option>
                            {departemens.map(d => (
                                <option key={d.id} value={d.id}>{d.nama}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex-1 min-w-[250px]">
                    <label className={`text-xs ${theme.subTextColor} mb-1 block`}>Cari Karyawan / NIK</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Cari..." 
                            value={searchFilter} 
                            onChange={e => setSearchFilter(e.target.value)}
                            className={`w-full bg-${isDarkMode ? 'gray-800' : 'gray-50'} border ${theme.cardBorder} rounded pl-9 pr-3 py-2 text-sm ${theme.headingColor}`}
                        />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 pb-10">
                <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} ${theme.subTextColor} uppercase tracking-wider text-xs border-b ${theme.cardBorder}`}>
                                <tr>
                                    <th className="px-6 py-4">Tanggal</th>
                                    <th className="px-6 py-4">Karyawan</th>
                                    <th className="px-6 py-4">Departemen</th>
                                    <th className="px-6 py-4">Shift Terschedule</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-200'}`}>
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Memuat data jadwal...</td></tr>
                                ) : filteredSchedules.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p>Tidak ada jadwal override yang ditemukan.</p>
                                        </td>
                                    </tr>
                                ) : filteredSchedules.map(schedule => (
                                    <tr key={schedule.id} className={`${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                        <td className={`px-6 py-4 whitespace-nowrap ${theme.headingColor} font-medium`}>
                                            {format(new Date(schedule.tanggal), 'dd MMM yyyy')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'} flex items-center justify-center shrink-0`}>
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className={`${theme.headingColor} font-medium`}>{schedule.karyawan_nama}</p>
                                                    <p className={`text-xs ${theme.subTextColor}`}>{schedule.karyawan_nik}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 ${theme.subTextColor}`}>
                                            {schedule.departemen_nama || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'} rounded-lg font-medium text-xs`}>
                                                <Clock className="w-3 h-3" />
                                                {schedule.shift_nama} ({schedule.jam_masuk.substring(0,5)} - {schedule.jam_pulang.substring(0,5)})
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleDelete(schedule.id)}
                                                className={`p-1.5 ${theme.subTextColor} hover:text-red-400 transition-colors`}
                                                title="Hapus Jadwal"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl p-6 w-full max-w-lg shadow-xl`}>
                        <h2 className={`text-xl font-bold ${theme.headingColor} mb-6`}>Buat Rolling Shift</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            
                            {/* Department Filter (Optional for narrowing down) */}
                            <div className="p-3 border border-dashed border-gray-500/30 rounded-lg">
                                <label className={`block text-xs ${theme.subTextColor} mb-2`}>Filter Karyawan via Departemen (Opsional)</label>
                                <select
                                    value={formData.filter_dept_modal}
                                    onChange={e => setFormData({...formData, filter_dept_modal: e.target.value, karyawan_id: ''})}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-3 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                >
                                    <option value="">-- Semua Departemen --</option>
                                    {departemens.map(d => (
                                        <option key={d.id} value={d.id}>{d.nama}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Employee Detail */}
                            <div>
                                <label className={`block text-sm ${theme.subTextColor} mb-1`}>Pilih Karyawan *</label>
                                <select
                                    required
                                    value={formData.karyawan_id}
                                    onChange={e => setFormData({...formData, karyawan_id: e.target.value})}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-3 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                >
                                    <option value="">-- Pilih --</option>
                                    {filteredKaryawanModal.map(k => (
                                        <option key={k.id} value={k.id}>{k.nama} ({k.nik})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Shift Detail */}
                            <div>
                                <label className={`block text-sm ${theme.subTextColor} mb-1`}>Pilih Shift Terschedule *</label>
                                <select
                                    required
                                    value={formData.shift_id}
                                    onChange={e => setFormData({...formData, shift_id: e.target.value})}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-3 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                >
                                    <option value="">-- Pilih Shift Alternatif --</option>
                                    {shifts.map(s => (
                                        <option key={s.id} value={s.id}>{s.nama} ({s.jam_masuk.substring(0,5)} - {s.jam_pulang.substring(0,5)})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Mode Toggle */}
                            <div className={`mt-4 pt-4 border-t ${theme.cardBorder}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <label className={`text-sm ${theme.subTextColor}`}>Mode Input Tanggal</label>
                                    <label className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only" checked={formData.isRange} onChange={() => setFormData({...formData, isRange: !formData.isRange})} />
                                            <div className={`block w-10 h-6 rounded-full transition-colors ${formData.isRange ? `bg-${theme.primary}-500` : (isDarkMode ? 'bg-gray-700' : 'bg-gray-300')}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isRange ? 'transform translate-x-4' : ''}`}></div>
                                        </div>
                                        <span className={`ml-3 text-sm ${theme.headingColor}`}>
                                            {formData.isRange ? 'Rentang Tanggal' : 'Tanggal Tunggal'}
                                        </span>
                                    </label>
                                </div>

                                {!formData.isRange ? (
                                    <div>
                                        <label className={`block text-sm ${theme.subTextColor} mb-1`}>Tanggal Pertukaran *</label>
                                        <input
                                            type="date" required
                                            value={formData.tanggal}
                                            onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                                            className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-3 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={`block text-sm ${theme.subTextColor} mb-1`}>Tanggal Mulai *</label>
                                            <input
                                                type="date" required
                                                value={formData.tanggal_mulai}
                                                onChange={e => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                                                className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-3 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-sm ${theme.subTextColor} mb-1`}>Tanggal Selesai *</label>
                                            <input
                                                type="date" required
                                                min={formData.tanggal_mulai}
                                                value={formData.tanggal_selesai}
                                                onChange={e => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                                                className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-3 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 outline-none`}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className={`${theme.subTextColor} hover:${theme.headingColor}`}>Batal</button>
                                <button type="submit" className={`bg-${theme.primary}-600 hover:bg-${theme.primary}-500 text-white px-6 py-2 rounded-lg flex items-center gap-2`}>
                                    Simpan Jadwal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleManagement;
