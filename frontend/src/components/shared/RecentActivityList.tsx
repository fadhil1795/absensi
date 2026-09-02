import { Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface ActivityItem {
    id: string | number;
    user: string;
    action: string;
    time: string;
    status: 'success' | 'failed' | 'warning';
    details?: string;
}

interface RecentActivityListProps {
    activities: ActivityItem[];
    title?: string;
}

const RecentActivityList = ({ activities, title = "Recent Activity" }: RecentActivityListProps) => {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-400" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4 text-amber-400" />;
            default:
                return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <div className="bg-gray-900 border border-white/10 p-6 rounded-2xl h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View All</button>
            </div>

            <div className="space-y-4">
                {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                        <div className={`mt-1 p-2 rounded-lg ${activity.status === 'success' ? 'bg-emerald-500/10' :
                                activity.status === 'failed' ? 'bg-red-500/10' :
                                    'bg-amber-500/10'
                            }`}>
                            {getStatusIcon(activity.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-medium text-white truncate">{activity.user}</p>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {activity.time}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{activity.action}</p>
                            {activity.details && (
                                <p className="text-xs text-gray-500 mt-1 truncate">{activity.details}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentActivityList;
