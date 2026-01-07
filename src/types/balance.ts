// Balance types matching backend response

export interface Partner {
  id: string;
  name: string;
  share: number;
  created_at?: string;
  updated_at?: string;
}

export interface RevenueLine {
  key: string; // display_name from RPC
  type: 'Product' | 'Group';
  byMonth: Record<string, number>;
  yearTotal: number;
}

export interface InitialCash {
  year: number;
  amount: number;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AutoRevenue {
  byMonth: Record<string, number>;
  byLine: RevenueLine[];
}

export interface RevenueAdjustment {
  id: number;
  year_month: string;
  name: string;
  amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: number;
  year_month: string;
  category: 'fixed' | 'variable';
  name: string;
  amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface Withdrawal {
  id: number;
  year_month: string;
  partner_id: string;
  amount: number;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BalanceComputed {
  revenueSubtotalByMonth: Record<string, number>;
  revenueIndividualByMonth: Record<string, Record<string, number>>;
  expensesTotalByMonth: Record<string, number>;
  withdrawalsTotalByMonth: Record<string, number>;
  expensesPercentageByMonth: Record<string, number>;
  totalRevenueByMonth: Record<string, number>;
  totalExpensesByMonth: Record<string, number>;
  netByMonth: Record<string, number>;
  availableCapitalByPartner: Record<string, Record<string, number>>; // partnerId -> monthKey -> capital
  yearTotals: {
    totalRevenue: number;
    totalExpenses: number;
    totalWithdrawals: number;
    net: number;
  };
}

export interface BalanceResponse {
  year: number;
  initialCash: number; // CAIXA inicial (manually defined via Admin)
  partners: Partner[];
  months: string[];
  autoRevenue: AutoRevenue;
  manualRevenueAdjustments: RevenueAdjustment[];
  expenses: Expense[];
  fixedExpenses: Expense[]; // Despesas fixas separadas
  variableExpenses: Expense[]; // Despesas variáveis separadas
  withdrawals: Withdrawal[];
  computed: BalanceComputed;
}

// Request payloads
export interface CreateExpensePayload {
  yearMonth: string;
  category: 'fixed' | 'variable';
  name: string;
  amount: number;
}

export interface UpdateExpensePayload {
  id: number;
  yearMonth: string;
  category: 'fixed' | 'variable';
  name: string;
  amount: number;
}

export interface CreateWithdrawalPayload {
  yearMonth: string;
  partnerId: string;
  amount: number;
  note?: string;
}

export interface UpdateWithdrawalPayload {
  id: number;
  yearMonth: string;
  partnerId: string;
  amount: number;
  note?: string;
}

export interface CreateRevenueAdjustmentPayload {
  yearMonth: string;
  name: string;
  amount: number;
}

export interface UpdateRevenueAdjustmentPayload {
  id: number;
  yearMonth: string;
  name: string;
  amount: number;
}

export interface UpdatePartnersPayload {
  partners: Partner[];
}

