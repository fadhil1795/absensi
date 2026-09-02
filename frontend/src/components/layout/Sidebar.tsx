import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
    LayoutDashboard,
    Building2,
    Users,
    Cpu,
    ClipboardList,
    LogOut,
    Settings,
    Shield,
    Briefcase,
    Calendar,
    FileText,
    Activity,
    ShieldAlert,
    ChevronDown,
    ChevronRight,
    Phone,
    Megaphone,
    CalendarCheck
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    role: string;
}

const Sidebar = ({ isOpen, onClose, role }: SidebarProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme } = useTheme();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userPermissions: string[] = user.permissions || [];
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const hasNoPermissionsData = !user.permissions;

    const hasPermission = (permKey: string) => {
        if (isSuperAdmin) return true;
        if (hasNoPermissionsData) return true;
        return userPermissions.includes(permKey);
    };

    const menuGroups = [
        {
            title: 'General',
            items: [
                { title: 'Overview', path: '/dashboard', icon: LayoutDashboard, permKey: 'dashboard' }
            ]
        },
        {
            title: 'User Management',
            items: [
                { title: 'Employees', path: '/dashboard/karyawan', icon: Users, permKey: 'employees' },
                { title: 'Mobile Users', path: '/dashboard/mobile-users', icon: Phone, permKey: 'mobile_users' },
                { title: 'Sesi / Mata Pelajaran', path: '/dashboard/shifts', icon: Settings, permKey: 'shifts' },
                { title: 'Manage Admins', path: '/dashboard/admins', icon: Shield, permKey: 'admins' },
                { title: 'Role Management', path: '/dashboard/roles', icon: ShieldAlert, permKey: 'roles' },
            ]
        },
        {
            title: 'Organization',
            items: [
                { title: 'Departemens', path: '/dashboard/departemen', icon: Briefcase, permKey: 'departments' },
                { title: 'Instansi', path: '/dashboard/instansi', icon: Building2, permKey: 'instansi' },
                { title: 'Mesin Absensi', path: '/dashboard/mesin', icon: Cpu, permKey: 'machines' },
                { title: 'Manajemen Jadwal', path: '/dashboard/schedule', icon: Calendar, permKey: 'schedule' },
            ]
        },
        {
            title: 'Attendance',
            items: [
                { title: 'Live Monitoring', path: '/dashboard/realtime', icon: Activity, permKey: 'realtime' },
                { title: 'Rekap Shift', path: '/dashboard/rekap', icon: ClipboardList, permKey: 'rekap' },
                { title: 'Audit Logs', path: '/dashboard/audit-logs', icon: ShieldAlert, permKey: 'audit_logs' },
            ]
        },
        {
            title: 'Leave Management',
            items: [
                { title: 'Leave Requests', path: '/dashboard/izin', icon: FileText, permKey: 'leaves' },
                { title: 'Holidays', path: '/dashboard/holidays', icon: Calendar, permKey: 'holidays' },
                { title: 'Hari Kerja', path: '/dashboard/work-days', icon: CalendarCheck, permKey: 'holidays' },
            ]
        },
        {
            title: 'Communication',
            items: [
                { title: 'Information', path: '/dashboard/information', icon: Megaphone, permKey: 'information' },
            ]
        },
        {
            title: 'Reports',
            items: [
                { title: 'Laporan Absensi', path: '/dashboard/laporan', icon: ClipboardList, permKey: 'reports' },
            ]
        }
    ];

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        'General': true,
        'User Management': true,
        'Organization': true,
        'Attendance': true,
        'Leave Management': true,
        'Communication': true,
        'Reports': true
    });

    const toggleGroup = (groupTitle: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupTitle]: !prev[groupTitle]
        }));
    };

    const handleSignOut = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 z-50 h-screen w-72
                ${theme.sidebarBg} ${theme.sidebarBorder}
                transition-all duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                shadow-2xl shadow-black/10
            `}>
                {/* Logo Section */}
                <div className={`flex items-center gap-3 px-6 h-16 border-b border-white/[0.08]`}>
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                        <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                    </div>
                    <div>
                        <span className="text-lg font-bold text-white tracking-tight">PERPENAS</span>
                        <p className="text-[10px] text-white/40 -mt-0.5 uppercase tracking-widest">Attendance System</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="px-3 py-4 space-y-5 overflow-y-auto max-h-[calc(100vh-9rem)] custom-scrollbar">
                    {menuGroups.map((group) => {
                        const visibleItems = group.items.filter(item => hasPermission(item.permKey));
                        if (visibleItems.length === 0) return null;

                        const isExpanded = expandedGroups[group.title];

                        return (
                            <div key={group.title}>
                                {group.title !== 'General' && (
                                    <button
                                        onClick={() => toggleGroup(group.title)}
                                        className="flex items-center justify-between w-full px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 hover:text-white/50 transition-colors"
                                    >
                                        <span>{group.title}</span>
                                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    </button>
                                )}

                                <div className={`space-y-0.5 transition-all duration-300 ${isExpanded ? 'block' : 'hidden'}`}>
                                    {visibleItems.map((item, index) => {
                                        const isActive = location.pathname === item.path;
                                        const Icon = item.icon;

                                        return (
                                            <Link
                                                key={index}
                                                to={item.path}
                                                onClick={() => window.innerWidth < 1024 && onClose()}
                                                className={`
                                                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative
                                                    ${isActive
                                                        ? 'bg-white/15 text-white shadow-sm'
                                                        : 'text-white/60 hover:text-white hover:bg-white/[0.07]'
                                                    }
                                                `}
                                            >
                                                {isActive && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full" />
                                                )}
                                                <Icon className={`w-[18px] h-[18px] transition-all duration-200 ${isActive ? 'text-white' : 'group-hover:scale-105'}`} />
                                                <span className="font-medium text-[13px]">{item.title}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 w-full p-3 border-t border-white/[0.06]">
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg
                        text-white/50 hover:bg-white/[0.07] hover:text-white transition-all duration-200 group"
                    >
                        <LogOut className="w-[18px] h-[18px] transition-transform group-hover:-translate-x-0.5" />
                        <span className="font-medium text-[13px]">Sign Out</span>
                    </button>

                    <div className="mt-2 mx-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.04]">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <p className="text-[11px] text-white/40 font-medium">System Online</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
