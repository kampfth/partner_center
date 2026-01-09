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
    isHot: d.total_sales === maxSales && d.total_sales > 0,
    label: `${d.time_bucket} UTC`,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis
          dataKey="time_bucket"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={50}
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
          labelFormatter={(label) => `${label} UTC`}
        />
        <Bar dataKey="total_sales" radius={[3, 3, 0, 0]}>
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
