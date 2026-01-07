import { Partner } from '@/types/balance';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface BalanceSidebarProps {
  cash: number; // LÍQUIDO atual
  partners: Partner[];
  availableCapital: Record<string, number>; // partnerId -> capital disponível (último mês)
  lastUpdate: string;
}

export function BalanceSidebar({
  cash,
  partners,
  availableCapital,
  lastUpdate,
}: BalanceSidebarProps) {
  return (
    <div className="w-64 border-l border-border bg-muted/30 p-4 space-y-4">
      {/* CAIXA */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">CAIXA</div>
        <div className="text-lg font-bold text-primary bg-green-50 dark:bg-green-950/20 p-2 rounded border border-green-200 dark:border-green-900">
          {formatCurrency(cash)}
        </div>
      </div>

      {/* CAPITAL DISPONÍVEL POR SÓCIO */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">CAPITAL DISPONÍVEL POR SÓCIO</div>
        {partners.map((partner) => {
          const capital = availableCapital[partner.id] || 0;
          return (
            <div key={partner.id} className="space-y-1">
              <div className="text-xs text-muted-foreground">{partner.name}</div>
              <div className="text-base font-semibold bg-green-50 dark:bg-green-950/20 p-2 rounded border border-green-200 dark:border-green-900">
                {formatCurrency(capital)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Last Update */}
      <div className="space-y-1 pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground">Last Update</div>
        <div className="text-xs font-medium text-foreground">{lastUpdate}</div>
      </div>
    </div>
  );
}

