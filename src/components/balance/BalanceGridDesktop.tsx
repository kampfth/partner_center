import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BalanceResponse, Expense, Withdrawal, Partner } from '@/types';
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

function getMonthStatus(yearMonth: string, months: string[], data: BalanceResponse): 'current' | 'closed' | 'future' {
  if (months.length === 0) return 'future';
  
  let latestMonthWithData: string | null = null;
  for (let i = months.length - 1; i >= 0; i--) {
    const m = months[i];
    const hasData = (data.autoRevenue?.byMonth?.[m] ?? 0) > 0;
    if (hasData) {
      latestMonthWithData = m;
      break;
    }
  }
  
  if (!latestMonthWithData) return 'future';
  if (yearMonth === latestMonthWithData) return 'current';
  if (yearMonth < latestMonthWithData) return 'closed';
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

/**
 * Agrupa withdrawals por parceiro
 * Cada withdrawal tem partner_id que corresponde ao id do partner
 */
function buildWithdrawalsByPartner(
  withdrawals: Withdrawal[],
  partners: Partner[]
): Record<string, { byMonth: Record<string, number>; yearTotal: number; withdrawalIds: number[] }> {
  const result: Record<string, { byMonth: Record<string, number>; yearTotal: number; withdrawalIds: number[] }> = {};
  
  // Inicializa para todos os partners
  for (const partner of partners) {
    result[partner.id] = { byMonth: {}, yearTotal: 0, withdrawalIds: [] };
  }
  
  // Agrupa withdrawals
  for (const w of withdrawals) {
    const pid = w.partner_id;
    if (!pid) continue;
    
    // Encontra o partner correspondente (case-insensitive)
    let targetId: string | null = null;
    for (const p of partners) {
      if (p.id === pid || p.id.toLowerCase() === pid.toLowerCase()) {
        targetId = p.id;
        break;
      }
    }
    
    if (targetId && result[targetId]) {
      const amount = Number(w.amount) || 0;
      result[targetId].byMonth[w.year_month] = (result[targetId].byMonth[w.year_month] || 0) + amount;
      result[targetId].yearTotal += amount;
      result[targetId].withdrawalIds.push(w.id);
    }
  }
  
  return result;
}

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
  // Extrai dados com fallbacks seguros
  const months = Array.isArray(data.months) ? data.months : [];
  const fixedExpenses = Array.isArray(data.fixedExpenses) ? data.fixedExpenses : [];
  const variableExpenses = Array.isArray(data.variableExpenses) ? data.variableExpenses : [];
  const withdrawals = Array.isArray(data.withdrawals) ? data.withdrawals : [];
  const partners = Array.isArray(data.partners) ? data.partners : [];

  // Agrupa expenses
  const allExpenses = [...fixedExpenses, ...variableExpenses];
  const allExpensesByName = groupByNameAndMonth(allExpenses);
  
  // Agrupa withdrawals por partner
  const withdrawalsByPartner = buildWithdrawalsByPartner(withdrawals, partners);

  // Calcula produto rows
  const productRows = buildProductRows(data, sortOrder);

  // Calcula totais
  const revenueTotal = productRows.reduce((sum, r) => sum + r.total, 0);
  const expenseTotal = data.computed?.yearTotals?.totalExpenses || 0;
  const withdrawalTotal = data.computed?.yearTotals?.totalWithdrawals || 0;
  const initialCash = data.initialCash || 0;
  const netTotal = initialCash + revenueTotal - expenseTotal - withdrawalTotal;

  return (
    <div className="space-y-3">
      {/* SUMMARY */}
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
                    const status = getMonthStatus(m, months, data);
                    return (
                      <th 
                        key={m} 
                        className={`py-1.5 px-1 text-right text-xs font-medium uppercase tracking-wide ${
                          status === 'current' ? 'italic text-foreground' : 'text-muted-foreground'
                        } ${status === 'closed' ? 'bg-green-50 dark:bg-green-950/20 font-bold' : ''}`}
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
                          const status = getMonthStatus(m, months, data);
                          return (
                            <td 
                              key={m} 
                              className={`py-1.5 px-1 text-right tabular-nums ${
                                status === 'current' ? 'italic' : ''
                              } ${status === 'closed' ? 'bg-green-50 dark:bg-green-950/20 font-bold' : ''}`}
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
                    <tr className="border-t-2 border-border bg-muted/50">
                      <td className="py-2 px-2 font-bold text-sm">TOTAL</td>
                      {months.map((m) => {
                        const monthTotal = productRows.reduce((sum, r) => sum + (r.byMonth[m] || 0), 0);
                        const status = getMonthStatus(m, months, data);
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
        <CardContent className="p-0">
          <div className="overflow-x-auto">
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
                {Object.keys(allExpensesByName).length === 0 ? (
                  <tr><td colSpan={months.length + 3} className="py-4 text-center text-muted-foreground text-xs">No expenses.</td></tr>
                ) : (
                  Object.entries(allExpensesByName).map(([name, agg]) => {
                    const first = allExpenses.find((e) => e.name === name);
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
                  <th className="py-1.5 px-2 text-xs font-medium text-muted-foreground uppercase">Partner</th>
                  {months.map((m) => (
                    <th key={m} className="py-1.5 px-1 text-right text-xs font-medium text-muted-foreground uppercase">{toMonthHeader(m)}</th>
                  ))}
                  <th className="py-1.5 px-2 text-right text-xs font-medium text-muted-foreground uppercase">Total</th>
                  <th className="py-1.5 px-1 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {partners.length === 0 ? (
                  <tr><td colSpan={months.length + 3} className="py-4 text-center text-muted-foreground text-xs">No partners configured.</td></tr>
                ) : (
                  partners.map((partner) => {
                    const partnerData = withdrawalsByPartner[partner.id] || { byMonth: {}, yearTotal: 0, withdrawalIds: [] };
                    // Encontra o primeiro withdrawal deste partner para edição/exclusão
                    const firstWithdrawal = withdrawals.find((w) => w.partner_id === partner.id);
                    
                    return (
                      <tr key={partner.id} className="hover:bg-muted/20">
                        <td className="py-1.5 px-2 font-medium">{partner.name.toUpperCase()}</td>
                        {months.map((m) => (
                          <td key={m} className="py-1.5 px-1 text-right tabular-nums">
                            {partnerData.byMonth[m] ? formatCurrency(partnerData.byMonth[m]) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                        ))}
                        <td className="py-1.5 px-2 text-right font-semibold tabular-nums">
                          {partnerData.yearTotal > 0 ? formatCurrency(partnerData.yearTotal) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="py-1.5 px-1">
                          {firstWithdrawal && (
                            <div className="flex items-center gap-0.5 justify-end">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditWithdrawal(firstWithdrawal)}><Edit2 className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteWithdrawal(firstWithdrawal.id)}><Trash2 className="h-3 w-3" /></Button>
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
        </CardContent>
      </Card>
    </div>
  );
}
