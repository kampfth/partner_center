import { useState, useEffect } from 'react';
import { Trash2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { fetchInitialCash, setInitialCash, deleteInitialCash } from '@/api/partnerApi';
import { useToast } from '@/hooks/use-toast';
import type { InitialCash } from '@/types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function BalanceManagerTab() {
  const [entries, setEntries] = useState<InitialCash[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state for new entry
  const [newYear, setNewYear] = useState<string>(new Date().getFullYear().toString());
  const [newAmount, setNewAmount] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInitialCash();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial cash data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    const year = parseInt(newYear, 10);
    const amount = parseFloat(newAmount);

    if (isNaN(year) || year < 2000 || year > 2100) {
      toast({ variant: 'destructive', title: 'Invalid year' });
      return;
    }
    if (isNaN(amount)) {
      toast({ variant: 'destructive', title: 'Invalid amount' });
      return;
    }

    setSaving(true);
    try {
      await setInitialCash(year, amount, newNote || undefined);
      toast({ title: 'Saved', description: `Initial cash for ${year} set to ${formatCurrency(amount)}` });
      setNewAmount('');
      setNewNote('');
      loadData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (year: number) => {
    if (!confirm(`Delete initial cash for ${year}?`)) return;
    try {
      await deleteInitialCash(year);
      toast({ title: 'Deleted', description: `Initial cash for ${year} removed` });
      loadData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete' });
    }
  };

  if (loading) {
    return <LoadingState message="Loading balance settings..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Initial Cash (Caixa Inicial)</CardTitle>
          <CardDescription>
            Define the starting cash balance for each year. This is added to the first month's revenue in Balance calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing entries */}
          {entries.length > 0 && (
            <div className="rounded-lg border divide-y">
              {entries.map((entry) => (
                <div key={entry.year} className="flex items-center justify-between p-3">
                  <div>
                    <span className="font-semibold">{entry.year}</span>
                    <span className="ml-4 text-lg font-mono">{formatCurrency(entry.amount)}</span>
                    {entry.note && <span className="ml-4 text-sm text-muted-foreground">({entry.note})</span>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.year)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No initial cash defined yet. Add one below.
            </p>
          )}

          {/* Add/Edit form */}
          <div className="pt-4 border-t space-y-4">
            <h4 className="font-medium text-sm">Add or Update Initial Cash</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <Label htmlFor="ic-year">Year</Label>
                <Input
                  id="ic-year"
                  type="number"
                  min="2000"
                  max="2100"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ic-amount">Amount ($)</Label>
                <Input
                  id="ic-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="ic-note">Note (optional)</Label>
                <Input
                  id="ic-note"
                  placeholder="e.g. Carried from 2025"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
              </div>
              <div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              If a year already exists, it will be updated with the new value.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
