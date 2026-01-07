export interface UploadResponse {
  processed: number;
  inserted: number;
  latest_date?: string;
  csv_files_processed?: number;
  errors?: string[];
}
