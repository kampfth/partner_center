import { get, post, upload, type ProgressCallback } from './apiClient';
import type {
  Product,
  Group,
  ReportResponse,
  AuditLog,
  UploadResponse,
  SortOrder,
  ProductUpdate,
  CreateGroupPayload,
  BalanceResponse,
  Expense,
  Withdrawal,
  RevenueAdjustment,
  Partner,
  CreateExpensePayload,
  UpdateExpensePayload,
  CreateWithdrawalPayload,
  UpdateWithdrawalPayload,
  CreateRevenueAdjustmentPayload,
  UpdateRevenueAdjustmentPayload,
  UpdatePartnersPayload,
  InitialCash,
} from '@/types';

export async function fetchProducts(): Promise<Product[]> {
  return get<Product[]>('action=products');
}

export async function fetchGroups(): Promise<Group[]> {
  return get<Group[]>('action=groups');
}

export async function createGroup(name: string, productIds: string[]): Promise<Group> {
  const payload: CreateGroupPayload = { name, productIds };
  return post<Group>('action=create_group', payload);
}

export async function updateProduct(
  product_id: string,
  label: string,
  group_id: string | null
): Promise<Product> {
  const payload: ProductUpdate = { product_id, label, group_id };
  return post<Product>('action=update_product', payload);
}

export async function fetchReport(start: string, end: string): Promise<ReportResponse> {
  return get<ReportResponse>(`action=report&start=${start}&end=${end}`);
}

export async function fetchLoginHistory(): Promise<AuditLog[]> {
  return get<AuditLog[]>('action=get_login_history');
}

export async function fetchSortOrder(): Promise<SortOrder> {
  // Backend returns an array like [{"key": "sort_order", "value": [...]}]
  // We need to extract the first element or return empty
  const result = await get<{ key: string; value: string[] }[]>('action=get_sort_order');
  if (Array.isArray(result) && result.length > 0 && result[0].value) {
    return { value: result[0].value };
  }
  return { value: [] };
}

export async function saveSortOrder(order: string[]): Promise<{ success: boolean }> {
  return post<{ success: boolean }>('action=save_sort_order', { order });
}

export async function truncateTable(table: string): Promise<{ success: boolean }> {
  return post<{ success: boolean }>('action=truncate_table', { table });
}

export async function resetAll(): Promise<{ success: boolean }> {
  return post<{ success: boolean }>('action=reset_all', {});
}

export async function uploadFile(file: File, onProgress?: ProgressCallback): Promise<UploadResponse> {
  return upload<UploadResponse>(file, onProgress);
}

// Date range for available sales data
export interface DateRange {
  min_date: string | null;
  max_date: string | null;
}

export async function fetchDateRange(): Promise<DateRange> {
  return get<DateRange>('action=date_range');
}

// Balance API functions
export async function fetchBalance(year: number): Promise<BalanceResponse> {
  return get<BalanceResponse>(`action=balance&year=${year}`);
}

export async function fetchBalanceYears(): Promise<{ years: number[] }> {
  return get<{ years: number[] }>('action=balance_years');
}

export async function createExpense(payload: CreateExpensePayload): Promise<Expense> {
  return post<Expense>('action=create_expense', payload);
}

export async function updateExpense(payload: UpdateExpensePayload): Promise<Expense> {
  return post<Expense>('action=update_expense', payload);
}

export async function deleteExpense(id: number): Promise<{ success: boolean }> {
  return post<{ success: boolean }>('action=delete_expense', { id });
}

export async function createWithdrawal(payload: CreateWithdrawalPayload): Promise<Withdrawal> {
  return post<Withdrawal>('action=create_withdrawal', payload);
}

export async function updateWithdrawal(payload: UpdateWithdrawalPayload): Promise<Withdrawal> {
  return post<Withdrawal>('action=update_withdrawal', payload);
}

export async function deleteWithdrawal(id: number): Promise<{ success: boolean }> {
  return post<{ success: boolean }>('action=delete_withdrawal', { id });
}

export async function createRevenueAdjustment(payload: CreateRevenueAdjustmentPayload): Promise<RevenueAdjustment> {
  return post<RevenueAdjustment>('action=create_revenue_adjustment', payload);
}

export async function updateRevenueAdjustment(payload: UpdateRevenueAdjustmentPayload): Promise<RevenueAdjustment> {
  return post<RevenueAdjustment>('action=update_revenue_adjustment', payload);
}

export async function deleteRevenueAdjustment(id: number): Promise<{ success: boolean }> {
  return post<{ success: boolean }>('action=delete_revenue_adjustment', { id });
}

export async function fetchPartners(): Promise<Partner[]> {
  return get<Partner[]>('action=partners');
}

export async function updatePartners(payload: UpdatePartnersPayload): Promise<Partner[]> {
  return post<Partner[]>('action=update_partners', payload);
}

// Initial Cash Management
export async function fetchInitialCash(): Promise<InitialCash[]> {
  return get<InitialCash[]>('action=get_initial_cash');
}

export async function setInitialCash(year: number, amount: number, note?: string): Promise<{ success: boolean }> {
  return post<{ success: boolean }>('action=set_initial_cash', { year, amount, note });
}

export async function deleteInitialCash(year: number): Promise<{ success: boolean }> {
  return post<{ success: boolean }>('action=delete_initial_cash', { year });
}

// Analytics / Charts
export interface SalesByWeekday {
  day_of_week: number;
  day_name: string;
  total_sales: number;
  units: number;
}

export interface SalesByTimeBucket {
  time_bucket: string;
  total_sales: number;
  units: number;
}

export interface SalesByMsfsVersion {
  version: string;
  total_sales: number;
  units: number;
}

export async function fetchSalesByWeekday(startDate: string, endDate: string): Promise<SalesByWeekday[]> {
  return get<SalesByWeekday[]>(`action=sales_by_weekday&start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`);
}

export async function fetchSalesByTimeBucket(startDate: string, endDate: string): Promise<SalesByTimeBucket[]> {
  return get<SalesByTimeBucket[]>(`action=sales_by_time_bucket&start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`);
}

export async function fetchSalesByMsfsVersion(startDate: string, endDate: string): Promise<SalesByMsfsVersion[]> {
  return get<SalesByMsfsVersion[]>(`action=sales_by_msfs_version&start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`);
}

// All Products Management
export interface AllProduct {
  id: number;
  product_id: string;
  product_name: string;
  lever: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_tracked: boolean;
}

export async function fetchAllProducts(): Promise<AllProduct[]> {
  return get<AllProduct[]>('action=all_products');
}

export async function trackProduct(productId: string): Promise<{ success: boolean; message: string }> {
  return post<{ success: boolean; message: string }>('action=track_product', { product_id: productId });
}

export async function untrackProduct(productId: string): Promise<{ success: boolean; message: string }> {
  return post<{ success: boolean; message: string }>('action=untrack_product', { product_id: productId });
}
