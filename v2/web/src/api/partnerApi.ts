import { get, post, put, patch, del, upload, type ProgressCallback } from './apiClient';
import type {
  Product,
  Group,
  ReportResponse,
  AuditLog,
  UploadResponse,
  SortOrder,
  ProductUpdate,
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

// v2 API wraps responses in { data: ... }
interface ApiResponse<T> {
  data: T;
}

// === Products (tracked) ===
export async function fetchProducts(): Promise<Product[]> {
  const response = await get<ApiResponse<Product[]>>('/tracked-products');
  return response.data;
}

// === Groups ===
export async function fetchGroups(): Promise<Group[]> {
  const response = await get<ApiResponse<Group[]>>('/groups');
  return response.data;
}

export async function createGroup(name: string, productIds: string[]): Promise<Group> {
  // Backend expects product_ids (snake_case)
  const payload = { name, product_ids: productIds };
  const response = await post<ApiResponse<Group>>('/groups', payload);
  return response.data;
}

export async function updateProduct(
  product_id: string,
  label: string,
  group_id: string | null
): Promise<Product> {
  const payload: ProductUpdate = { product_id, label, group_id };
  const response = await patch<ApiResponse<Product>>(`/tracked-products/${encodeURIComponent(product_id)}`, payload);
  return response.data;
}

// === Reports ===
export async function fetchReport(start: string, end: string): Promise<ReportResponse> {
  const response = await get<ApiResponse<ReportResponse>>(`/reports?start=${start}&end=${end}`);
  return response.data;
}

// Date range for available sales data
export interface DateRange {
  min_date: string | null;
  max_date: string | null;
}

export async function fetchDateRange(): Promise<DateRange> {
  const response = await get<ApiResponse<DateRange>>('/reports/date-range');
  return response.data;
}

// === Sort Order ===
export async function fetchSortOrder(): Promise<SortOrder> {
  try {
    const response = await get<ApiResponse<{ value: string[] }>>('/settings/sort-order');
    return { value: response.data?.value || [] };
  } catch {
    return { value: [] };
  }
}

export async function saveSortOrder(order: string[]): Promise<{ success: boolean }> {
  await put<ApiResponse<{ value: string[] }>>('/settings/sort-order', { order });
  return { success: true };
}

// === Admin Actions ===
export async function truncateTable(table: string): Promise<{ success: boolean }> {
  await post<{ success: boolean }>('/admin/truncate', { table });
  return { success: true };
}

export async function resetAll(): Promise<{ success: boolean }> {
  await post<{ success: boolean }>('/admin/reset', {});
  return { success: true };
}

// === Upload ===
export async function uploadFile(file: File, onProgress?: ProgressCallback): Promise<UploadResponse> {
  const response = await upload<ApiResponse<UploadResponse>>(file, onProgress);
  return response.data;
}

// === Balance ===
export async function fetchBalance(year: number): Promise<BalanceResponse> {
  const response = await get<ApiResponse<BalanceResponse>>(`/balance?year=${year}`);
  return response.data;
}

export async function fetchBalanceYears(): Promise<{ years: number[] }> {
  const response = await get<ApiResponse<{ years: number[] }>>('/balance/years');
  return response.data;
}

// === Expenses ===
export async function createExpense(payload: CreateExpensePayload): Promise<Expense> {
  const response = await post<ApiResponse<Expense>>('/expenses', {
    year_month: payload.yearMonth,
    category: payload.category,
    name: payload.name,
    amount: payload.amount,
  });
  return response.data;
}

export async function updateExpense(payload: UpdateExpensePayload): Promise<Expense> {
  const response = await patch<ApiResponse<Expense>>(`/expenses/${payload.id}`, {
    year_month: payload.yearMonth,
    category: payload.category,
    name: payload.name,
    amount: payload.amount,
  });
  return response.data;
}

export async function deleteExpense(id: number): Promise<{ success: boolean }> {
  await del<{ success: boolean }>(`/expenses/${id}`);
  return { success: true };
}

// === Withdrawals ===
export async function createWithdrawal(payload: CreateWithdrawalPayload): Promise<Withdrawal> {
  const response = await post<ApiResponse<Withdrawal>>('/withdrawals', {
    year_month: payload.yearMonth,
    amount: payload.amount,
    note: payload.note,
  });
  return response.data;
}

export async function updateWithdrawal(payload: UpdateWithdrawalPayload): Promise<Withdrawal> {
  const response = await patch<ApiResponse<Withdrawal>>(`/withdrawals/${payload.id}`, {
    year_month: payload.yearMonth,
    amount: payload.amount,
    note: payload.note,
  });
  return response.data;
}

export async function deleteWithdrawal(id: number): Promise<{ success: boolean }> {
  await del<{ success: boolean }>(`/withdrawals/${id}`);
  return { success: true };
}

// === Revenue Adjustments ===
export async function createRevenueAdjustment(payload: CreateRevenueAdjustmentPayload): Promise<RevenueAdjustment> {
  const response = await post<ApiResponse<RevenueAdjustment>>('/revenue-adjustments', {
    year_month: payload.yearMonth,
    name: payload.name,
    amount: payload.amount,
  });
  return response.data;
}

export async function updateRevenueAdjustment(payload: UpdateRevenueAdjustmentPayload): Promise<RevenueAdjustment> {
  const response = await patch<ApiResponse<RevenueAdjustment>>(`/revenue-adjustments/${payload.id}`, {
    year_month: payload.yearMonth,
    name: payload.name,
    amount: payload.amount,
  });
  return response.data;
}

export async function deleteRevenueAdjustment(id: number): Promise<{ success: boolean }> {
  await del<{ success: boolean }>(`/revenue-adjustments/${id}`);
  return { success: true };
}

// === Partners ===
export async function fetchPartners(): Promise<Partner[]> {
  const response = await get<ApiResponse<Partner[]>>('/partners');
  return response.data;
}

export async function updatePartners(payload: UpdatePartnersPayload): Promise<Partner[]> {
  const response = await put<ApiResponse<Partner[]>>('/partners', payload);
  return response.data;
}

// === Initial Cash ===
export async function fetchInitialCash(): Promise<InitialCash[]> {
  const response = await get<ApiResponse<InitialCash[]>>('/initial-cash');
  return response.data;
}

export async function setInitialCash(year: number, amount: number, note?: string): Promise<{ success: boolean }> {
  await post<ApiResponse<InitialCash>>('/initial-cash', { year, amount, note });
  return { success: true };
}

export async function deleteInitialCash(year: number): Promise<{ success: boolean }> {
  await del<{ success: boolean }>(`/initial-cash/${year}`);
  return { success: true };
}

// === Analytics ===
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
  const response = await get<ApiResponse<SalesByWeekday[]>>(`/analytics/weekday?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`);
  return response.data;
}

