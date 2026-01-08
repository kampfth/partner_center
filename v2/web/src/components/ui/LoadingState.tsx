import { Skeleton } from './skeleton'

interface LoadingStateProps {
  message?: string
  variant?: 'page' | 'cards' | 'list' | 'inline'
  count?: number
}

export function LoadingState({
  message = 'Loading...',
  variant = 'page',
  count = 4,
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="text-sm">{message}</span>
      </div>
    )
  }

  if (variant === 'cards') {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-in">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div className="space-y-3 animate-fade-in">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    )
  }

  // Default: page skeleton
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
