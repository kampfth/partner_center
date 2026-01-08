import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PieData {
  name: string;
  value: number;
  percentage: number;
  [key: string]: string | number; // Index signature for recharts compatibility
}

const COLORS = [
  'hsl(211, 100%, 50%)',  // primary blue
  'hsl(142, 70%, 45%)',   // green
  'hsl(38, 92%, 50%)',    // orange
  'hsl(280, 65%, 60%)',   // purple
  'hsl(0, 70%, 50%)',     // red
  'hsl(180, 60%, 45%)',   // cyan
  'hsl(320, 70%, 55%)',   // pink
  'hsl(60, 70%, 45%)',    // yellow
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductPieChart({ data }: { data: PieData[] }) {
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '13px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
            itemStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value, name, props) => [
              `${formatCurrency(value as number)} (${((props.payload as PieData).percentage).toFixed(1)}%)`,
              name
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span style={{ color: 'hsl(var(--foreground))', fontSize: '12px' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
