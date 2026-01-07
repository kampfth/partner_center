import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BalanceResponse, Expense, Withdrawal } from '@/types';
import { formatCurrency, formatPercent, MONTH_LABELS_PT } from './balanceFormat';
import { Edit2, Trash2, Plus } from 'lucide-react';

type SortOrder = { value: string[] };

function toMonthHeader(ym: string): string {
  const parts = ym.split('-');
  if (parts.length !== 2) return ym;
  const m = Number(parts[1]);
  if (!Number.isFinite(m) || m < 1 || m > 12) return ym;
  return MONTH_LABELS_PT[m - 1];
}

function getMonthStatus(yearMonth: string, allMonths: string[]): 'current' | 'closed' | 'future' {
  if (allMonths.length === 0) return 'future';
  const latestMonth = allMonths[allMonths.length - 1];
  if (yearMonth === latestMonth) return 'current';
  if (yearMonth < latestMonth) return 'closed';
  return 'future';
}

function groupByNameAndMonth(entries: { name: string; year_month: string; amount: number; id: number }[]) {
  const byName: Record<string, { byMonth: Record<string, number>; ids: number[]; yearTotal: number }> = {};
  for (const e of entries) {
    if (!byName[e.name]) byName[e.name] = { byMonth: {}, ids: [], yearTotal: 0 };
    byName[e.name].byMonth[e.year_month] = (byName[e.name].byMonth[e.year_month] ?? 0) + Number(e.amount ?? 0);
    byName[e.name].yearTotal += Number(e.amount ?? 0);
    byName[e.name].ids.push(e.id);
  }
  return byName;
}

function groupWithdrawalsByMonth(withdrawals: Withdrawal[]) {
  const byMonth: Record<string, { amount: number; ids: number[] }> = {};
  for (const w of withdrawals) {
    if (!byMonth[w.year_month]) byMonth[w.year_month] = { amount: 0, ids: [] };
    byMonth[w.year_month].amount += Number(w.amount ?? 0);
    byMonth[w.year_month].ids.push(w.id);
  }
  return byMonth;
}

/**
 * Build product rows from autoRevenue.byLine following Sort Order.
 * The backend now uses the same RPC as Reports, so display_name matches exactly.
 * Only items in Sort Order are shown. Groups (type='Group') count as 1.
 */
function buildProductRows(
  data: BalanceResponse,
  sortOrder: SortOrder | null
): Array<{ key: string; label: string; byMonth: Record<string, number>; total: number; isGroup: boolean }> {
  const byLine = Array.isArray(data.autoRevenue?.byLine) ? data.autoRevenue.byLine : [];
  const orderItems = Array.isArray(sortOrder?.value) ? sortOrder.value : [];

  // Map display_name -> line data
  const lineByName = new Map<string, typeof byLine[0]>();
  for (const line of byLine) {
    lineByName.set(line.key, line);
  }

  const rows: Array<{ key: string; label: string; byMonth: Record<string, number>; total: number; isGroup: boolean }> = [];
  const usedNames = new Set<string>();

  // Add items in Sort Order
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

  return rows;
}

