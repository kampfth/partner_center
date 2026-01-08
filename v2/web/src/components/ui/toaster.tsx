import { useToast } from '@/hooks/use-toast'
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => {
        const Icon =
          toast.type === 'success'
            ? CheckCircle
            : toast.type === 'error'
              ? AlertCircle
              : toast.type === 'warning'
                ? AlertTriangle
                : null

        return (
          <div
            key={toast.id}
            className={cn(
              'relative flex items-start gap-3 rounded-lg border bg-background p-4 shadow-lg animate-fade-in',
              toast.type === 'error' && 'border-destructive/50 bg-destructive/10',
              toast.type === 'success' && 'border-green-500/50 bg-green-500/10',
              toast.type === 'warning' && 'border-yellow-500/50 bg-yellow-500/10'
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  toast.type === 'success' && 'text-green-500',
                  toast.type === 'error' && 'text-destructive',
                  toast.type === 'warning' && 'text-yellow-500'
                )}
              />
            )}
            <div className="flex-1 space-y-1">
              {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
              {toast.description && (
                <p className="text-sm text-muted-foreground">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="absolute top-2 right-2 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
