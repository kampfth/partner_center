import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { SalesByWeekday } from '@/api/partnerApi';

interface WeekdayBarChartProps {
  data: SalesByWeekday[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Day names in English, Sunday to Saturday order
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--destructive))',
];

export default function WeekdayBarChart({ data }: WeekdayBarChartProps) {
  // Ensure all 7 days exist, ordered Sunday to Saturday
  const fullWeek = DAY_NAMES.map((dayName, i) => {
    const existing = data.find(d => d.day_of_week === i);
    return {
      day_of_week: i,
      day_name: dayName,
      total_sales: existing?.total_sales || 0,
      units: existing?.units || 0,
      dayLabel: dayName.substring(0, 3), // Sun, Mon, etc.
    };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={fullWeek} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis
          dataKey="dayLabel"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickFormatter={(value) => formatCurrency(value)}
          width={55}
        />
        <Tooltip
          cursor={false}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            padding: '8px 12px',
          }}
          labelStyle={{ 
            color: 'hsl(var(--foreground))', 
            fontWeight: 600,
            marginBottom: '4px'
          }}
          itemStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={(value, name) => {
            if (name === 'total_sales') return [formatCurrency(value as number), 'Sales'];
            return [value, 'Units'];
          }}
          labelFormatter={(label) => {
            const item = fullWeek.find(d => d.dayLabel === label);
            return item ? item.day_name : label;
          }}
        />
        <Bar dataKey="total_sales" radius={[4, 4, 0, 0]}>
          {fullWeek.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
