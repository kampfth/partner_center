// === Produtos ===

export interface DiscoveredProduct {
  id: string
  product_id: string
  product_name: string
  lever: string
  first_seen_at: string
  last_seen_at: string
  is_tracked: boolean
}

export interface TrackedProduct {
  id: string
  product_id: string
  product_name: string
  lever: string
  label: string | null
  group_id: string | null
  group_name: string | null
  sort_order: number
}

// === Grupos ===

export interface Group {
  id: string
  name: string
  product_count: number
  created_at: string
}

export interface CreateGroupRequest {
  name: string
  product_ids: string[]
}

// === Imports ===

export interface ImportResult {
  import_id: string
  filename: string
  rows_read: number
  products_discovered: number
  transactions_inserted: number
  transactions_skipped: number
  transactions_untracked: number
  status: 'processing' | 'completed' | 'failed'
}

export interface ImportHistory {
  id: string
  filename: string
  rows_read: number
  transactions_inserted: number
  status: string
  started_at: string
  finished_at: string | null
}

// === Reports ===

export interface DailySales {
  date: string
  total_units: number
  total_amount: number
}

export interface ProductSummary {
  product_id: string | null
  group_id: string | null
  display_name: string
  units_sold: number
  total_amount: number
  type: 'Product' | 'Group'
}

export interface ReportResponse {
  daily: DailySales[]
  summary: ProductSummary[]
}

export interface DateRange {
  min_date: string
  max_date: string
}

// === API Response Wrapper ===

export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error: string
  code: string
}
