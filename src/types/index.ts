export * from './product';
export * from './group';
export * from './report';
export * from './audit';
export * from './upload';

export interface SortOrder {
  value: string[];
}

export interface ApiError {
  message: string;
  status?: number;
}
