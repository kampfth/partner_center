import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { BalanceResponse } from '@/types';
import { formatCurrency, formatPercent, MONTH_LABELS_PT, yearMonthToMonthIndex } from './balanceFormat';
import { Plus } from 'lucide-react';

type SortOrder = { value: string[] };

function monthLabelFromYearMonth(ym: string): string {
  const idx = yearMonthToMonthIndex(ym);
  if (idx === null) return ym;
  return MONTH_LABELS_PT[idx];
}

function sumByMonth(entries: { year_month: string; amount: number }[]) {
  const out: Record<string, number> = {};
  for (const e of entries) {
    out[e.year_month] = (out[e.year_month] ?? 0) + Number(e.amount ?? 0);
  }
  return out;
}

/**
 * Build product rows from autoRevenue.byLine following Sort Order.
 * Products not in sortOrder are added at the end, sorted by total descending.
 */
function buildProductRows(
  data: BalanceResponse,
  sortOrder: SortOrder | null
): Array<{ key: string; label: string; byMonth: Record<string, number>; total: number; isGroup: boolean }> {
  const byLine = Array.isArray(data.autoRevenue?.byLine) ? data.autoRevenue.byLine : [];
  const orderItems = Array.isArray(sortOrder?.value) ? sortOrder.value : [];

  const lineByName = new Map<string, typeof byLine[0]>();
  for (const line of byLine) {
    lineByName.set(line.key, line);
  }

  const rows: Array<{ key: string; label: string; byMonth: Record<string, number>; total: number; isGroup: boolean }> = [];
  const usedNames = new Set<string>();

  // 1. First add products that are in the sortOrder (preserving order)
  for (const name of orderItems) {
    const trimmed = String(name ?? '').trim();
    if (!trimmed || usedNames.has(trimmed)) continue;

    const line = lineByName.get(trimmed);
    if (line) {
      rows.push({
        key: trimmed,
        label: trimmed.toUpperCase(),
        byMonth: line.byMonth || {},
        total: line.yearTotal || 0,
        isGroup: line.type === 'Group',
      });
      usedNames.add(trimmed);
    }
  }

  // 2. Then add products that exist in data but are NOT in sortOrder (sorted by total desc)
  const unsortedProducts = byLine
    .filter(line => !usedNames.has(line.key))
    .sort((a, b) => (b.yearTotal || 0) - (a.yearTotal || 0));

  for (const line of unsortedProducts) {
    rows.push({
      key: line.key,
      label: line.key.toUpperCase(),
      byMonth: line.byMonth || {},
      total: line.yearTotal || 0,
      isGroup: line.type === 'Group',
    });
  }

  return rows;
}

