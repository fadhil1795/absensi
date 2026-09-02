import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Plus, Search, Edit, Trash2, Building2, X, Save, Lock, Shield,
    Crown, Users, ChevronDown
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface AdminUser {
    id: number;
    username: string;
    nama: string;
    role: string;
    role_id: number | null;
    role_name: string | null;
    instansi_id: number | null;
    instansi_nama: string | null;
    created_at: string;
}

interface Instansi { id: number; nama: string; }
interface Role { id: number; name: string; description: string | null; is_system: number; }

const AdminManagement = () => {
    const { theme, isDarkMode } = useTheme();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [instansis, setInstansis] = useState<Instansi[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [mounted, setMounted] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [formData, setFormData] = useState({ username: '', password: '', nama: '', role_id: '', instansi_id: '' });

    const token = localStorage.getItem('token');

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [usersRes, instRes, rolesRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/admins`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_BASE_URL}/api/instansi`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_BASE_URL}/api/roles`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setUsers(usersRes.data);
                setInstansis(instRes.data);
                setRoles(rolesRes.data);
            } catch (error) {
                console.error('Failed to fetch data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this admin?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/admins/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setUsers(users.filter(u => u.id !== id));
        } catch { alert('Failed to delete user'); }
    };

    const getSelectedRole = () => roles.find(r => r.id.toString() === formData.role_id);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const selectedRole = getSelectedRole();
            const roleName = selectedRole?.name || 'ADMIN';
            const payload: any = {
                username: formData.username, nama: formData.nama, role: roleName,
                role_id: formData.role_id ? parseInt(formData.role_id) : null,
                instansi_id: formData.instansi_id ? parseInt(formData.instansi_id) : null
            };
            if (formData.password) payload.password = formData.password;
            if (roleName !== 'SUPER_ADMIN' && !payload.instansi_id) { alert('Please select an Instansi'); return; }
            if (roleName === 'SUPER_ADMIN') payload.instansi_id = null;
            if (!formData.password && !editingUser) { alert('Password is required'); return; }

            if (editingUser) {
                await axios.put(`${API_BASE_URL}/api/admins/${editingUser.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                await axios.post(`${API_BASE_URL}/api/admins`, payload, { headers: { Authorization: `Bearer ${token}` } });
            }
            setIsModalOpen(false);
            const res = await axios.get(`${API_BASE_URL}/api/admins`, { headers: { Authorization: `Bearer ${token}` } });
            setUsers(res.data);
        } catch (error: any) { alert(error.response?.data?.error || 'Failed to save user'); }
    };

    const openModal = (user?: AdminUser) => {
        if (user) {
            setEditingUser(user);
            setFormData({ username: user.username, password: '', nama: user.nama, role_id: user.role_id ? user.role_id.toString() : '', instansi_id: user.instansi_id ? user.instansi_id.toString() : '' });
        } else {
            setEditingUser(null);
            setFormData({ username: '', password: '', nama: '', role_id: '', instansi_id: '' });
        }
        setIsModalOpen(true);
    };

    const filtered = users.filter(u =>
        u.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedRole = getSelectedRole();
    const isSuperAdminRole = selectedRole?.name === 'SUPER_ADMIN';

    const getRoleBadge = (roleName: string) => {
        if (roleName === 'SUPER_ADMIN') return {
            cls: isDarkMode ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'bg-red-50 text-red-600 border border-red-200',
            icon: <Crown className="w-3 h-3" />
        };
        if (roleName === 'ADMIN') return {
            cls: isDarkMode ? 'bg-red-500/10 text-red-400/70 border border-red-500/15' : 'bg-red-50/70 text-red-500 border border-red-100',
            icon: <Shield className="w-3 h-3" />
        };
        return {
            cls: isDarkMode ? 'bg-white/[0.04] text-gray-400 border border-white/[0.06]' : 'bg-gray-50 text-gray-500 border border-gray-200',
            icon: <Shield className="w-3 h-3" />
        };
    };

    const getAvatarGradient = (name: string) => {
        const gradients = ['from-red-500 to-rose-600', 'from-rose-500 to-pink-500', 'from-red-600 to-red-500', 'from-pink-500 to-rose-400', 'from-red-400 to-rose-500', 'from-rose-600 to-red-500'];
        return gradients[name.charCodeAt(0) % gradients.length];
    };

    return (
        <div className={`space-y-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                        <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className={`text-2xl font-bold ${theme.headingColor} tracking-tight`}>Admin Management</h1>
                        <p className={`text-sm ${theme.subTextColor}`}>Manage admin accounts and role assignments</p>
                    </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${isDarkMode ? 'bg-white/[0.03] text-gray-300 border-white/[0.06]' : 'bg-white text-gray-600 border-red-100'}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {users.length} Admin{users.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Controls */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between`}>
                <div className="relative flex-1 max-w-md">
                    <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input type="text" placeholder="Search by name or username..."
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className={`w-full ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${isDarkMode ? 'text-white placeholder:text-gray-500' : 'text-gray-800 placeholder:text-gray-400'} pl-10 pr-4 py-2.5 rounded-xl border outline-none transition-all text-sm`}
                    />
                </div>
                <button onClick={() => openModal()} className={`flex items-center gap-2 ${theme.btnPrimary} px-5 py-2.5 rounded-xl transition-all font-medium text-sm`}>
                    <Plus className="w-4 h-4" /> Add Admin
                </button>
            </div>

            {/* Table */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={`${isDarkMode ? 'bg-white/[0.02]' : 'bg-red-50/30'} text-left`}>
                                <th className={`px-6 py-4 text-[11px] font-semibold ${theme.subTextColor} uppercase tracking-wider`}>Admin</th>
                                <th className={`px-6 py-4 text-[11px] font-semibold ${theme.subTextColor} uppercase tracking-wider`}>Role</th>
                                <th className={`px-6 py-4 text-[11px] font-semibold ${theme.subTextColor} uppercase tracking-wider`}>Institution</th>
                                <th className={`px-6 py-4 text-[11px] font-semibold ${theme.subTextColor} uppercase tracking-wider text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/[0.03]' : 'divide-red-50'}`}>
                            {loading ? (
                                [1, 2, 3, 4].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl ${isDarkMode ? 'bg-white/[0.06]' : 'bg-red-50'}`} /><div><div className={`h-3.5 w-28 rounded-md ${isDarkMode ? 'bg-white/[0.06]' : 'bg-red-50'} mb-2`} /><div className={`h-2.5 w-20 rounded-md ${isDarkMode ? 'bg-white/[0.04]' : 'bg-gray-100'}`} /></div></div></td>
                                        <td className="px-6 py-4"><div className={`h-6 w-20 rounded-lg ${isDarkMode ? 'bg-white/[0.04]' : 'bg-gray-50'}`} /></td>
                                        <td className="px-6 py-4"><div className={`h-3.5 w-24 rounded-md ${isDarkMode ? 'bg-white/[0.04]' : 'bg-gray-50'}`} /></td>
                                        <td className="px-6 py-4"><div className={`h-6 w-16 rounded-md ${isDarkMode ? 'bg-white/[0.04]' : 'bg-gray-50'} ml-auto`} /></td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center">
                                        <div className={`flex flex-col items-center ${theme.subTextColor}`}>
                                            <div className={`w-14 h-14 rounded-2xl ${isDarkMode ? 'bg-white/[0.04]' : 'bg-red-50'} flex items-center justify-center mb-3`}>
                                                <Users className="w-7 h-7 text-red-300" />
                                            </div>
                                            <p className="font-semibold">No admins found</p>
                                            <p className="text-sm mt-0.5 opacity-60">Try adjusting your search</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(u => {
                                    const badge = getRoleBadge(u.role);
                                    return (
                                        <tr key={u.id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-red-50/20'} transition-colors`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(u.nama)} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                                                        {u.nama.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className={`${theme.headingColor} font-semibold text-sm`}>{u.nama}</div>
                                                        <div className={`text-xs ${theme.subTextColor} mt-0.5`}>@{u.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${badge.cls}`}>
                                                    {badge.icon} {u.role_name || u.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.instansi_nama ? (
                                                    <span className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        <Building2 className={`w-3.5 h-3.5 ${theme.subTextColor}`} /> {u.instansi_nama}
                                                    </span>
                                                ) : <span className={`text-sm ${theme.subTextColor}`}>—</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openModal(u)} className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-500 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'} transition-all`}>
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(u.id)} className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'} transition-all`}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
                    <div onClick={e => e.stopPropagation()}
                        className={`relative ${theme.cardBg} border ${theme.cardBorder} rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl`}
                        style={{ animation: 'modalSlideIn 0.3s ease-out' }}>

                        <div className="h-1 bg-gradient-to-r from-red-500 to-rose-500" />

                        <div className={`flex justify-between items-center px-6 py-5 border-b ${theme.cardBorder}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                                    {editingUser ? <Edit className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
                                </div>
                                <div>
                                    <h2 className={`text-lg font-bold ${theme.headingColor}`}>{editingUser ? 'Edit Admin' : 'New Admin'}</h2>
                                    <p className={`text-xs ${theme.subTextColor}`}>{editingUser ? 'Update details and role' : 'Create a new admin account'}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className={`p-2 rounded-xl ${isDarkMode ? 'hover:bg-white/[0.06] text-gray-500' : 'hover:bg-gray-100 text-gray-400'} transition-all`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className={`block text-[11px] font-semibold ${theme.subTextColor} mb-1.5 uppercase tracking-wider`}>Full Name</label>
                                <input required type="text" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })}
                                    className={`w-full ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${isDarkMode ? 'text-white' : 'text-gray-800'} px-4 py-2.5 rounded-xl border outline-none transition-all text-sm`}
                                    placeholder="John Doe" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-[11px] font-semibold ${theme.subTextColor} mb-1.5 uppercase tracking-wider`}>Username</label>
                                    <input required type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        className={`w-full ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${isDarkMode ? 'text-white' : 'text-gray-800'} px-4 py-2.5 rounded-xl border outline-none transition-all text-sm`}
                                        placeholder="johndoe" />
                                </div>
                                <div>
                                    <label className={`block text-[11px] font-semibold ${theme.subTextColor} mb-1.5 uppercase tracking-wider`}>Password</label>
                                    <div className="relative">
                                        <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.subTextColor}`} />
                                        <input type="password" required={!editingUser} value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            className={`w-full ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${isDarkMode ? 'text-white' : 'text-gray-800'} pl-9 pr-4 py-2.5 rounded-xl border outline-none transition-all text-sm`}
                                            placeholder={editingUser ? "(Unchanged)" : "••••••••"} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className={`block text-[11px] font-semibold ${theme.subTextColor} mb-1.5 uppercase tracking-wider`}>
                                    <Shield className="w-3 h-3 inline mr-1 -mt-0.5" /> Role
                                </label>
                                <div className="relative">
                                    <select required value={formData.role_id} onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                                        className={`w-full appearance-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${isDarkMode ? 'text-white' : 'text-gray-800'} px-4 py-2.5 rounded-xl border outline-none transition-all pr-10 text-sm`}>
                                        <option value="">Select Role</option>
                                        {roles.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.name} {r.is_system ? '(System)' : ''} {r.description ? `— ${r.description}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${theme.subTextColor}`} />
                                </div>
                                {selectedRole && (
                                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                        {selectedRole.name === 'SUPER_ADMIN'
                                            ? <><Crown className="w-3 h-3" /> Full access to all features</>
                                            : <><Shield className="w-3 h-3" /> {selectedRole.description || 'Custom role'}</>}
                                    </p>
                                )}
                            </div>

                            {!isSuperAdminRole && (
                                <div>
                                    <label className={`block text-[11px] font-semibold ${theme.subTextColor} mb-1.5 uppercase tracking-wider`}>
                                        <Building2 className="w-3 h-3 inline mr-1 -mt-0.5" /> Institution
                                    </label>
                                    <div className="relative">
                                        <select required value={formData.instansi_id} onChange={e => setFormData({ ...formData, instansi_id: e.target.value })}
                                            className={`w-full appearance-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${isDarkMode ? 'text-white' : 'text-gray-800'} px-4 py-2.5 rounded-xl border outline-none transition-all pr-10 text-sm`}>
                                            <option value="">Select Institution</option>
                                            {instansis.map(i => <option key={i.id} value={i.id}>{i.nama}</option>)}
                                        </select>
                                        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${theme.subTextColor}`} />
                                    </div>
                                </div>
                            )}

                            <div className={`flex justify-end gap-3 pt-5 border-t ${theme.cardBorder}`}>
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium ${isDarkMode ? 'text-gray-500 hover:text-white hover:bg-white/[0.06]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} transition-all`}>
                                    Cancel
                                </button>
                                <button type="submit" className={`flex items-center gap-2 ${theme.btnPrimary} px-5 py-2 rounded-xl text-sm font-medium transition-all`}>
                                    <Save className="w-4 h-4" /> Save Admin
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminManagement;
