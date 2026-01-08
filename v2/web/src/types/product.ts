export interface ProductGroup {
  id: string;
  name: string;
  product_count?: number;
}

export interface Product {
  id: string;
  product_id: string;
  product_name: string;
  lever: string;
  label: string;
  group_id: string | null;
  sort_order?: number;
  product_groups?: ProductGroup;
}

export interface ProductUpdate {
  product_id: string;
  label?: string;
  group_id?: string | null;
  sort_order?: number;
}
