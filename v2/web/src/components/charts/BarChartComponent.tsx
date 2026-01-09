import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ChartData {
  date: string;
  sales: number;
  units?: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(value);
}

function formatYAxis(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

function formatUnitsAxis(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

export default function BarChartComponent({ data }: { data: ChartData[] }) {
  const hasUnits = data.some(d => d.units !== undefined && d.units > 0);

  return (
    <div className="h-[200px] sm:h-[280px] -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: hasUnits ? 45 : 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="salesGradientGraphics" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            strokeOpacity={0.4}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="sales"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
            width={52}
          />
          {hasUnits && (
            <YAxis
              yAxisId="units"
              orientation="right"
              stroke="#22d3ee"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatUnitsAxis}
              width={40}
            />
          )}
          <Tooltip
            cursor={false}
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '13px',
            }}
            labelStyle={{ 
              color: 'hsl(var(--foreground))', 
              marginBottom: '4px', 
              fontWeight: 500 
            }}
            itemStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value, name) => {
              if (name === 'sales') return [formatCurrency(value as number), 'Sales'];
              if (name === 'units') return [(value as number).toLocaleString(), 'Units'];
              return [value, name];
            }}
          />
          {hasUnits && (
            <Legend 
              verticalAlign="top" 
              height={30}
              formatter={(value) => {
                if (value === 'sales') return 'Sales ($)';
                if (value === 'units') return 'Units';
                return value;
              }}
            />
          )}
          <Area
            yAxisId="sales"
            type="monotone"
            dataKey="sales"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#salesGradientGraphics)"
          />
          {hasUnits && (
            <Line
              yAxisId="units"
              type="monotone"
              dataKey="units"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#22d3ee' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
