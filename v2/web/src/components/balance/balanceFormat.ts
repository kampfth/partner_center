export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0.00%';
  return `${value.toFixed(2)}%`;
}

export const MONTH_LABELS_PT = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
] as const;

export function yearMonthToMonthIndex(yearMonth: string): number | null {
  // Expected YYYY-MM
  const parts = yearMonth.split('-');
  if (parts.length !== 2) return null;
  const m = Number(parts[1]);
  if (!Number.isFinite(m) || m < 1 || m > 12) return null;
  return m - 1;
}
