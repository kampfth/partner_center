export interface ProductGroup {
  id: string;
  name: string;
}

export interface Product {
  product_id: string;
  product_name: string;
  lever: string;
  label: string;
  group_id: string | null;
  product_groups?: ProductGroup;
}

export interface ProductUpdate {
  product_id: string;
  label: string;
  group_id: string | null;
}

export interface AddProductPayload {
  productId: string;
  productName: string;
  lever: string;
}
