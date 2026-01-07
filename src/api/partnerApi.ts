import { get, post, upload } from './apiClient';
import type {
  Product,
  Group,
  ReportResponse,
  AuditLog,
  UploadResponse,
  SortOrder,
  ProductUpdate,
  AddProductPayload,
  CreateGroupPayload,
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

export async function addProduct(
  productId: string,
  productName: string,
  lever: string
): Promise<Product> {
  const payload: AddProductPayload = { productId, productName, lever };
  return post<Product>('action=add_product', payload);
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

export async function uploadFile(file: File): Promise<UploadResponse> {
  return upload<UploadResponse>(file);
}