export async function fetchSalesByTimeBucket(startDate: string, endDate: string): Promise<SalesByTimeBucket[]> {
  const response = await get<ApiResponse<SalesByTimeBucket[]>>(`/analytics/time-bucket?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`);
  return response.data;
}

export async function fetchSalesByMsfsVersion(startDate: string, endDate: string): Promise<SalesByMsfsVersion[]> {
  const response = await get<ApiResponse<SalesByMsfsVersion[]>>(`/analytics/msfs-version?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`);
  return response.data;
}

// === All Products ===
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
  const response = await get<ApiResponse<AllProduct[]>>('/products');
  return response.data;
}

export async function trackProduct(productId: string): Promise<{ success: boolean; message: string }> {
  const response = await patch<ApiResponse<{ is_tracked: boolean }>>(`/products/${encodeURIComponent(productId)}`, { is_tracked: true });
  return { success: true, message: response.data.is_tracked ? 'Product tracked' : 'Product untracked' };
}

export async function untrackProduct(productId: string): Promise<{ success: boolean; message: string }> {
  const response = await patch<ApiResponse<{ is_tracked: boolean }>>(`/products/${encodeURIComponent(productId)}`, { is_tracked: false });
  return { success: true, message: response.data.is_tracked ? 'Product tracked' : 'Product untracked' };
}

// === Audit Logs ===
export async function fetchLoginHistory(): Promise<AuditLog[]> {
  const response = await get<ApiResponse<AuditLog[]>>('/audit-logs');
  return response.data;
}
