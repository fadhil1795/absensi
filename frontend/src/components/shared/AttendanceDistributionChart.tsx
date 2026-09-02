import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AttendanceDistributionChartProps {
    data: { name: string; value: number; color: string }[];
    title?: string;
}

const AttendanceDistributionChart = ({ data, title = "Attendance Distribution" }: AttendanceDistributionChartProps) => {
    return (
        <div className="bg-gray-900 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-6">{title}</h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#111827',
                                border: '1px solid #374151',
                                borderRadius: '0.5rem',
                                color: '#fff'
                            }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default AttendanceDistributionChart;
