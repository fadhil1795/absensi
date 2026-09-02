import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

interface MonthlyAttendanceChartProps {
    data: any[];
    title?: string;
}

const MonthlyAttendanceChart = ({ data, title = "Monthly Attendance" }: MonthlyAttendanceChartProps) => {
    const { theme, isDarkMode } = useTheme();

    return (
        <div className={`${theme.cardBg} border ${theme.cardBorder} p-6 rounded-2xl transition-colors duration-300`}>
            <h3 className={`text-lg font-bold ${theme.headingColor} mb-6`}>{title}</h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} opacity={0.5} vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke={isDarkMode ? "#9ca3af" : "#6b7280"}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke={isDarkMode ? "#9ca3af" : "#6b7280"}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                                borderRadius: '0.5rem',
                                color: isDarkMode ? '#fff' : '#111827',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            itemStyle={{ color: '#10b981' }}
                            cursor={{ stroke: isDarkMode ? '#374151' : '#d1d5db', strokeWidth: 1 }}
                        />
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MonthlyAttendanceChart;