export function BalanceGridDesktop({
  data,
  sortOrder,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onAddWithdrawal,
  onEditWithdrawal,
  onDeleteWithdrawal,
}: {
  data: BalanceResponse;
  sortOrder: SortOrder | null;
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: number) => void;
  onAddWithdrawal: () => void;
  onEditWithdrawal: (withdrawal: Withdrawal) => void;
  onDeleteWithdrawal: (id: number) => void;
}) {
  const months = Array.isArray(data.months) ? data.months : [];
  const fixedExpenses = Array.isArray(data.fixedExpenses) ? data.fixedExpenses : [];
  const variableExpenses = Array.isArray(data.variableExpenses) ? data.variableExpenses : [];
  const withdrawals = Array.isArray(data.withdrawals) ? data.withdrawals : [];
  const partners = Array.isArray(data.partners) ? data.partners : [];

  // Debug logging for expenses
  console.log('Balance Debug - Fixed Expenses:', fixedExpenses);
  console.log('Balance Debug - Variable Expenses:', variableExpenses);

  const fixedByName = groupByNameAndMonth(fixedExpenses);
  const variableByName = groupByNameAndMonth(variableExpenses);
  const withdrawalsByMonth = groupWithdrawalsByMonth(withdrawals);
  
  console.log('Balance Debug - Fixed By Name:', fixedByName);
  console.log('Balance Debug - Variable By Name:', variableByName);
  console.log('Balance Debug - Withdrawals By Month:', withdrawalsByMonth);

  const productRows = buildProductRows(data, sortOrder);

  // Calculate totals
  const revenueTotal = productRows.reduce((sum, r) => sum + r.total, 0);
  const expenseTotal = data.computed?.yearTotals?.totalExpenses || 0;
  const withdrawalTotal = data.computed?.yearTotals?.totalWithdrawals || 0;
  const initialCash = data.initialCash || 0;
  const netTotal = initialCash + revenueTotal - expenseTotal - withdrawalTotal;

  return (
    <div className="space-y-3">
      {/* SUMMARY - Now at the top */}
      <Card className="bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="py-2">
          <CardTitle className="text-base">SUMMARY</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-card border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(revenueTotal)}</p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Expenses</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(expenseTotal + withdrawalTotal)}</p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Net</p>
              <p className={`text-lg font-bold tabular-nums ${netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netTotal)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Per Partner</p>
              <p className="text-lg font-bold tabular-nums">
                {formatCurrency(partners.length > 0 ? netTotal / partners.length : 0)}
              </p>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            % Expense/Revenue: <span className="font-semibold">{formatPercent(revenueTotal > 0 ? ((expenseTotal + withdrawalTotal) / revenueTotal) * 100 : 0)}</span>
          </div>
        </CardContent>
      </Card>

      {/* PRODUCTS */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-base">PRODUCTS</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="py-1.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Product</th>
                  {months.map((m) => {
                    const status = getMonthStatus(m, months);
                    return (
                      <th 
                        key={m} 
                        className={`py-1.5 px-1 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide ${
                          status === 'current' ? 'italic' : ''
                        } ${status === 'closed' ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                      >
                        {toMonthHeader(m)}
                      </th>
                    );
                  })}
                  <th className="py-1.5 px-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {productRows.length === 0 ? (
                  <tr>
                    <td colSpan={months.length + 2} className="py-6 text-center text-muted-foreground">
                      No products found. Configure Sort Order in Admin.
                    </td>
                  </tr>
                ) : (
                  <>
                    {productRows.map((r) => (
                      <tr key={r.key} className={r.isGroup ? 'bg-muted/30' : 'hover:bg-muted/20'}>
                        <td className={`py-1.5 px-2 ${r.isGroup ? 'font-semibold' : 'font-medium'}`}>{r.label}</td>
                        {months.map((m) => {
                          const status = getMonthStatus(m, months);
                          return (
                            <td 
                              key={m} 
                              className={`py-1.5 px-1 text-right tabular-nums ${
                                status === 'current' ? 'italic' : ''
                              } ${status === 'closed' ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                            >
                              {r.byMonth[m] ? formatCurrency(r.byMonth[m]) : <span className="text-muted-foreground/40">—</span>}
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-2 text-right font-semibold tabular-nums">
                          {r.total > 0 ? formatCurrency(r.total) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      </tr>
                    ))}
                    {/* TOTAL ROW */}
                    <tr className="border-t-2 border-border bg-muted/50">
                      <td className="py-2 px-2 font-bold text-sm">TOTAL</td>
                      {months.map((m) => {
                        const monthTotal = productRows.reduce((sum, r) => sum + (r.byMonth[m] || 0), 0);
                        const status = getMonthStatus(m, months);
                        return (
                          <td 
                            key={m} 
                            className={`py-2 px-1 text-right font-bold tabular-nums ${
                              status === 'current' ? 'italic' : ''
                            } ${status === 'closed' ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                          >
                            {monthTotal > 0 ? formatCurrency(monthTotal) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 text-right font-bold tabular-nums">
                        {formatCurrency(revenueTotal)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* EXPENSES */}
      <Card>
        <CardHeader className="py-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">EXPENSES</CardTitle>
          <Button size="sm" variant="outline" onClick={onAddExpense}>
            <Plus className="h-4 w-4 mr-1" />Add
          </Button>
        </CardHeader>
        <CardContent className="py-2">
          <Tabs defaultValue="fixed" className="w-full">
            <TabsList className="grid w-full max-w-xs grid-cols-2 h-8">
              <TabsTrigger value="fixed" className="text-xs">Fixed</TabsTrigger>
              <TabsTrigger value="variable" className="text-xs">Variable</TabsTrigger>
            </TabsList>
            <TabsContent value="fixed" className="mt-2">
              <div className="rounded border overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="py-1.5 px-2 text-xs font-medium text-muted-foreground uppercase">Name</th>
                      {months.map((m) => (
                        <th key={m} className="py-1.5 px-1 text-right text-xs font-medium text-muted-foreground uppercase">{toMonthHeader(m)}</th>
                      ))}
                      <th className="py-1.5 px-2 text-right text-xs font-medium text-muted-foreground uppercase">Total</th>
                      <th className="py-1.5 px-1 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {Object.keys(fixedByName).length === 0 ? (
                      <tr><td colSpan={months.length + 3} className="py-4 text-center text-muted-foreground text-xs">No fixed expenses.</td></tr>
                    ) : (
                      Object.entries(fixedByName).map(([name, agg]) => {
                        const first = fixedExpenses.find((e) => e.name === name);
                        return (
                          <tr key={name} className="hover:bg-muted/20">
                            <td className="py-1.5 px-2 font-medium">{name.toUpperCase()}</td>
                            {months.map((m) => (
                              <td key={m} className="py-1.5 px-1 text-right tabular-nums">
                                {agg.byMonth[m] ? formatCurrency(agg.byMonth[m]) : <span className="text-muted-foreground/40">—</span>}
                              </td>
                            ))}
                            <td className="py-1.5 px-2 text-right font-semibold tabular-nums">{formatCurrency(agg.yearTotal)}</td>
                            <td className="py-1.5 px-1">
                              {first && (
                                <div className="flex items-center gap-0.5 justify-end">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditExpense(first)}><Edit2 className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteExpense(first.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="variable" className="mt-2">
              <div className="rounded border overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="py-1.5 px-2 text-xs font-medium text-muted-foreground uppercase">Name</th>
                      {months.map((m) => (
                        <th key={m} className="py-1.5 px-1 text-right text-xs font-medium text-muted-foreground uppercase">{toMonthHeader(m)}</th>
                      ))}
                      <th className="py-1.5 px-2 text-right text-xs font-medium text-muted-foreground uppercase">Total</th>
                      <th className="py-1.5 px-1 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {Object.keys(variableByName).length === 0 ? (
                      <tr><td colSpan={months.length + 3} className="py-4 text-center text-muted-foreground text-xs">No variable expenses.</td></tr>
                    ) : (
                      Object.entries(variableByName).map(([name, agg]) => {
                        const first = variableExpenses.find((e) => e.name === name);
                        return (
                          <tr key={name} className="hover:bg-muted/20">
                            <td className="py-1.5 px-2 font-medium">{name.toUpperCase()}</td>
                            {months.map((m) => (
                              <td key={m} className="py-1.5 px-1 text-right tabular-nums">
                                {agg.byMonth[m] ? formatCurrency(agg.byMonth[m]) : <span className="text-muted-foreground/40">—</span>}
                              </td>
                            ))}
                            <td className="py-1.5 px-2 text-right font-semibold tabular-nums">{formatCurrency(agg.yearTotal)}</td>
                            <td className="py-1.5 px-1">
                              {first && (
                                <div className="flex items-center gap-0.5 justify-end">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditExpense(first)}><Edit2 className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteExpense(first.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* WITHDRAWALS */}
      <Card>
        <CardHeader className="py-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">WITHDRAWALS</CardTitle>
          <Button size="sm" variant="outline" onClick={onAddWithdrawal}>
            <Plus className="h-4 w-4 mr-1" />Add
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="py-1.5 px-2 text-xs font-medium text-muted-foreground uppercase">Withdrawal</th>
                  {months.map((m) => (
                    <th key={m} className="py-1.5 px-1 text-right text-xs font-medium text-muted-foreground uppercase">{toMonthHeader(m)}</th>
                  ))}
                  <th className="py-1.5 px-2 text-right text-xs font-medium text-muted-foreground uppercase">Total</th>
                  <th className="py-1.5 px-1 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {withdrawals.length === 0 ? (
                  <tr><td colSpan={months.length + 3} className="py-4 text-center text-muted-foreground text-xs">No withdrawals.</td></tr>
                ) : (
                  <tr className="hover:bg-muted/20">
                    <td className="py-1.5 px-2 font-medium">SHARED WITHDRAWALS</td>
                    {months.map((m) => {
                      const monthData = withdrawalsByMonth[m];
                      return (
                        <td key={m} className="py-1.5 px-1 text-right tabular-nums">
                          {monthData && monthData.amount > 0 ? formatCurrency(monthData.amount) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      );
                    })}
                    <td className="py-1.5 px-2 text-right font-semibold tabular-nums">
                      {withdrawalTotal > 0 ? formatCurrency(withdrawalTotal) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="py-1.5 px-1">
                      {withdrawals.length > 0 && (
                        <div className="flex items-center gap-0.5 justify-end">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditWithdrawal(withdrawals[0])}><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteWithdrawal(withdrawals[0].id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
