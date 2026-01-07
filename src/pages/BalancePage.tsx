import { useState, useEffect, useCallback } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  fetchBalance,
  fetchSortOrder,
  fetchBalanceYears,
  createExpense,
  updateExpense,
  deleteExpense,
  createWithdrawal,
  updateWithdrawal,
  deleteWithdrawal,
} from '@/api/partnerApi';
import type {
  BalanceResponse,
  Expense,
  Withdrawal,
  SortOrder,
} from '@/types';
import { BalanceView } from '@/components/balance/BalanceView';

const MONTH_NAMES = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
];

export default function BalancePage() {
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [data, setData] = useState<BalanceResponse | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder | null>(null);
  const [mobileMonth, setMobileMonth] = useState<string>('TOTAL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Expense modal state
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    yearMonth: '',
    category: 'fixed' as 'fixed' | 'variable',
    name: '',
    amount: '',
  });

  // Withdrawal modal state
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [editingWithdrawal, setEditingWithdrawal] = useState<Withdrawal | null>(null);
  const [withdrawalForm, setWithdrawalForm] = useState({
    yearMonth: '',
    partnerId: '',
    amount: '',
    note: '',
  });

  const loadStatic = useCallback(async () => {
    try {
      const [so, ys] = await Promise.all([
        fetchSortOrder(),
        fetchBalanceYears(),
      ]);

      setSortOrder(so ?? null);

      const yearsArr = Array.isArray(ys?.years) ? ys.years : [];
      setYears(yearsArr);
      if (yearsArr.length) {
        const latest = yearsArr[yearsArr.length - 1];
        setYear(latest);
      }
    } catch (e) {
      // Keep the page usable even if years/sort order fail
      console.warn('Balance static load failed', e);
    }
  }, []);

  const loadData = useCallback(async (targetYear?: number) => {
    setLoading(true);
    setError(null);
    try {
      const y = targetYear ?? year;
      const balanceData = await fetchBalance(y);
      setData(balanceData);
      // default mobile month to TOTAL; if months exist, keep current selection if valid
      const ms = Array.isArray(balanceData?.months) ? balanceData.months : [];
      if (ms.length && mobileMonth !== 'TOTAL' && !ms.includes(mobileMonth)) {
        setMobileMonth('TOTAL');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balance');
    } finally {
      setLoading(false);
    }
  }, [year, mobileMonth]);

  useEffect(() => {
    loadStatic();
  }, [loadStatic]);

  useEffect(() => {
    // Load balance data whenever year changes
    loadData(year);
  }, [loadData, year]);

  const handleCreateExpense = async () => {
    try {
      await createExpense({
        yearMonth: expenseForm.yearMonth,
        category: expenseForm.category,
        name: expenseForm.name,
        amount: parseFloat(expenseForm.amount),
      });
      toast({ title: 'Expense created successfully' });
      setExpenseDialogOpen(false);
      resetExpenseForm();
      loadData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create expense',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;
    try {
      await updateExpense({
        id: editingExpense.id,
        yearMonth: expenseForm.yearMonth,
        category: expenseForm.category,
        name: expenseForm.name,
        amount: parseFloat(expenseForm.amount),
      });
      toast({ title: 'Expense updated successfully' });
      setExpenseDialogOpen(false);
      setEditingExpense(null);
      resetExpenseForm();
      loadData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update expense',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(id);
      toast({ title: 'Expense deleted successfully' });
      loadData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete expense',
        variant: 'destructive',
      });
    }
  };

  const handleCreateWithdrawal = async () => {
    try {
      await createWithdrawal({
        yearMonth: withdrawalForm.yearMonth,
        partnerId: withdrawalForm.partnerId,
        amount: parseFloat(withdrawalForm.amount),
        note: withdrawalForm.note || undefined,
      });
      toast({ title: 'Withdrawal created successfully' });
      setWithdrawalDialogOpen(false);
      resetWithdrawalForm();
      loadData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create withdrawal',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateWithdrawal = async () => {
    if (!editingWithdrawal) return;
    try {
      await updateWithdrawal({
        id: editingWithdrawal.id,
        yearMonth: withdrawalForm.yearMonth,
        partnerId: withdrawalForm.partnerId,
        amount: parseFloat(withdrawalForm.amount),
        note: withdrawalForm.note || undefined,
      });
      toast({ title: 'Withdrawal updated successfully' });
      setWithdrawalDialogOpen(false);
      setEditingWithdrawal(null);
      resetWithdrawalForm();
      loadData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update withdrawal',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteWithdrawal = async (id: number) => {
    if (!confirm('Are you sure you want to delete this withdrawal?')) return;
    try {
      await deleteWithdrawal(id);
      toast({ title: 'Withdrawal deleted successfully' });
      loadData();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete withdrawal',
        variant: 'destructive',
      });
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({ yearMonth: '', category: 'fixed', name: '', amount: '' });
    setEditingExpense(null);
  };

  const resetWithdrawalForm = () => {
    setWithdrawalForm({ yearMonth: '', partnerId: '', amount: '', note: '' });
    setEditingWithdrawal(null);
  };

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      yearMonth: expense.year_month,
      category: expense.category,
      name: expense.name,
      amount: expense.amount.toString(),
    });
    setExpenseDialogOpen(true);
  };

  const openEditWithdrawal = (withdrawal: Withdrawal) => {
    setEditingWithdrawal(withdrawal);
    setWithdrawalForm({
      yearMonth: withdrawal.year_month,
      partnerId: withdrawal.partner_id,
      amount: withdrawal.amount.toString(),
      note: withdrawal.note || '',
    });
    setWithdrawalDialogOpen(true);
  };

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Balance</h1>
          <p className="text-sm text-muted-foreground">
            Monthly revenue, expenses, withdrawals, and totals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="year-select" className="text-xs text-muted-foreground">Year</Label>
          <Select
            value={year.toString()}
            onValueChange={(v) => setYear(parseInt(v, 10))}
            disabled={years.length === 0}
          >
            <SelectTrigger id="year-select" className="w-28">
              <SelectValue placeholder={years.length ? 'Select' : 'No data'} />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <BalanceView
        data={data}
        sortOrder={sortOrder}
        mobileMonth={mobileMonth}
        onChangeMobileMonth={setMobileMonth}
        onAddExpense={() => {
          resetExpenseForm();
          setExpenseDialogOpen(true);
        }}
        onEditExpense={openEditExpense}
        onDeleteExpense={handleDeleteExpense}
        onAddWithdrawal={() => {
          resetWithdrawalForm();
          setWithdrawalDialogOpen(true);
        }}
        onEditWithdrawal={openEditWithdrawal}
        onDeleteWithdrawal={handleDeleteWithdrawal}
      />

      {/* Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </DialogTitle>
            <DialogDescription>
              Add or edit an expense for a specific month.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="exp-month">Month</Label>
              <Select
                value={expenseForm.yearMonth}
                onValueChange={(v) => setExpenseForm({ ...expenseForm, yearMonth: v })}
              >
                <SelectTrigger id="exp-month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {data.months.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MONTH_NAMES[parseInt(m.split('-')[1], 10) - 1]} {m.split('-')[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="exp-category">Category</Label>
              <Select
                value={expenseForm.category}
                onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v as 'fixed' | 'variable' })}
              >
                <SelectTrigger id="exp-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="exp-name">Name</Label>
              <Input
                id="exp-name"
                value={expenseForm.name}
                onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                placeholder="Expense name"
              />
            </div>
            <div>
              <Label htmlFor="exp-amount">Amount</Label>
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={editingExpense ? handleUpdateExpense : handleCreateExpense}
              disabled={!expenseForm.yearMonth || !expenseForm.name || !expenseForm.amount}
            >
              {editingExpense ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWithdrawal ? 'Edit Withdrawal' : 'Add Withdrawal'}
            </DialogTitle>
            <DialogDescription>
              Add or edit a withdrawal for a specific partner and month.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="with-month">Month</Label>
              <Select
                value={withdrawalForm.yearMonth}
                onValueChange={(v) => setWithdrawalForm({ ...withdrawalForm, yearMonth: v })}
              >
                <SelectTrigger id="with-month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {data.months.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MONTH_NAMES[parseInt(m.split('-')[1], 10) - 1]} {m.split('-')[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="with-partner">Partner</Label>
              <Select
                value={withdrawalForm.partnerId}
                onValueChange={(v) => setWithdrawalForm({ ...withdrawalForm, partnerId: v })}
              >
                <SelectTrigger id="with-partner">
                  <SelectValue placeholder="Select partner" />
                </SelectTrigger>
                <SelectContent>
                  {data.partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="with-amount">Amount</Label>
              <Input
                id="with-amount"
                type="number"
                step="0.01"
                value={withdrawalForm.amount}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="with-note">Note (optional)</Label>
              <Textarea
                id="with-note"
                value={withdrawalForm.note}
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, note: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={editingWithdrawal ? handleUpdateWithdrawal : handleCreateWithdrawal}
              disabled={!withdrawalForm.yearMonth || !withdrawalForm.partnerId || !withdrawalForm.amount}
            >
              {editingWithdrawal ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
