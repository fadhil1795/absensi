import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, Edit } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface LeaveType {
    id: number;
    nama: string;
    kuota: number;
    is_paid: boolean;
}

interface KaryawanOption {
    id: number;
    nama: string;
    nik: string;
}

const LeaveFormPage = () => {
    const { theme, isDarkMode } = useTheme();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();

    const isViewMode = location.pathname.includes('/izin/view/');
    const isEditMode = location.pathname.includes('/izin/edit/');

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || !!user.role_id;
    const token = localStorage.getItem('token');

    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [karyawans, setKaryawans] = useState<KaryawanOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [applyForm, setApplyForm] = useState({
        jenis_cuti_id: '',
        start_date: '',
        end_date: '',
        reason: '',
        karyawan_id: '',
        status: 'APPROVED'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const typesRes = await axios.get(`${API_BASE_URL}/api/leaves/types`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setLeaveTypes(typesRes.data);

                if (isAdmin) {
                    const karRes = await axios.get(`${API_BASE_URL}/api/karyawan`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setKaryawans(karRes.data);
                }

                if ((isEditMode || isViewMode) && id) {
                    const reqRes = await axios.get(`${API_BASE_URL}/api/leaves/requests/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const detail = reqRes.data;
                    setApplyForm({
                        jenis_cuti_id: detail.jenis_cuti_id ? String(detail.jenis_cuti_id) : '',
                        start_date: detail.start_date ? detail.start_date.substring(0, 10) : '',
                        end_date: detail.end_date ? detail.end_date.substring(0, 10) : '',
                        reason: detail.reason || '',
                        karyawan_id: detail.karyawan_id ? String(detail.karyawan_id) : '',
                        status: detail.status || 'APPROVED'
                    });
                }
            } catch (error) {
                console.error('Failed to load leave form data:', error);
                alert('Failed to load form data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, isEditMode, isViewMode, isAdmin, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewMode) return;

        if (isAdmin && !applyForm.karyawan_id) {
            alert('Please select an employee');
            return;
        }

        setSaving(true);
        try {
            if (isEditMode && id) {
                await axios.put(
                    `${API_BASE_URL}/api/leaves/requests/${id}`,
                    {
                        ...applyForm,
                        karyawan_id: isAdmin ? applyForm.karyawan_id : user.id
                    },
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
            } else {
                await axios.post(
                    `${API_BASE_URL}/api/leaves/apply`,
                    {
                        ...applyForm,
                        karyawan_id: isAdmin ? applyForm.karyawan_id : user.id,
                        status: isAdmin ? applyForm.status || 'APPROVED' : 'PENDING'
                    },
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
            }
            navigate('/dashboard/izin');
        } catch (error: any) {
            console.error('Error submitting leave request:', error);
            alert(error.response?.data?.error || 'Failed to submit request');
        } finally {
            setSaving(false);
        }
    };

    const pageTitle = isViewMode
        ? 'Detail Leave Request'
        : isEditMode
            ? 'Edit Leave Request'
            : 'Apply for Leave';

    const pageSubTitle = isViewMode
        ? 'View employee leave or permission request details.'
        : isEditMode
            ? 'Update employee leave or permission request.'
            : 'Create a new leave or permission request.';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={() => navigate('/dashboard/izin')}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Leave Requests
                </button>
                <div className="text-center">
                    <h1 className={`text-2xl font-bold ${theme.headingColor}`}>{pageTitle}</h1>
                    <p className={`${theme.subTextColor} text-sm`}>
                        {pageSubTitle}
                    </p>
                </div>
                <div />
            </div>

            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-6 shadow-sm transition-colors duration-300`}>
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Loading form data...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className={`grid gap-4 ${isAdmin ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                            {isAdmin && (
                                <div>
                                    <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Pilih Karyawan</label>
                                    <select
                                        required
                                        disabled={isViewMode}
                                        value={applyForm.karyawan_id}
                                        onChange={e => setApplyForm({ ...applyForm, karyawan_id: e.target.value })}
                                        className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none appearance-none ${isViewMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="">Pilih Karyawan...</option>
                                        {karyawans.map(k => (
                                            <option key={k.id} value={k.id}>{k.nama} ({k.nik})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Leave Type</label>
                                <select
                                    required
                                    disabled={isViewMode}
                                    value={applyForm.jenis_cuti_id}
                                    onChange={e => setApplyForm({ ...applyForm, jenis_cuti_id: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none appearance-none ${isViewMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    <option value="">Select Type</option>
                                    {leaveTypes.map(t => (
                                        <option key={t.id} value={t.id}>{t.nama} ({t.kuota} days)</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Start Date</label>
                                <input
                                    type="date"
                                    required
                                    disabled={isViewMode}
                                    value={applyForm.start_date}
                                    onChange={e => setApplyForm({ ...applyForm, start_date: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none ${isViewMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>End Date</label>
                                <input
                                    type="date"
                                    required
                                    disabled={isViewMode}
                                    value={applyForm.end_date}
                                    onChange={e => setApplyForm({ ...applyForm, end_date: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none ${isViewMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                />
                            </div>
                        </div>

                        {isAdmin && (isEditMode || isViewMode) && (
                            <div>
                                <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Status</label>
                                <select
                                    disabled={isViewMode}
                                    value={applyForm.status}
                                    onChange={e => setApplyForm({ ...applyForm, status: e.target.value })}
                                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none appearance-none ${isViewMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    <option value="APPROVED">APPROVED</option>
                                    <option value="PENDING">PENDING</option>
                                    <option value="REJECTED">REJECTED</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className={`block text-sm font-medium ${theme.subTextColor} mb-1`}>Reason</label>
                            <textarea
                                required
                                disabled={isViewMode}
                                value={applyForm.reason}
                                onChange={e => setApplyForm({ ...applyForm, reason: e.target.value })}
                                className={`w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'} px-4 py-2 rounded-lg border ${theme.cardBorder} focus:border-${theme.primary}-500 focus:outline-none h-28 resize-none ${isViewMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                placeholder="Why do you need leave?"
                            />
                        </div>

                        <div className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-4 border-t ${theme.cardBorder}`}>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/izin')}
                                className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'} transition-colors`}
                            >
                                {isViewMode ? 'Back' : 'Cancel'}
                            </button>

                            {isViewMode ? (
                                <button
                                    type="button"
                                    onClick={() => navigate(`/dashboard/izin/edit/${id}`)}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-red-600 hover:bg-red-700'} transition-colors`}
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit Request
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-red-600 hover:bg-red-700'} transition-colors ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Submit Request'}
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default LeaveFormPage;
