import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

interface DailyAttendanceChartProps {
    data: any[];
    title?: string;
}

const DailyAttendanceChart = ({ data, title = "Daily Attendance" }: DailyAttendanceChartProps) => {
    const { theme, isDarkMode } = useTheme();

    return (
        <div className={`${theme.cardBg} border ${theme.cardBorder} p-6 rounded-2xl transition-colors duration-300`}>
            <h3 className={`text-lg font-bold ${theme.headingColor} mb-6`}>{title}</h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                            itemStyle={{ color: '#6366f1' }}
                            cursor={{ fill: isDarkMode ? '#374151' : '#f3f4f6', opacity: 0.2 }}
                        />
                        <Bar
                            dataKey="value"
                            fill="#6366f1"
                            radius={[4, 4, 0, 0]}
                            barSize={30}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DailyAttendanceChart;
