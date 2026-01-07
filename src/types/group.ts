export interface Group {
  id: string;
  name: string;
}

export interface CreateGroupPayload {
  name: string;
  productIds: string[];
}