export function BalanceListMobile({
  data,
  sortOrder,
  activeMonth,
  onChangeMonth,
  onAddExpense,
  onAddWithdrawal,
}: {
  data: BalanceResponse;
  sortOrder: SortOrder | null;
  activeMonth: string;
  onChangeMonth: (month: string) => void;
  onAddExpense: () => void;
  onAddWithdrawal: () => void;
}) {
  const months = Array.isArray(data.months) ? data.months : [];
  const fixedExpenses = Array.isArray(data.fixedExpenses) ? data.fixedExpenses : [];
  const variableExpenses = Array.isArray(data.variableExpenses) ? data.variableExpenses : [];
  const withdrawals = Array.isArray(data.withdrawals) ? data.withdrawals : [];
  const partners = Array.isArray(data.partners) ? data.partners : [];

  const monthOptions = [...months, 'TOTAL'];
  const productRows = buildProductRows(data, sortOrder);

  const fixedByMonth = sumByMonth(fixedExpenses);
  const variableByMonth = sumByMonth(variableExpenses);
  // Note: withdrawals are handled per month in the UI below

  const isTotal = activeMonth === 'TOTAL';

  // Calculate totals
  const revenueTotal = productRows.reduce((sum, r) => sum + r.total, 0);
  const expenseTotal = data.computed?.yearTotals?.totalExpenses || 0;
  const withdrawalTotal = data.computed?.yearTotals?.totalWithdrawals || 0;
  const initialCash = data.initialCash || 0;
  const netTotal = initialCash + revenueTotal - expenseTotal - withdrawalTotal;

  return (
    <div className="space-y-3">
      {/* Month selector */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-sm">MONTH</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ToggleGroup
            type="single"
            value={activeMonth}
            onValueChange={(v: string) => v && onChangeMonth(v)}
            className="flex flex-wrap justify-start gap-1"
          >
            {monthOptions.map((m) => (
              <ToggleGroupItem key={m} value={m} className="h-8 px-2 text-xs">
                {m === 'TOTAL' ? 'TOTAL' : monthLabelFromYearMonth(m)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardContent>
      </Card>

      {/* Summary at top */}
      <Card className="bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="py-2">
          <CardTitle className="text-sm">SUMMARY</CardTitle>
        </CardHeader>
        <CardContent className="py-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-card border">
              <p className="text-xs text-muted-foreground">INITIAL CASH</p>
              <p className="text-sm font-bold tabular-nums">{formatCurrency(initialCash)}</p>
            </div>
            <div className="p-2 rounded bg-card border">
              <p className="text-xs text-muted-foreground">REVENUE</p>
              <p className="text-sm font-bold tabular-nums">{formatCurrency(revenueTotal)}</p>
            </div>
            <div className="p-2 rounded bg-card border">
              <p className="text-xs text-muted-foreground">EXPENSES</p>
              <p className="text-sm font-bold tabular-nums">{formatCurrency(expenseTotal + withdrawalTotal)}</p>
            </div>
            <div className="p-2 rounded bg-card border">
              <p className="text-xs text-muted-foreground">NET</p>
              <p className={`text-sm font-bold tabular-nums ${netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netTotal)}
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            % Expense/Revenue: <span className="font-semibold">{formatPercent(revenueTotal > 0 ? ((expenseTotal + withdrawalTotal) / revenueTotal) * 100 : 0)}</span>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={['products']} className="w-full">
        {/* Products */}
        <AccordionItem value="products">
          <AccordionTrigger className="py-2 text-sm">PRODUCTS</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1">
              {productRows.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No products. Configure Sort Order.</p>
              ) : (
                productRows.map((r) => {
                  const value = isTotal ? r.total : (r.byMonth[activeMonth] || 0);
                  return (
                    <div key={r.key} className={`flex items-center justify-between py-1.5 border-b border-border/30 ${r.isGroup ? 'bg-muted/30' : ''}`}>
                      <span className={`text-xs ${r.isGroup ? 'font-semibold' : 'font-medium'}`}>{r.label}</span>
                      <span className="text-xs font-semibold tabular-nums">
                        {value > 0 ? formatCurrency(value) : <span className="text-muted-foreground/50">—</span>}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Expenses */}
        <AccordionItem value="expenses">
          <AccordionTrigger className="py-2 text-sm">EXPENSES</AccordionTrigger>
          <AccordionContent>
            <Button size="sm" onClick={onAddExpense} className="h-8 mb-2 w-full">
              <Plus className="h-3 w-3 mr-1" />Add Expense
            </Button>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                <span className="text-xs text-muted-foreground">FIXED</span>
                <span className="text-xs font-semibold tabular-nums">
                  {formatCurrency(isTotal ? Object.values(fixedByMonth).reduce((a, b) => a + b, 0) : (fixedByMonth[activeMonth] || 0))}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                <span className="text-xs text-muted-foreground">VARIABLE</span>
                <span className="text-xs font-semibold tabular-nums">
                  {formatCurrency(isTotal ? Object.values(variableByMonth).reduce((a, b) => a + b, 0) : (variableByMonth[activeMonth] || 0))}
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Withdrawals */}
        <AccordionItem value="withdrawals">
          <AccordionTrigger className="py-2 text-sm">WITHDRAWALS</AccordionTrigger>
          <AccordionContent>
            <Button size="sm" onClick={onAddWithdrawal} className="h-8 mb-2 w-full">
              <Plus className="h-3 w-3 mr-1" />Add Withdrawal
            </Button>
            <div className="space-y-1">
              {partners.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No partners.</p>
              ) : (
                partners.map((p) => {
                  const pWithdrawals = withdrawals.filter((w) => w.partner_id === p.id);
                  const byMonth = sumByMonth(pWithdrawals);
                  const value = isTotal ? Object.values(byMonth).reduce((a, b) => a + b, 0) : (byMonth[activeMonth] || 0);
                  return (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/30">
                      <span className="text-xs font-medium">{p.name.toUpperCase()}</span>
                      <span className="text-xs font-semibold tabular-nums">
                        {value > 0 ? formatCurrency(value) : <span className="text-muted-foreground/50">—</span>}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
