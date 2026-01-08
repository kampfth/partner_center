import { Inbox } from 'lucide-react'
import { Button } from './button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title?: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  icon,
  title = 'No data',
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 px-4">
      <div className="rounded-full bg-muted p-3">
        {icon || <Inbox className="h-6 w-6 text-muted-foreground" />}
      </div>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        {message}
      </p>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  )
}
