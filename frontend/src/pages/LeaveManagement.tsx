import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Check, X, Plus, Trash2, Eye, Edit } from 'lucide-react';
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
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || !!user.role_id;
    const [activeTab, setActiveTab] = useState<'my_leaves' | 'manage_requests' | 'leave_types'>(isAdmin ? 'manage_requests' : 'my_leaves');
    const [loading, setLoading] = useState(true);

    // Data
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
    const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]); // For Admins

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

    const handleDeleteRequest = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus data cuti / izin ini?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/leaves/requests/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchInitialData();
        } catch (error) {
            console.error('Error deleting leave request:', error);
            alert('Gagal menghapus data cuti / izin');
        }
    };

    const renderActionButtons = (req: LeaveRequest) => (
        <div className="flex items-center gap-2">
            {isAdmin && req.status === 'PENDING' && (
                <>
                    <button
                        onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                        className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500/30 transition-colors"
                        title="Approve"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleStatusUpdate(req.id, 'REJECTED')}
                        className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
                        title="Reject"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </>
            )}

            <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                req.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                    'bg-amber-500/10 text-amber-500'
                }`}>
                {req.status}
            </span>

            <div className={`h-4 w-[1px] mx-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />

            <button
                onClick={() => navigate(`/dashboard/izin/view/${req.id}`)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'}`}
                title="View Detail"
            >
                <Eye className="w-4 h-4" />
            </button>
            <button
                onClick={() => navigate(`/dashboard/izin/edit/${req.id}`)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                title="Edit"
            >
                <Edit className="w-4 h-4" />
            </button>
            <button
                onClick={() => handleDeleteRequest(req.id)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                title="Delete"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>Leave Management</h1>
                    <p className={theme.subTextColor}>Manage employee leave requests and policies.</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard/izin/new')}
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
                                        <div key={req.id} className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4`}>
                                            <div>
                                                <div className={`font-bold ${theme.headingColor}`}>{req.jenis_cuti}</div>
                                                <div className={`text-sm ${theme.subTextColor}`}>Nama: {req.nama_karyawan || user.nama}</div>
                                                <div className={`text-sm ${theme.subTextColor}`}>{req.start_date.substring(0, 10)} to {req.end_date.substring(0, 10)}</div>
                                                <div className={`text-sm ${theme.subTextColor} mt-1`}>{req.reason}</div>
                                            </div>
                                            {renderActionButtons(req)}
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
                                        <div key={req.id} className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4`}>
                                            <div>
                                                <div className={`font-bold ${theme.headingColor}`}>{req.nama_karyawan}</div>
                                                <div className={`${isDarkMode ? 'text-indigo-400' : `text-${theme.primary}-600`} text-sm`}>{req.jenis_cuti}</div>
                                                <div className={`text-sm ${theme.subTextColor} mt-1`}>
                                                    {req.start_date.substring(0, 10)} - {req.end_date.substring(0, 10)}
                                                </div>
                                                <div className={`text-sm ${theme.subTextColor} mt-1 italic`}>"{req.reason}"</div>
                                            </div>
                                            {renderActionButtons(req)}
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
        </div>
    );
};

export default LeaveManagement;
