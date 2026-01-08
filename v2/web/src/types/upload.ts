export interface UploadResponse {
  import_id: string;
  filename: string;
  rows_read: number;
  products_discovered: number;
  transactions_inserted: number;
  transactions_skipped: number;
  transactions_untracked: number;
  status: string;
}
