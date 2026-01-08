import { PageSkeleton, StatCardSkeleton, ProductCardSkeleton, TableRowSkeleton, ChartSkeleton } from './skeleton';

interface LoadingStateProps {
  message?: string;
  variant?: 'page' | 'cards' | 'table' | 'chart' | 'products';
  count?: number;
}

export function LoadingState({ variant = 'page', count = 4 }: LoadingStateProps) {
  if (variant === 'page') {
    return <PageSkeleton />;
  }

  if (variant === 'cards') {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-in">
        {Array.from({ length: count }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (variant === 'products') {
    return (
      <div className="grid gap-3 animate-fade-in">
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="space-y-0 animate-fade-in">
        {Array.from({ length: count }).map((_, i) => (
          <TableRowSkeleton key={i} columns={4} />
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className="animate-fade-in">
        <ChartSkeleton />
      </div>
    );
  }

  return <PageSkeleton />;
}
