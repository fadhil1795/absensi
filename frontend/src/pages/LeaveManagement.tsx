
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, X, Plus, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface LeaveType {
    id: number;
    nama: string;
    kuota: number;
    is_paid: boolean;
}

interface LeaveRequest {
    id: number;
    karyawan_id: number;
    nama_karyawan: string;
    jenis_cuti: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    created_at: string;
}

const LeaveManagement = () => {
    const { theme, isDarkMode } = useTheme();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || !!user.role_id;
    const [activeTab, setActiveTab] = useState<'my_leaves' | 'manage_requests' | 'leave_types'>(isAdmin ? 'manage_requests' : 'my_leaves');
    const [loading, setLoading] = useState(true);

    // Data
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
    const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]); // For Admins
    const [karyawans, setKaryawans] = useState<{id: number, nama: string, nik: string}[]>([]);

    // Forms
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [applyForm, setApplyForm] = useState({ jenis_cuti_id: '', start_date: '', end_date: '', reason: '', karyawan_id: '' });

    // Admin Forms
    const [newTypeForm, setNewTypeForm] = useState({ nama: '', kuota: 12, is_paid: true });

    const token = localStorage.getItem('token');

    // Fetch Data
    useEffect(() => {
        fetchInitialData();
    }, [activeTab]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Always fetch types for dropdowns
            const typesRes = await axios.get(`${API_BASE_URL}/api/leaves/types`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLeaveTypes(typesRes.data);

            if (isAdmin) {
                // Fetch Karyawans for Dropdown (Needed for modal on any tab)
                const karRes = await axios.get(`${API_BASE_URL}/api/karyawan`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setKaryawans(karRes.data);

                if (activeTab === 'manage_requests') {
                    const reqRes = await axios.get(`${API_BASE_URL}/api/leaves/requests`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setAllRequests(reqRes.data);
                }
            } else if (activeTab === 'my_leaves') {
                const reqRes = await axios.get(`${API_BASE_URL}/api/leaves/requests`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMyRequests(reqRes.data);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isAdmin && !applyForm.karyawan_id) {
            alert('Please select an employee');
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/api/leaves/apply`, {
                ...applyForm,
                karyawan_id: isAdmin ? applyForm.karyawan_id : user.id,
                status: isAdmin ? 'APPROVED' : 'PENDING'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsApplyModalOpen(false);
            setApplyForm({ jenis_cuti_id: '', start_date: '', end_date: '', reason: '', karyawan_id: '' });
            fetchInitialData();
            alert('Leave request submitted');
        } catch (error) {
            console.error(error);
            alert('Failed to submit request');
        }
    };

    const handleCreateType = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/api/leaves/types`, newTypeForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewTypeForm({ nama: '', kuota: 12, is_paid: true });
            fetchInitialData();
        } catch (error) {
            console.error(error);
            alert('Failed to create leave type');
        }
    };

    const handleDeleteType = async (id: number) => {
        if (!confirm('Delete this leave type?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/leaves/types/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchInitialData();
        } catch (error) {
            console.error(error);
            alert('Failed to delete leave type');
        }
    };

    const handleStatusUpdate = async (id: number, status: 'APPROVED' | 'REJECTED') => {
        try {
            await axios.put(`${API_BASE_URL}/api/leaves/requests/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchInitialData();
        } catch (error) {
            console.error(error);
            alert('Failed to update status');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Leave Management</h1>
                    <p className={theme.subTextColor}>Manage employee leave requests and policies.</p>
                </div>
                <button
                    onClick={() => setIsApplyModalOpen(true)}
                    className={`bg-${theme.primary}-600 hover:bg-${theme.primary}-500 text-white px-4 py-2 rounded-lg flex items-center gap-2`}
                >
                    <Plus className="w-4 h-4" />
                    Input Cuti / Izin
                </button>
            </div>

            {/* Tabs */}
            <div className={`border-b ${theme.cardBorder} flex gap-6`}>
                {!isAdmin && (
                    <button
                        onClick={() => setActiveTab('my_leaves')}
                        className={`pb-3 border-b-2 transition-colors ${activeTab === 'my_leaves' ? `border-${theme.primary}-500 text-${theme.primary}-500` : `border-transparent ${theme.subTextColor} hover:${theme.headingColor}`}`}
                    >
                        My Leaves
                    </button>
                )}
                {isAdmin && (
                    <>
                        <button
                            onClick={() => setActiveTab('manage_requests')}
                            className={`pb-3 border-b-2 transition-colors ${activeTab === 'manage_requests' ? `border-${theme.primary}-500 text-${theme.primary}-500` : `border-transparent ${theme.subTextColor} hover:${theme.headingColor}`}`}
                        >
                            Manage Requests
                        </button>
                        <button
                            onClick={() => setActiveTab('leave_types')}
                            className={`pb-3 border-b-2 transition-colors ${activeTab === 'leave_types' ? `border-${theme.primary}-500 text-${theme.primary}-500` : `border-transparent ${theme.subTextColor} hover:${theme.headingColor}`}`}
                        >
                            Leave Types
                        </button>
                    </>
                )}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="text-gray-400">Loading...</div>
                ) : (
                    <>
                        {/* MY LEAVES (Employee) */}
                        {activeTab === 'my_leaves' && (
                            <div className="space-y-4">
                                {myRequests.length === 0 ? (
                                    <p className="text-gray-400">No leave requests found.</p>
                                ) : (
                                    myRequests.map(req => (
                                        <div key={req.id} className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-xl flex justify-between items-center`}>
                                            <div>
                                                <div className={`font-bold ${theme.headingColor}`}>{req.jenis_cuti}</div>
                                                <div className={`text-sm ${theme.subTextColor}`}>Nama: {req.nama_karyawan || user.nama}</div>
                                                <div className={`text-sm ${theme.subTextColor}`}>{req.start_date.substring(0, 10)} to {req.end_date.substring(0, 10)}</div>
                                                <div className={`text-sm ${theme.subTextColor} mt-1`}>{req.reason}</div>
                                            </div>
                                            <div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    req.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                                                        'bg-amber-500/10 text-amber-500'
                                                    }`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* MANAGE REQUESTS (Admin) */}
                        {activeTab === 'manage_requests' && (
                            <div className="space-y-4">
                                {allRequests.length === 0 ? (
                                    <p className="text-gray-400">No pending requests.</p>
                                ) : (
                                    allRequests.map(req => (
                                        <div key={req.id} className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4`}>
                                            <div>
                                                <div className={`font-bold ${theme.headingColor}`}>{req.nama_karyawan}</div>
                                                <div className={`${isDarkMode ? 'text-indigo-400' : `text-${theme.primary}-600`} text-sm`}>{req.jenis_cuti}</div>
                                                <div className={`text-sm ${theme.subTextColor} mt-1`}>
                                                    {req.start_date.substring(0, 10)} - {req.end_date.substring(0, 10)}
                                                </div>
                                                <div className={`text-sm ${theme.subTextColor} mt-1 italic`}>"{req.reason}"</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {req.status === 'PENDING' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                                                            className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500/30"
                                                            title="Approve"
                                                        >
                                                            <Check className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(req.id, 'REJECTED')}
                                                            className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30"
                                                            title="Reject"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                                                        'bg-red-500/10 text-red-500'
                                                        }`}>
                                                        {req.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* LEAVE TYPES (Admin) */}
                        {activeTab === 'leave_types' && (
                            <div className="space-y-6">
                                <form onSubmit={handleCreateType} className={`${theme.cardBg} border ${theme.cardBorder} p-6 rounded-xl space-y-4 max-w-lg`}>
                                    <h3 className={`text-lg font-bold ${theme.headingColor} mb-4`}>Add New Leave Type</h3>
                                    <div>
                                        <label className={`block text-sm ${theme.subTextColor} mb-1`}>Name</label>
                                        <input
                                            value={newTypeForm.nama}
                                            onChange={e => setNewTypeForm({ ...newTypeForm, nama: e.target.value })}
                                            className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded-lg px-4 py-2 focus:border-${theme.primary}-500 outline-none`}
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className={`block text-sm ${theme.subTextColor} mb-1`}>Quota (Days)</label>
                                            <input
                                                type="number"
                                                value={newTypeForm.kuota}
                                                onChange={e => setNewTypeForm({ ...newTypeForm, kuota: parseInt(e.target.value) })}
                                                className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded-lg px-4 py-2 focus:border-${theme.primary}-500 outline-none`}
                                                required
                                            />
                                        </div>
                                        <div className="flex items-end pb-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={newTypeForm.is_paid}
                                                    onChange={e => setNewTypeForm({ ...newTypeForm, is_paid: e.target.checked })}
                                                    className={`w-4 h-4 rounded ${isDarkMode ? 'bg-gray-800 border-white/10' : 'bg-gray-200 border-gray-300'} text-${theme.primary}-500 focus:ring-${theme.primary}-500`}
                                                />
                                                <span className={theme.subTextColor}>Paid Leave</span>
                                            </label>
                                        </div>
                                    </div>
                                    <button type="submit" className={`w-full bg-${theme.primary}-600 hover:bg-${theme.primary}-500 text-white py-2 rounded-lg font-medium`}>
                                        Create Type
                                    </button>
                                </form>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {leaveTypes.map(type => (
                                        <div key={type.id} className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-xl flex justify-between items-start`}>
                                            <div>
                                                <div className={`font-bold ${theme.headingColor}`}>{type.nama}</div>
                                                <div className={`text-sm ${theme.subTextColor} mt-1`}>{type.kuota} Days / Year</div>
                                                <div className={`text-xs mt-2 inline-block px-2 py-0.5 rounded ${type.is_paid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'}`}>
                                                    {type.is_paid ? 'Paid' : 'Unpaid'}
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteType(type.id)} className={`${theme.subTextColor} hover:text-red-500 p-2`}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Apply Modal */}
            {isApplyModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl w-full max-w-md p-6 shadow-xl`}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className={`text-xl font-bold ${theme.headingColor}`}>Apply for Leave</h2>
                            <button onClick={() => setIsApplyModalOpen(false)} className={`${theme.subTextColor} hover:${theme.headingColor}`}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleApplyLeave} className="space-y-4">
                            {isAdmin && (
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Pilih Karyawan</label>
                                    <select
                                        className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded-lg px-4 py-2 focus:border-${theme.primary}-500 outline-none`}
                                        value={applyForm.karyawan_id}
                                        onChange={e => setApplyForm({ ...applyForm, karyawan_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Pilih Karyawan...</option>
                                        {karyawans.map(k => (
                                            <option key={k.id} value={k.id}>{k.nama} ({k.nik})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className={`block text-sm ${theme.subTextColor} mb-1`}>Leave Type</label>
                                <select
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded-lg px-4 py-2 focus:border-${theme.primary}-500 outline-none`}
                                    value={applyForm.jenis_cuti_id}
                                    onChange={e => setApplyForm({ ...applyForm, jenis_cuti_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Type</option>
                                    {leaveTypes.map(t => (
                                        <option key={t.id} value={t.id}>{t.nama} ({t.kuota} days)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>Start Date</label>
                                    <input
                                        type="date"
                                        className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded-lg px-4 py-2 focus:border-${theme.primary}-500 outline-none`}
                                        value={applyForm.start_date}
                                        onChange={e => setApplyForm({ ...applyForm, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm ${theme.subTextColor} mb-1`}>End Date</label>
                                    <input
                                        type="date"
                                        className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded-lg px-4 py-2 focus:border-${theme.primary}-500 outline-none`}
                                        value={applyForm.end_date}
                                        onChange={e => setApplyForm({ ...applyForm, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={`block text-sm ${theme.subTextColor} mb-1`}>Reason</label>
                                <textarea
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} border ${theme.cardBorder} rounded-lg px-4 py-2 focus:border-${theme.primary}-500 outline-none h-24 resize-none`}
                                    value={applyForm.reason}
                                    onChange={e => setApplyForm({ ...applyForm, reason: e.target.value })}
                                    required
                                    placeholder="Why do you need leave?"
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsApplyModalOpen(false)} className={`px-4 py-2 ${theme.subTextColor} hover:${theme.headingColor}`}>Cancel</button>
                                <button type="submit" className={`bg-${theme.primary}-600 hover:bg-${theme.primary}-500 text-white px-6 py-2 rounded-lg font-medium`}>Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveManagement;
