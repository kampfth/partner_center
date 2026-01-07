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
  // Reorder to start with Monday
  const reordered = [
    ...data.filter(d => d.day_of_week !== 0),
    ...data.filter(d => d.day_of_week === 0),
  ];

  // Get day abbreviations
  const formatted = reordered.map(d => ({
    ...d,
    dayLabel: d.day_name.substring(0, 3), // Mon, Tue, etc.
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis
          dataKey="dayLabel"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickFormatter={(value) => formatCurrency(value)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            color: 'hsl(var(--foreground))',
          }}
          formatter={(value: number, name: string) => {
            if (name === 'total_sales') return [formatCurrency(value), 'Sales'];
            return [value, 'Units'];
          }}
          labelFormatter={(label) => {
            const item = formatted.find(d => d.dayLabel === label);
            return item ? item.day_name : label;
          }}
        />
        <Bar dataKey="total_sales" radius={[4, 4, 0, 0]}>
          {formatted.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

