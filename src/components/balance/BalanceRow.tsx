import { cn } from '@/lib/utils';
import { formatCurrency } from './balanceFormat';

type RowType =
  | 'group'
  | 'product'
  | 'expense_fixed'
  | 'expense_variable'
  | 'withdrawal'
  | 'summary';

export function BalanceRow({
  rowType,
  rowKey,
  label,
  months,
  valuesByMonth,
  total,
  rightSlot,
  className,
}: {
  rowType: RowType;
  rowKey: string;
  label: string;
  months: string[]; // YYYY-MM
  valuesByMonth?: Record<string, number>;
  total?: number;
  rightSlot?: React.ReactNode;
  className?: string;
}) {
  const values = valuesByMonth ?? {};

  return (
    <div
      className={cn(
        'balanceRow grid items-center gap-2 px-3 py-2',
        'border-t border-border/60',
        className
      )}
      data-balance-row-type={rowType}
      data-balance-row-key={rowKey}
    >
      <div className="balanceLabelCell min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
      </div>

      <div className="balanceGridContents flex-1 flex items-center gap-2 overflow-x-auto">
        {months.map((ym) => (
          <div
            key={ym}
            className={cn(
              'balanceCell balanceValueCell tabular-nums',
              'min-w-[92px] text-right text-sm text-foreground/90'
            )}
            data-balance-col={ym}
            title={formatCurrency(values[ym] ?? 0)}
          >
            {values[ym] ? formatCurrency(values[ym]) : <span className="text-muted-foreground">—</span>}
          </div>
        ))}

        <div
          className={cn(
            'balanceCell balanceValueCell tabular-nums',
            'min-w-[110px] text-right text-sm font-semibold'
          )}
          data-balance-col="TOTAL"
          title={formatCurrency(total ?? 0)}
        >
          {total ? formatCurrency(total) : <span className="text-muted-foreground">—</span>}
        </div>
      </div>

      {rightSlot && <div className="balanceRightSlot flex items-center justify-end">{rightSlot}</div>}
    </div>
  );
}


