import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted skeleton-shimmer",
        className
      )}
      {...props}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === 0 ? 'w-20' : i === columns - 1 ? 'w-16' : 'flex-1'
          )}
        />
      ))}
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[200px] sm:h-[280px] flex items-end gap-1 px-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 skeleton-shimmer rounded-t"
          style={{
            height: `${Math.random() * 60 + 20}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-7 w-28 mb-1" />
      <Skeleton className="h-2 w-16" />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Chart Card */}
      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="p-4">
          <ChartSkeleton />
        </div>
      </div>
    </div>
  );
}

export { 
  Skeleton, 
  CardSkeleton, 
  TableRowSkeleton, 
  ProductCardSkeleton, 
  ChartSkeleton, 
  StatCardSkeleton,
  PageSkeleton 
};
