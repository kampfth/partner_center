import { useState } from 'react';
import { AlertTriangle, Trash2, RotateCcw, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/Modal';
import { truncateTable, truncateTransactionsByDate, resetAll } from '@/api/partnerApi';
import { useToast } from '@/hooks/use-toast';

interface DangerAction {
  id: string;
  title: string;
  description: string;
  confirmText: string;
  action: () => Promise<void>;
  requiresDate?: boolean;
}

export function DangerZoneTab() {
  const [activeAction, setActiveAction] = useState<DangerAction | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const { toast } = useToast();

  const dangerActions: DangerAction[] = [
    {
      id: 'clear_transactions',
      title: 'Clear All Transactions',
      description: 'Delete ALL transaction records from the database. This cannot be undone.',
      confirmText: 'DELETE',
      action: async () => {
        await truncateTable('transactions');
      },
    },
    {
      id: 'clear_transactions_by_date',
      title: 'Clear Transactions by Date',
      description: 'Delete all transactions from a specific date onwards. Useful for re-importing data.',
      confirmText: 'DELETE',
      requiresDate: true,
      action: async () => {
        if (!dateInput) throw new Error('Date is required');
        await truncateTransactionsByDate(dateInput);
      },
    },
    {
      id: 'clear_products',
      title: 'Clear All Products',
      description: 'Delete all discovered products from the database. You will need to re-import CSVs to discover them again.',
      confirmText: 'DELETE',
      action: async () => {
        // First clear tracked products, then all_products
        await truncateTable('products');
        await truncateTable('all_products');
      },
    },
    {
      id: 'clear_groups',
      title: 'Clear All Groups',
      description: 'Delete all product groups. Products will be ungrouped but remain in the system.',
      confirmText: 'DELETE',
      action: async () => {
        await truncateTable('product_groups');
      },
    },
    {
      id: 'reset_all',
      title: 'Reset Entire Database',
      description: 'Delete ALL data: transactions, products, groups, balance data, and import history. Complete factory reset.',
      confirmText: 'RESET',
      action: async () => {
        await resetAll();
      },
    },
  ];

  const handleExecute = async () => {
    if (!activeAction) return;
    if (confirmInput !== activeAction.confirmText) {
      toast({
        variant: 'destructive',
        title: 'Confirmation failed',
        description: `Please type "${activeAction.confirmText}" to confirm`,
      });
      return;
    }

    if (activeAction.requiresDate && !dateInput) {
      toast({
        variant: 'destructive',
        title: 'Date required',
        description: 'Please select a date',
      });
      return;
    }

    setExecuting(true);
    try {
      await activeAction.action();
      toast({
        title: 'Success',
        description: `${activeAction.title} completed`,
      });
      closeModal();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Action failed',
      });
    } finally {
      setExecuting(false);
    }
  };

  const closeModal = () => {
    setActiveAction(null);
    setConfirmInput('');
    setDateInput('');
  };

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your data. Use with extreme caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dangerActions.map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4"
            >
              <div>
                <p className="font-medium">{action.title}</p>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setActiveAction(action)}
              >
                {action.id === 'reset_all' ? (
                  <RotateCcw className="mr-2 h-4 w-4" />
                ) : action.requiresDate ? (
                  <Calendar className="mr-2 h-4 w-4" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Execute
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Modal
        open={!!activeAction}
        onOpenChange={(open) => !open && closeModal()}
        title={`Confirm: ${activeAction?.title}`}
        description="This action cannot be undone. Please read carefully."
        footer={
          <>
            <Button variant="outline" onClick={closeModal} disabled={executing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecute}
              disabled={executing || confirmInput !== activeAction?.confirmText || (activeAction?.requiresDate && !dateInput)}
            >
              {executing ? 'Executing...' : 'Confirm'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              <strong>Warning:</strong> {activeAction?.description}
            </p>
          </div>
          
          {activeAction?.requiresDate && (
            <div className="space-y-2">
              <Label htmlFor="date-input">
                Delete transactions from this date onwards
              </Label>
              <Input
                id="date-input"
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="font-mono"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <strong>{activeAction?.confirmText}</strong> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={activeAction?.confirmText}
              className="font-mono"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
