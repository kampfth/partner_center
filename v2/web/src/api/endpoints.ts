import { apiRequest, apiRequestFormData } from './client'
import type {
  ApiResponse,
  DiscoveredProduct,
  TrackedProduct,
  Group,
  ImportResult,
  ImportHistory,
  ReportResponse,
  DateRange,
} from '@/types'

// === Products API ===

export const productsApi = {
  list: (tracked?: boolean) =>
    apiRequest<ApiResponse<DiscoveredProduct[]>>(
      `/products${tracked !== undefined ? `?tracked=${tracked}` : ''}`
    ),

  toggleTracking: (productId: string, isTracked: boolean) =>
    apiRequest<ApiResponse<{ product_id: string; is_tracked: boolean }>>(
      `/products/${encodeURIComponent(productId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ is_tracked: isTracked }),
      }
    ),
}

// === Tracked Products API ===

export const trackedProductsApi = {
  list: () => apiRequest<ApiResponse<TrackedProduct[]>>('/tracked-products'),

  update: (
    productId: string,
    data: { label?: string; group_id?: string | null; sort_order?: number }
  ) =>
    apiRequest<ApiResponse<TrackedProduct>>(
      `/tracked-products/${encodeURIComponent(productId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    ),
}

// === Groups API ===

export const groupsApi = {
  list: () => apiRequest<ApiResponse<Group[]>>('/groups'),

  create: (name: string, productIds: string[]) =>
    apiRequest<ApiResponse<Group>>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, product_ids: productIds }),
    }),

  delete: (groupId: string) =>
    apiRequest<{ success: boolean }>(`/groups/${encodeURIComponent(groupId)}`, {
      method: 'DELETE',
    }),
}

// === Imports API ===

export const importsApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiRequestFormData<ApiResponse<ImportResult>>('/imports', formData)
  },

  list: (limit?: number) =>
    apiRequest<ApiResponse<ImportHistory[]>>(
      `/imports${limit ? `?limit=${limit}` : ''}`
    ),
}

// === Reports API ===

export const reportsApi = {
  get: (startDate: string, endDate: string) =>
    apiRequest<ApiResponse<ReportResponse>>(
      `/reports?start=${startDate}&end=${endDate}`
    ),

  getDateRange: () => apiRequest<ApiResponse<DateRange>>('/reports/date-range'),
}

// === Health API ===

export const healthApi = {
  check: () =>
    apiRequest<{ status: string; timestamp: string }>('/health'),
}
