import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Plus, Search, Edit, Trash2, X, Save, Shield, ShieldCheck, Users,
    ChevronDown, ChevronRight, ToggleLeft, ToggleRight,
    Crown, Lock, Unlock, Key, Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';
import { ALL_PERMISSION_DEFS } from '../hooks/usePermissions';

interface Role {
    id: number;
    name: string;
    description: string | null;
    is_system: number;
    instansi_id: number | null;
    instansi_nama: string | null;
    admin_count: number;
    permissions: string[];
    created_at: string;
}

const RoleManagement = () => {
    const { theme, isDarkMode } = useTheme();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [mounted, setMounted] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [] as string[]
    });

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const token = localStorage.getItem('token');

    useEffect(() => { setMounted(true); }, []);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/roles`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRoles(res.data);
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRoles(); }, [token]);

    const permissionGroups = ALL_PERMISSION_DEFS.reduce((acc, perm) => {
        if (!acc[perm.group]) acc[perm.group] = [];
        acc[perm.group].push(perm);
        return acc;
    }, {} as Record<string, typeof ALL_PERMISSION_DEFS>);

    const togglePermission = (key: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(key)
                ? prev.permissions.filter(p => p !== key)
                : [...prev.permissions, key]
        }));
    };

    const toggleGroup = (groupName: string) => {
        const groupPerms = permissionGroups[groupName].map(p => p.key);
        const allSelected = groupPerms.every(p => formData.permissions.includes(p));
        setFormData(prev => ({
            ...prev,
            permissions: allSelected
                ? prev.permissions.filter(p => !groupPerms.includes(p))
                : [...new Set([...prev.permissions, ...groupPerms])]
        }));
    };

    const toggleAllPermissions = () => {
        const allKeys = ALL_PERMISSION_DEFS.map(p => p.key);
        const allSelected = allKeys.every(p => formData.permissions.includes(p));
        setFormData(prev => ({ ...prev, permissions: allSelected ? [] : allKeys }));
    };

    const openModal = (role?: Role) => {
        if (role) {
            setEditingRole(role);
            setFormData({ name: role.name, description: role.description || '', permissions: role.permissions || [] });
        } else {
            setEditingRole(null);
            setFormData({ name: '', description: '', permissions: [] });
        }
        const expanded: Record<string, boolean> = {};
        Object.keys(permissionGroups).forEach(g => { expanded[g] = true; });
        setExpandedGroups(expanded);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRole) {
                await axios.put(`${API_BASE_URL}/api/roles/${editingRole.id}`, formData, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                await axios.post(`${API_BASE_URL}/api/roles`, formData, { headers: { Authorization: `Bearer ${token}` } });
            }
            setIsModalOpen(false);
            fetchRoles();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to save role');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this role?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/roles/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchRoles();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to delete role');
        }
    };

    const filtered = roles.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const allPermKeys = ALL_PERMISSION_DEFS.map(p => p.key);
    const allSelected = allPermKeys.every(p => formData.permissions.includes(p));
    const permProgress = (formData.permissions.length / ALL_PERMISSION_DEFS.length) * 100;

    const getRoleAccent = (role: Role) => {
        if (role.is_system && role.name === 'SUPER_ADMIN') return {
            gradient: 'from-red-600 to-rose-500',
            badge: isDarkMode ? 'bg-red-500/15 text-red-400 border-red-500/25' : 'bg-red-50 text-red-600 border-red-200',
            icon: <Crown className="w-5 h-5 text-white" />
        };
        if (role.is_system) return {
            gradient: 'from-red-500 to-red-400',
            badge: isDarkMode ? 'bg-red-500/10 text-red-400/80 border-red-500/20' : 'bg-red-50 text-red-500 border-red-100',
            icon: <ShieldCheck className="w-5 h-5 text-white" />
        };
        return {
            gradient: 'from-gray-600 to-gray-500',
            badge: isDarkMode ? 'bg-white/5 text-gray-400 border-white/10' : 'bg-gray-50 text-gray-500 border-gray-200',
            icon: <Shield className="w-5 h-5 text-white" />
        };
    };

    return (
        <div className={`space-y-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className={`text-2xl font-bold ${theme.headingColor} tracking-tight`}>Role Management</h1>
                        <p className={`text-sm ${theme.subTextColor}`}>Create and manage roles with granular permissions</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${isDarkMode ? 'bg-white/[0.03] text-gray-300 border-white/[0.06]' : 'bg-white text-gray-600 border-red-100'}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {roles.length} Roles
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${isDarkMode ? 'bg-white/[0.03] text-gray-300 border-white/[0.06]' : 'bg-white text-gray-600 border-red-100'}`}>
                        <Key className="w-3 h-3 text-red-400" />
                        {ALL_PERMISSION_DEFS.length} Permissions
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className={`${theme.cardBg} border ${theme.cardBorder} p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between`}>
                <div className="relative flex-1 max-w-md">
                    <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input
                        type="text" placeholder="Search roles..."
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className={`w-full ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${isDarkMode ? 'text-white placeholder:text-gray-500' : 'text-gray-800 placeholder:text-gray-400'} pl-10 pr-4 py-2.5 rounded-xl border outline-none transition-all duration-200 text-sm`}
                    />
                </div>
                <button onClick={() => openModal()} className={`flex items-center gap-2 ${theme.btnPrimary} px-5 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm`}>
                    <Plus className="w-4 h-4" />
                    New Role
                </button>
            </div>

            {/* Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-6 animate-pulse`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-11 h-11 rounded-xl ${isDarkMode ? 'bg-white/[0.06]' : 'bg-red-50'}`} />
                                <div className="flex-1">
                                    <div className={`h-4 w-24 rounded-lg ${isDarkMode ? 'bg-white/[0.06]' : 'bg-red-50'} mb-2`} />
                                    <div className={`h-3 w-32 rounded-lg ${isDarkMode ? 'bg-white/[0.04]' : 'bg-gray-100'}`} />
                                </div>
                            </div>
                            <div className={`h-1.5 w-full rounded-full ${isDarkMode ? 'bg-white/[0.04]' : 'bg-gray-100'} mb-3`} />
                            <div className="flex gap-2">
                                {[1, 2, 3].map(j => <div key={j} className={`h-6 w-16 rounded-lg ${isDarkMode ? 'bg-white/[0.04]' : 'bg-gray-50'}`} />)}
                            </div>
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <div className={`col-span-full flex flex-col items-center justify-center py-20 ${theme.subTextColor}`}>
                        <div className={`w-16 h-16 rounded-2xl ${isDarkMode ? 'bg-white/[0.04]' : 'bg-red-50'} flex items-center justify-center mb-4`}>
                            <Shield className="w-8 h-8 text-red-300" />
                        </div>
                        <p className="font-semibold text-lg">No roles found</p>
                        <p className="text-sm mt-1 opacity-60">Create your first role to get started</p>
                    </div>
                ) : (
                    filtered.map((role, _idx) => {
                        const accent = getRoleAccent(role);
                        return (
                            <div key={role.id} className={`group ${theme.cardBg} border ${theme.cardBorder} rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl ${isDarkMode ? 'hover:shadow-red-500/5 hover:border-white/10' : 'hover:shadow-red-100 hover:border-red-200'}`}>
                                <div className={`h-1 bg-gradient-to-r ${accent.gradient}`} />
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent.gradient} flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105`}>
                                                {accent.icon}
                                            </div>
                                            <div>
                                                <h3 className={`font-semibold ${theme.headingColor} text-[15px]`}>{role.name}</h3>
                                                <p className={`text-xs ${theme.subTextColor} mt-0.5 line-clamp-1`}>{role.description || 'No description'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {(!role.is_system || role.name !== 'SUPER_ADMIN') && (
                                                <button onClick={() => openModal(role)} className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-500 hover:text-white hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'} transition-all`}>
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {!role.is_system && (
                                                <button onClick={() => handleDelete(role.id)} className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'} transition-all`}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-4">
                                        <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${isDarkMode ? 'bg-white/[0.04] text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                            <Users className="w-3 h-3" /> {role.admin_count} admin{role.admin_count !== 1 ? 's' : ''}
                                        </div>
                                        <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${accent.badge}`}>
                                            {role.is_system ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                            {role.is_system ? 'System' : 'Custom'}
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className={`text-[11px] font-medium ${theme.subTextColor}`}>Permissions</span>
                                            <span className={`text-[11px] font-medium ${theme.subTextColor}`}>
                                                {role.name === 'SUPER_ADMIN' ? ALL_PERMISSION_DEFS.length : role.permissions.length}/{ALL_PERMISSION_DEFS.length}
                                            </span>
                                        </div>
                                        <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/[0.04]' : 'bg-red-50'}`}>
                                            <div className={`h-full rounded-full bg-gradient-to-r ${accent.gradient} transition-all duration-700`}
                                                style={{ width: `${role.name === 'SUPER_ADMIN' ? 100 : (role.permissions.length / ALL_PERMISSION_DEFS.length) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                        {role.name === 'SUPER_ADMIN' ? (
                                            <div className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-medium ${isDarkMode ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                <Sparkles className="w-3 h-3" /> Full Access
                                            </div>
                                        ) : (
                                            role.permissions.slice(0, 5).map(perm => (
                                                <span key={perm} className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${isDarkMode ? 'bg-white/[0.04] text-gray-400' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                                                    {perm.replace('_', ' ')}
                                                </span>
                                            ))
                                        )}
                                        {role.permissions.length > 5 && role.name !== 'SUPER_ADMIN' && (
                                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'}`}>
                                                +{role.permissions.length - 5}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
                    <div
                        onClick={e => e.stopPropagation()}
                        className={`relative ${theme.cardBg} border ${theme.cardBorder} rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col`}
                        style={{ animation: 'modalSlideIn 0.3s ease-out' }}
                    >
                        <div className="h-1 bg-gradient-to-r from-red-500 to-rose-500" />

                        <div className={`flex justify-between items-center px-6 py-5 border-b ${theme.cardBorder} shrink-0`}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                                    {editingRole ? <Edit className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
                                </div>
                                <div>
                                    <h2 className={`text-lg font-bold ${theme.headingColor}`}>
                                        {editingRole ? (editingRole.is_system ? `Edit "${editingRole.name}"` : 'Edit Role') : 'Create New Role'}
                                    </h2>
                                    <p className={`text-xs ${theme.subTextColor}`}>
                                        {editingRole?.is_system ? 'Modify permissions for system role' : 'Configure name and permissions'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className={`p-2 rounded-xl ${isDarkMode ? 'hover:bg-white/[0.06] text-gray-500' : 'hover:bg-gray-100 text-gray-400'} transition-all`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                                {!(editingRole?.is_system) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-[11px] font-semibold ${theme.subTextColor} mb-1.5 uppercase tracking-wider`}>Role Name</label>
                                            <input required type="text" value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className={`w-full ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${isDarkMode ? 'text-white' : 'text-gray-800'} px-4 py-2.5 rounded-xl border outline-none transition-all text-sm`}
                                                placeholder="e.g. Operator, HRD, Viewer"
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-[11px] font-semibold ${theme.subTextColor} mb-1.5 uppercase tracking-wider`}>Description</label>
                                            <input type="text" value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                className={`w-full ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${isDarkMode ? 'text-white' : 'text-gray-800'} px-4 py-2.5 rounded-xl border outline-none transition-all text-sm`}
                                                placeholder="Short description..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {editingRole?.is_system && (
                                    <div>
                                        <label className={`block text-[11px] font-semibold ${theme.subTextColor} mb-1.5 uppercase tracking-wider`}>Description</label>
                                        <input type="text" value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className={`w-full ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${isDarkMode ? 'text-white' : 'text-gray-800'} px-4 py-2.5 rounded-xl border outline-none transition-all text-sm`}
                                            placeholder="Short description..."
                                        />
                                    </div>
                                )}

                                {/* Permissions */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Key className="w-4 h-4 text-red-500" />
                                            <span className={`text-sm font-bold ${theme.headingColor}`}>Permissions</span>
                                        </div>
                                        <button type="button" onClick={toggleAllPermissions}
                                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${
                                                allSelected
                                                    ? (isDarkMode ? 'bg-red-500/15 text-red-400 border-red-500/25' : 'bg-red-50 text-red-600 border-red-200')
                                                    : (isDarkMode ? 'bg-white/[0.04] text-gray-500 border-white/[0.06] hover:bg-white/[0.06]' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100')
                                            }`}>
                                            {allSelected ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                                            {allSelected ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>

                                    {/* Progress */}
                                    <div className="mb-4">
                                        <div className={`h-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/[0.04]' : 'bg-red-50'}`}>
                                            <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-500"
                                                style={{ width: `${permProgress}%` }} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {Object.entries(permissionGroups).map(([groupName, perms]) => {
                                            const groupExpanded = expandedGroups[groupName] !== false;
                                            const groupPermKeys = perms.map(p => p.key);
                                            const allGroupSelected = groupPermKeys.every(k => formData.permissions.includes(k));
                                            const someGroupSelected = groupPermKeys.some(k => formData.permissions.includes(k));
                                            const selectedCount = formData.permissions.filter(p => groupPermKeys.includes(p)).length;

                                            return (
                                                <div key={groupName} className={`rounded-xl border overflow-hidden transition-all ${
                                                    isDarkMode
                                                        ? (allGroupSelected ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-white/[0.06]')
                                                        : (allGroupSelected ? 'border-red-200 bg-red-50/30' : 'border-gray-200')
                                                }`}>
                                                    <div className={`flex items-center justify-between px-4 py-3 cursor-pointer ${isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'} transition-colors`}>
                                                        <button type="button"
                                                            onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !groupExpanded }))}
                                                            className="flex items-center gap-2.5 flex-1 text-left">
                                                            {groupExpanded ? <ChevronDown className={`w-4 h-4 ${theme.subTextColor}`} /> : <ChevronRight className={`w-4 h-4 ${theme.subTextColor}`} />}
                                                            <span className={`text-sm font-semibold ${theme.headingColor}`}>{groupName}</span>
                                                            <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${
                                                                allGroupSelected
                                                                    ? (isDarkMode ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-600')
                                                                    : (isDarkMode ? 'bg-white/[0.06] text-gray-500' : 'bg-gray-100 text-gray-500')
                                                            }`}>
                                                                {selectedCount}/{perms.length}
                                                            </span>
                                                        </button>
                                                        <button type="button" onClick={() => toggleGroup(groupName)}
                                                            className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all ${
                                                                allGroupSelected
                                                                    ? (isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-600')
                                                                    : someGroupSelected
                                                                        ? (isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')
                                                                        : (isDarkMode ? 'bg-white/[0.04] text-gray-600' : 'bg-gray-100 text-gray-400')
                                                            }`}>
                                                            {allGroupSelected ? '✓ All' : someGroupSelected ? 'Partial' : 'None'}
                                                        </button>
                                                    </div>

                                                    {groupExpanded && (
                                                        <div className={`border-t ${isDarkMode ? 'border-white/[0.04]' : 'border-gray-100'}`}>
                                                            {perms.map((perm, permIdx) => {
                                                                const isChecked = formData.permissions.includes(perm.key);
                                                                return (
                                                                    <label key={perm.key}
                                                                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all ${
                                                                            isDarkMode
                                                                                ? (isChecked ? 'bg-red-500/[0.04]' : 'hover:bg-white/[0.02]')
                                                                                : (isChecked ? 'bg-red-50/50' : 'hover:bg-gray-50')
                                                                        } ${permIdx > 0 ? (isDarkMode ? 'border-t border-white/[0.02]' : 'border-t border-gray-50') : ''}`}>
                                                                        <input type="checkbox" checked={isChecked} onChange={() => togglePermission(perm.key)} className="sr-only" />
                                                                        <div className={`w-9 h-5 rounded-full relative transition-all duration-300 ${isChecked ? 'bg-red-500' : (isDarkMode ? 'bg-white/[0.08]' : 'bg-gray-200')}`}>
                                                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${isChecked ? 'left-[18px]' : 'left-0.5'}`} />
                                                                        </div>
                                                                        <span className={`text-sm font-medium flex-1 ${isChecked ? theme.headingColor : theme.subTextColor}`}>{perm.label}</span>
                                                                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${isDarkMode ? 'bg-white/[0.03] text-gray-600' : 'bg-gray-50 text-gray-400'}`}>{perm.key}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className={`flex justify-between items-center px-6 py-4 border-t ${theme.cardBorder} shrink-0 ${isDarkMode ? 'bg-white/[0.01]' : 'bg-gray-50/50'}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${isDarkMode ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-600'}`}>
                                        {formData.permissions.length}
                                    </div>
                                    <span className={`text-xs ${theme.subTextColor}`}>of {ALL_PERMISSION_DEFS.length} selected</span>
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium ${isDarkMode ? 'text-gray-500 hover:text-white hover:bg-white/[0.06]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} transition-all`}>
                                        Cancel
                                    </button>
                                    <button type="submit" className={`flex items-center gap-2 ${theme.btnPrimary} px-5 py-2 rounded-xl text-sm font-medium transition-all`}>
                                        <Save className="w-4 h-4" /> Save Role
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleManagement;
