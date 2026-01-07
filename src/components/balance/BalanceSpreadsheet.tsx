import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  BalanceResponse,
  Expense,
  Withdrawal,
} from '@/types/balance';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const MONTH_NAMES = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
];

interface BalanceSpreadsheetProps {
  data: BalanceResponse;
  year: number;
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: number) => void;
  onAddWithdrawal: () => void;
  onEditWithdrawal: (withdrawal: Withdrawal) => void;
  onDeleteWithdrawal: (id: number) => void;
}

export function BalanceSpreadsheet({
  data,
  year,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onAddWithdrawal,
  onEditWithdrawal,
  onDeleteWithdrawal,
}: BalanceSpreadsheetProps) {
  const { computed } = data;
  
  // Ensure all arrays exist with defensive checks
  const partners = Array.isArray(data?.partners) ? data.partners : [];
  const months = Array.isArray(data?.months) ? data.months : [];
  const autoRevenue = data?.autoRevenue || {};
  const autoRevenueByLine = Array.isArray(autoRevenue?.byLine) ? autoRevenue.byLine : [];
  const manualRevenueAdjustments = Array.isArray(data?.manualRevenueAdjustments) ? data.manualRevenueAdjustments : [];

  // Organize products from autoRevenue.byLine
  const products = autoRevenueByLine.map((line) => ({
    name: line.key,
    byMonth: line.byMonth || {},
    yearTotal: line.yearTotal || 0,
  }));

  // Organize withdrawals by partner (aggregate by month)
  const withdrawalsByPartner: Record<string, { partnerName: string; byMonth: Record<string, number>; yearTotal: number }> = {};
  partners.forEach((partner) => {
    withdrawalsByPartner[partner.id] = {
      partnerName: partner.name,
      byMonth: {},
      yearTotal: 0,
    };
  });

  // Ensure withdrawals is an array
  const withdrawals = Array.isArray(data.withdrawals) ? data.withdrawals : [];
  withdrawals.forEach((withdrawal) => {
    const month = withdrawal.year_month;
    const partnerId = withdrawal.partner_id;
    if (!withdrawalsByPartner[partnerId]) {
      withdrawalsByPartner[partnerId] = {
        partnerName: partners.find((p) => p.id === partnerId)?.name || partnerId,
        byMonth: {},
        yearTotal: 0,
      };
    }
    withdrawalsByPartner[partnerId].byMonth[month] =
      (withdrawalsByPartner[partnerId].byMonth[month] || 0) + withdrawal.amount;
    withdrawalsByPartner[partnerId].yearTotal += withdrawal.amount;
  });

  // Organize expenses by category and month
  const fixedExpensesByMonth: Record<string, Record<string, number>> = {}; // expenseName -> month -> amount
  const variableExpensesByMonth: Record<string, Record<string, number>> = {};

  // Ensure arrays exist
  const fixedExpenses = Array.isArray(data.fixedExpenses) ? data.fixedExpenses : [];
  const variableExpenses = Array.isArray(data.variableExpenses) ? data.variableExpenses : [];

  fixedExpenses.forEach((expense) => {
    if (!fixedExpensesByMonth[expense.name]) {
      fixedExpensesByMonth[expense.name] = {};
    }
    fixedExpensesByMonth[expense.name][expense.year_month] = expense.amount;
  });

  variableExpenses.forEach((expense) => {
    if (!variableExpensesByMonth[expense.name]) {
      variableExpensesByMonth[expense.name] = {};
    }
    variableExpensesByMonth[expense.name][expense.year_month] = expense.amount;
  });

  const renderCell = (value: number | undefined, className = '') => {
    if (value === undefined || value === 0) {
      return <td className={`p-2 text-right border border-border ${className}`}></td>;
    }
    return (
      <td className={`p-2 text-right font-mono text-sm border border-border ${className}`}>
        {formatCurrency(value)}
      </td>
    );
  };

  const renderHeaderCell = (text: string, className = '') => (
    <th className={`p-2 text-center font-semibold bg-[#666666] text-white border border-border ${className}`}>
      {text}
    </th>
  );

  const renderLabelCell = (text: string, className = '', isBold = false) => (
    <td className={`p-2 text-left border border-border ${isBold ? 'font-bold' : ''} ${className}`}>
      {text}
    </td>
  );

  return (
    <div className="overflow-x-auto border border-border rounded-lg bg-background">
      <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
        <thead>
          <tr>
            {renderLabelCell(`CAIXA ${year - 1}`, 'bg-[#666666] text-white sticky left-0 z-10', true)}
            {renderCell(data.previousYearCash, 'bg-[#666666] text-white')}
            {months.slice(1).map(() => (
              <td key={Math.random()} className="p-2 border border-border bg-[#666666]"></td>
            ))}
            <td className="p-2 border border-border bg-[#666666]"></td>
            <td className="p-2 border border-border bg-[#666666]"></td>
          </tr>
          <tr>
            {renderLabelCell(`RECEITAS ${year}`, 'bg-[#666699] text-white sticky left-0 z-10', true)}
            {MONTH_NAMES.map((month) => renderHeaderCell(month))}
            {renderHeaderCell('TOTAL DO ANO')}
            {renderHeaderCell('AÇÕES', 'w-20')}
          </tr>
        </thead>
        <tbody>
          {/* Products */}
          {products.map((product) => (
            <tr key={product.name} className="hover:bg-muted/50">
              {renderLabelCell(product.name, 'bg-white')}
              {months.map((month) => renderCell(product.byMonth[month], 'bg-white'))}
              {renderCell(product.yearTotal, 'bg-white font-bold')}
              <td className="p-2 border border-border bg-white"></td>
            </tr>
          ))}

          {/* Subtotal */}
          <tr className="bg-[#cccccc] font-bold">
            {renderLabelCell('$ SUB TOTAL', 'bg-[#cccccc]', true)}
            {months.map((month) => renderCell(computed.revenueSubtotalByMonth[month], 'bg-[#cccccc] font-bold'))}
            {renderCell(
              Object.values(computed.revenueSubtotalByMonth).reduce((a, b) => a + b, 0),
              'bg-[#cccccc] font-bold'
            )}
            <td className="p-2 border border-border bg-[#cccccc]"></td>
          </tr>

          {/* Subtotal Individual */}
          <tr className="bg-[#d0e0e3] font-bold">
            {renderLabelCell('$ SUB TOTAL INDIVIDUAL', 'bg-[#d0e0e3]', true)}
            {months.map((month) => {
              // Subtotal individual = subtotal / number of partners
              const subtotal = computed.revenueSubtotalByMonth[month] || 0;
              const individualTotal = subtotal / partners.length;
              return renderCell(individualTotal, 'bg-[#d0e0e3] font-bold');
            })}
            {renderCell(
              (Object.values(computed.revenueSubtotalByMonth).reduce((a, b) => a + b, 0)) / partners.length,
              'bg-[#d0e0e3] font-bold'
            )}
            <td className="p-2 border border-border bg-[#d0e0e3]"></td>
          </tr>

          {/* Despesas Fixas Header */}
          <tr>
            {renderLabelCell(`DESPESA FIXAS ${year}`, 'bg-[#666666] text-white sticky left-0 z-10', true)}
            {months.map(() => (
              <td key={Math.random()} className="p-2 border border-border bg-[#666666]"></td>
            ))}
            <td className="p-2 border border-border bg-[#666666]"></td>
            <td className="p-2 border border-border bg-[#666666]"></td>
          </tr>

          {/* Fixed Expenses */}
          {Object.keys(fixedExpensesByMonth).map((expenseName) => {
            const expenses = fixedExpenses.filter((e) => e.name === expenseName);
            const yearTotal = Object.values(fixedExpensesByMonth[expenseName]).reduce((a, b) => a + b, 0);
            return (
              <tr
                key={expenseName}
                className="hover:bg-muted/50 group relative"
                onDoubleClick={() => expenses[0] && onEditExpense(expenses[0])}
              >
                {renderLabelCell(expenseName, 'bg-white')}
                {months.map((month) => renderCell(fixedExpensesByMonth[expenseName][month], 'bg-white'))}
                {renderCell(yearTotal, 'bg-white font-bold')}
                {expenses.length > 0 && (
                  <td className="p-2 border border-border bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1 flex-wrap">
                      {expenses.map((exp) => (
                        <div key={exp.id} className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onEditExpense(exp)}
                            title={`Edit ${exp.name} - ${exp.year_month}`}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onDeleteExpense(exp.id)}
                            title={`Delete ${exp.name} - ${exp.year_month}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </td>
                )}
                {expenses.length === 0 && <td className="p-2 border border-border bg-white"></td>}
              </tr>
            );
          })}

          {/* Empty row for adding fixed expense */}
          <tr className="hover:bg-muted/50">
            {renderLabelCell('', 'bg-white')}
            {months.map(() => (
              <td key={Math.random()} className="p-2 border border-border bg-white"></td>
            ))}
            <td className="p-2 border border-border bg-white"></td>
            <td className="p-2 border border-border bg-white">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onAddExpense}>
                <Plus className="h-3 w-3" />
              </Button>
            </td>
          </tr>

          {/* Despesas Variáveis Header */}
          <tr>
            {renderLabelCell(`DESPESA VÁRIAVEIS ${year}`, 'bg-[#666666] text-white sticky left-0 z-10', true)}
            {months.map(() => (
              <td key={Math.random()} className="p-2 border border-border bg-[#666666]"></td>
            ))}
            <td className="p-2 border border-border bg-[#666666]"></td>
            <td className="p-2 border border-border bg-[#666666]"></td>
          </tr>

          {/* Variable Expenses */}
          {Object.keys(variableExpensesByMonth).map((expenseName) => {
            const expenses = variableExpenses.filter((e) => e.name === expenseName);
            const yearTotal = Object.values(variableExpensesByMonth[expenseName]).reduce((a, b) => a + b, 0);
            return (
              <tr
                key={expenseName}
                className="hover:bg-muted/50 group relative"
                onDoubleClick={() => expenses[0] && onEditExpense(expenses[0])}
              >
                {renderLabelCell(expenseName, 'bg-white')}
                {months.map((month) => renderCell(variableExpensesByMonth[expenseName][month], 'bg-white'))}
                {renderCell(yearTotal, 'bg-white font-bold')}
                {expenses.length > 0 && (
                  <td className="p-2 border border-border bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1 flex-wrap">
                      {expenses.map((exp) => (
                        <div key={exp.id} className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onEditExpense(exp)}
                            title={`Edit ${exp.name} - ${exp.year_month}`}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onDeleteExpense(exp.id)}
                            title={`Delete ${exp.name} - ${exp.year_month}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </td>
                )}
                {expenses.length === 0 && <td className="p-2 border border-border bg-white"></td>}
              </tr>
            );
          })}

          {/* Empty row for adding variable expense */}
          <tr className="hover:bg-muted/50">
            {renderLabelCell('', 'bg-white')}
            {months.map(() => (
              <td key={Math.random()} className="p-2 border border-border bg-white"></td>
            ))}
            <td className="p-2 border border-border bg-white"></td>
            <td className="p-2 border border-border bg-white">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onAddExpense}>
                <Plus className="h-3 w-3" />
              </Button>
            </td>
          </tr>

          {/* Retirada Sócio Header */}
          <tr>
            {renderLabelCell('RETIRADA SÓCIO', 'bg-[#666666] text-white sticky left-0 z-10', true)}
            {months.map(() => (
              <td key={Math.random()} className="p-2 border border-border bg-[#666666]"></td>
            ))}
            <td className="p-2 border border-border bg-[#666666]"></td>
            <td className="p-2 border border-border bg-[#666666]"></td>
          </tr>

          {/* Withdrawals by Partner */}
          {Object.entries(withdrawalsByPartner).map(([partnerId, withdrawal]) => {
            const partnerWithdrawals = withdrawals.filter((w) => w.partner_id === partnerId);
            return (
              <tr
                key={partnerId}
                className="hover:bg-muted/50 group relative"
                onDoubleClick={() => partnerWithdrawals[0] && onEditWithdrawal(partnerWithdrawals[0])}
              >
                {renderLabelCell(withdrawal.partnerName, 'bg-white')}
                {months.map((month) => renderCell(withdrawal.byMonth[month], 'bg-white'))}
                {renderCell(withdrawal.yearTotal, 'bg-white font-bold')}
                {partnerWithdrawals.length > 0 && (
                  <td className="p-2 border border-border bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1 flex-wrap">
                      {partnerWithdrawals.map((w) => (
                        <div key={w.id} className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onEditWithdrawal(w)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => onDeleteWithdrawal(w.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </td>
                )}
                {partnerWithdrawals.length === 0 && <td className="p-2 border border-border bg-white"></td>}
              </tr>
            );
          })}

          {/* Empty row for adding withdrawal */}
          <tr className="hover:bg-muted/50">
            {renderLabelCell('', 'bg-white')}
            {months.map(() => (
              <td key={Math.random()} className="p-2 border border-border bg-white"></td>
            ))}
            <td className="p-2 border border-border bg-white"></td>
            <td className="p-2 border border-border bg-white">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onAddWithdrawal}>
                <Plus className="h-3 w-3" />
              </Button>
            </td>
          </tr>

          {/* Subtotal (Despesas) */}
          <tr className="bg-[#cccccc] font-bold">
            {renderLabelCell('$ SUB TOTAL', 'bg-[#cccccc]', true)}
            {months.map((month) => {
              const total = (computed.expensesTotalByMonth[month] || 0) + (computed.withdrawalsTotalByMonth[month] || 0);
              return renderCell(total, 'bg-[#cccccc] font-bold');
            })}
            {renderCell(
              computed.yearTotals.totalExpenses + computed.yearTotals.totalWithdrawals,
              'bg-[#cccccc] font-bold'
            )}
            <td className="p-2 border border-border bg-[#cccccc]"></td>
          </tr>

          {/* % DESPESA / RECEITA */}
          <tr className="bg-[#b7b7b7]">
            {renderLabelCell('% DESPESA / RECEITA', 'bg-[#b7b7b7] font-bold', true)}
            {months.map((month) => {
              const percentage = computed.expensesPercentageByMonth[month] || 0;
              return (
                <td key={month} className="p-2 text-right font-mono text-sm bg-[#b7b7b7] font-bold">
                  {percentage.toFixed(2)}%
                </td>
              );
            })}
            <td className="p-2 text-right font-mono text-sm border border-border bg-[#b7b7b7] font-bold">
              {computed.yearTotals.totalRevenue > 0
                ? (((computed.yearTotals.totalExpenses + computed.yearTotals.totalWithdrawals) / computed.yearTotals.totalRevenue) * 100).toFixed(2)
                : '0.00'}%
            </td>
          </tr>

          {/* Empty row */}
          <tr>
            {renderLabelCell('', 'bg-[#666666]')}
            {months.map(() => (
              <td key={Math.random()} className="p-2 border border-border bg-[#666666]"></td>
            ))}
            <td className="p-2 border border-border bg-[#666666]"></td>
            <td className="p-2 border border-border bg-[#666666]"></td>
          </tr>

          {/* TOTAL RECEITA */}
          <tr className="bg-[#b7b7b7] font-bold">
            {renderLabelCell('TOTAL RECEITA', 'bg-[#b7b7b7]', true)}
            {months.map((month, idx) => {
              // First month includes previous year cash
              const value = idx === 0
                ? (data.previousYearCash || 0) + (computed.revenueSubtotalByMonth[month] || 0)
                : computed.revenueSubtotalByMonth[month] || 0;
              return renderCell(value, 'bg-[#b7b7b7] font-bold');
            })}
            {renderCell(computed.yearTotals.totalRevenue, 'bg-[#b7b7b7] font-bold')}
            <td className="p-2 border border-border bg-[#b7b7b7]"></td>
          </tr>

          {/* TOTAL DESPESAS */}
          <tr className="bg-[#ffd966] font-bold">
            {renderLabelCell('TOTAL DESPESAS', 'bg-[#ffd966]', true)}
            {months.map((month) => {
              const total = (computed.expensesTotalByMonth[month] || 0) + (computed.withdrawalsTotalByMonth[month] || 0);
              return renderCell(total, 'bg-[#ffd966] font-bold');
            })}
            {renderCell(
              computed.yearTotals.totalExpenses + computed.yearTotals.totalWithdrawals,
              'bg-[#ffd966] font-bold'
            )}
            <td className="p-2 border border-border bg-[#ffd966]"></td>
          </tr>

          {/* LÍQUIDO */}
          <tr className="bg-[#c6efce] font-bold">
            {renderLabelCell('LÍQUIDO', 'bg-[#c6efce] text-[#006100]', true)}
            {months.map((month) => renderCell(computed.netByMonth[month], 'bg-[#c6efce] text-[#006100] font-bold'))}
            {renderCell(computed.yearTotals.net, 'bg-[#c6efce] text-[#006100] font-bold')}
            <td className="p-2 border border-border bg-[#c6efce]"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

