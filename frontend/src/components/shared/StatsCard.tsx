import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    description?: string;

    color?: 'indigo' | 'blue' | 'purple' | 'emerald' | 'orange' | 'red';
}

import { useTheme } from '../../context/ThemeContext';

const StatsCard = ({ title, value, icon: Icon, trend, description, color = 'indigo' }: StatsCardProps) => {
    const { theme } = useTheme();

    const colorClasses = {
        indigo: 'bg-indigo-500/20 text-indigo-400',
        blue: 'bg-blue-500/20 text-blue-400',
        purple: 'bg-purple-500/20 text-purple-400',
        emerald: 'bg-emerald-500/20 text-emerald-400',
        orange: 'bg-orange-500/20 text-orange-400',
        red: 'bg-red-500/20 text-red-400',
    };

    return (
        <div className={`${theme.cardBg} border ${theme.cardBorder} p-6 rounded-2xl relative overflow-hidden group transition-colors duration-300`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colorClasses[color]} transition-colors`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className={`flex items-center text-sm font-medium ${trend.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trend.isPositive ? '+' : ''}{trend.value}%
                    </div>
                )}
            </div>

            <h3 className={`${theme.subTextColor} font-medium text-sm mb-1`}>{title}</h3>
            <p className={`text-3xl font-bold ${theme.headingColor} mb-2`}>{value}</p>
            {description && <p className={`text-xs ${theme.subTextColor}`}>{description}</p>}

            {/* Background Glow - Reduced opacity for Light Mode compatibility */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity ${color === 'indigo' ? 'bg-indigo-600' :
                color === 'blue' ? 'bg-blue-600' :
                    color === 'purple' ? 'bg-purple-600' :
                        color === 'emerald' ? 'bg-emerald-600' :
                            color === 'orange' ? 'bg-orange-600' :
                                'bg-red-600'
                }`} />
        </div>
    );
};

export default StatsCard;
