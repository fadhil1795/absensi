import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

interface DailyAttendanceChartProps {
    data: any[];
    title?: string;
}

const DailyAttendanceChart = ({ data, title = "Grafik Absensi Mingguan" }: DailyAttendanceChartProps) => {
    const { theme, isDarkMode } = useTheme();

    const isMultiStatus = data && data.length > 0 && ('hadir' in data[0] || 'terlambat' in data[0]);

    return (
        <div className={`${theme.cardBg} border ${theme.cardBorder} p-6 rounded-2xl transition-colors duration-300`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                <h3 className={`text-lg font-bold ${theme.headingColor}`}>{title}</h3>
                {isMultiStatus && (
                    <span className="text-xs text-gray-400">7 Hari Terakhir</span>
                )}
            </div>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} opacity={0.4} vertical={false} />
                        <XAxis
                            dataKey={isMultiStatus ? "date_label" : "name"}
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
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                                borderRadius: '0.75rem',
                                color: isDarkMode ? '#fff' : '#111827',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                fontSize: '12px'
                            }}
                            cursor={{ fill: isDarkMode ? '#374151' : '#f3f4f6', opacity: 0.15 }}
                        />
                        {isMultiStatus ? (
                            <>
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                                />
                                <Bar dataKey="hadir" name="Tepat Waktu" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
                                <Bar dataKey="terlambat" name="Terlambat" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={22} />
                                <Bar dataKey="alpa" name="Alpa" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={22} />
                            </>
                        ) : (
                            <Bar
                                dataKey="value"
                                name="Jumlah"
                                fill="#6366f1"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={30}
                            />
                        )}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DailyAttendanceChart;
