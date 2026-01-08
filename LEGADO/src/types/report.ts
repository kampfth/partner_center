// Types matching actual backend response fields

export interface ReportDaily {
  date: string;
  total_units: number;
  total_amount: number;
}

export interface ReportSummary {
  product_id: string | null;
  group_id: string | null;
  display_name: string;
  units_sold: number;
  total_amount: number;
  type: 'Product' | 'Group';
}

export interface ReportResponse {
  daily: ReportDaily[];
  summary: ReportSummary[];
}
