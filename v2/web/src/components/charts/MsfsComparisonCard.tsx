import type { SalesByMsfsVersion } from '@/api/partnerApi';

interface MsfsComparisonCardProps {
  data: SalesByMsfsVersion[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function MsfsComparisonCard({ data }: MsfsComparisonCardProps) {
  // Handle both old format (MSFS2020/MSFS2024) and new format (2020/2024)
  const msfs2020 = data.find(d => d.version === '2020' || d.version === 'MSFS2020') || { total_sales: 0, units: 0 };
  const msfs2024 = data.find(d => d.version === '2024' || d.version === 'MSFS2024') || { total_sales: 0, units: 0 };
  const unknown = data.find(d => d.version === 'Unknown' || d.version === null || (d.version !== '2020' && d.version !== '2024' && d.version !== 'MSFS2020' && d.version !== 'MSFS2024')) || { total_sales: 0, units: 0 };

  const total = msfs2020.total_sales + msfs2024.total_sales + unknown.total_sales;
  const percent2020 = total > 0 ? (msfs2020.total_sales / total) * 100 : 0;
  const percent2024 = total > 0 ? (msfs2024.total_sales / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* MSFS 2020 */}
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-baseline gap-2 mb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">MSFS 2020</p>
            <p className="text-xs text-muted-foreground">{percent2020.toFixed(1)}%</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(msfs2020.total_sales)}</p>
          <p className="text-xs text-muted-foreground mt-1">{msfs2020.units} units sold</p>
        </div>

        {/* MSFS 2024 */}
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-baseline gap-2 mb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">MSFS 2024</p>
            <p className="text-xs text-muted-foreground">{percent2024.toFixed(1)}%</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(msfs2024.total_sales)}</p>
          <p className="text-xs text-muted-foreground mt-1">{msfs2024.units} units sold</p>
        </div>
      </div>

      {/* Visual comparison bar - Orange for 2020, Purple for 2024 */}
      <div className="space-y-2">
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
          {percent2020 > 0 && (
            <div
              className="h-full bg-orange-500"
              style={{ width: `${percent2020}%` }}
              title={`MSFS 2020: ${percent2020.toFixed(1)}%`}
            />
          )}
          {percent2024 > 0 && (
            <div
              className="h-full bg-purple-500"
              style={{ width: `${percent2024}%` }}
              title={`MSFS 2024: ${percent2024.toFixed(1)}%`}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            2020 leads
          </span>
          <span className="flex items-center gap-1">
            2024 leads
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          </span>
        </div>
      </div>

      {unknown.total_sales > 0 && (
        <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Unknown version:</span> {formatCurrency(unknown.total_sales)} ({unknown.units} units)
          </p>
        </div>
      )}
    </div>
  );
}
