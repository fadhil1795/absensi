import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Monitor, User } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface AuditLog {
    id: number;
    user_name: string;
    action: string;
    details: string;
    ip_address: string;
    created_at: string;
}

const AuditLog = () => {
    const { theme, isDarkMode } = useTheme();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/audit-logs?limit=50`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(res.data);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDetail = (detailStr: string) => {
        try {
            const obj = JSON.parse(detailStr);
            return (
                <pre className={`text-xs ${theme.subTextColor} ${isDarkMode ? 'bg-black/20' : 'bg-gray-100'} p-2 rounded overflow-auto max-w-xs`}>
                    {JSON.stringify(obj, null, 2)}
                </pre>
            );
        } catch (e) {
            return <span className={`${theme.subTextColor} text-sm`}>{detailStr}</span>;
        }
    };

    const getActionColor = (action: string) => {
        if (action.includes('DELETE')) return 'text-red-500';
        if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-amber-500';
        if (action.includes('LOGIN')) return 'text-emerald-500';
        return 'text-blue-500';
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className={`text-2xl font-bold ${theme.headingColor} flex items-center gap-2`}>
                    <ShieldAlert className={`w-6 h-6 ${isDarkMode ? 'text-indigo-400' : `text-${theme.primary}-600`}`} />
                    Audit Logs
                </h1>
                <p className={`${theme.subTextColor} text-sm mt-1`}>Track system activities and security events.</p>
            </div>

            <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-xl overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className={`${isDarkMode ? 'bg-[#1A1D21]' : 'bg-gray-50'} ${theme.subTextColor} text-xs font-medium border-b ${theme.cardBorder}`}>
                            <tr>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4 cursor-pointer">Action</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-200'} text-sm`}>
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading logs...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No logs found.</td></tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className={`${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                        <td className={`px-6 py-4 ${theme.subTextColor} whitespace-nowrap`}>
                                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                                        </td>
                                        <td className={`px-6 py-4 ${theme.headingColor} font-medium`}>
                                            <div className="flex items-center gap-2">
                                                <User className="w-3 h-3 text-gray-500" />
                                                {log.user_name || 'System'}
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 font-bold ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </td>
                                        <td className="px-6 py-4">
                                            {formatDetail(log.details)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                            <div className="flex items-center gap-2">
                                                <Monitor className="w-3 h-3" />
                                                {log.ip_address}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuditLog;
