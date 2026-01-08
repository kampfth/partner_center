import type { BalanceResponse, Expense, Withdrawal } from '@/types';
import { BalanceGridDesktop } from './BalanceGridDesktop';
import { BalanceListMobile } from './BalanceListMobile';

type SortOrder = { value: string[] };

export function BalanceView({
  data,
  sortOrder,
  mobileMonth,
  onChangeMobileMonth,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onAddWithdrawal,
  onEditWithdrawal,
  onDeleteWithdrawal,
}: {
  data: BalanceResponse;
  sortOrder: SortOrder | null;
  mobileMonth: string;
  onChangeMobileMonth: (month: string) => void;
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: number) => void;
  onAddWithdrawal: () => void;
  onEditWithdrawal: (withdrawal: Withdrawal) => void;
  onDeleteWithdrawal: (id: number) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Mobile: month-at-a-time + accordion */}
      <div className="block lg:hidden">
        <BalanceListMobile
          data={data}
          sortOrder={sortOrder}
          activeMonth={mobileMonth}
          onChangeMonth={onChangeMobileMonth}
          onAddExpense={onAddExpense}
          onAddWithdrawal={onAddWithdrawal}
        />
      </div>

      {/* Desktop: full grid */}
      <div className="hidden lg:block">
        <BalanceGridDesktop
          data={data}
          sortOrder={sortOrder}
          onAddExpense={onAddExpense}
          onEditExpense={onEditExpense}
          onDeleteExpense={onDeleteExpense}
          onAddWithdrawal={onAddWithdrawal}
          onEditWithdrawal={onEditWithdrawal}
          onDeleteWithdrawal={onDeleteWithdrawal}
        />
      </div>
    </div>
  );
}
