import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { SalesByTimeBucket } from '@/api/partnerApi';

interface HotTimeChartProps {
  data: SalesByTimeBucket[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function HotTimeChart({ data }: HotTimeChartProps) {
  // Find the hot time bucket (highest sales)
  const maxSales = Math.max(...data.map(d => d.total_sales));
  
  const formatted = data.map(d => ({
    ...d,
    isHot: d.total_sales === maxSales,
    label: `${d.time_bucket} UTC`,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis
          dataKey="time_bucket"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          label={{ value: 'Time (UTC)', position: 'insideBottom', offset: -5, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 } }}
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
          formatter={(value, name) => {
            if (name === 'total_sales') return [formatCurrency(value as number), 'Sales'];
            return [value, 'Units'];
          }}
          labelFormatter={(label) => `${label} UTC`}
        />
        <Bar dataKey="total_sales" radius={[4, 4, 0, 0]}>
          {formatted.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.isHot ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
