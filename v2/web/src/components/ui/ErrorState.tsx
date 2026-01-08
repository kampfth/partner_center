import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 py-12 px-4">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  )
}
