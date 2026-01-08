import { CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react'
import type { ImportHistory as ImportHistoryType } from '@/types'
import { formatDate, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ImportHistoryProps {
  imports: ImportHistoryType[]
}

export function ImportHistory({ imports }: ImportHistoryProps) {
  return (
    <div className="space-y-2">
      {imports.map((imp) => (
        <ImportHistoryItem key={imp.id} import={imp} />
      ))}
    </div>
  )
}

function ImportHistoryItem({ import: imp }: { import: ImportHistoryType }) {
  const StatusIcon =
    imp.status === 'completed'
      ? CheckCircle
      : imp.status === 'failed'
        ? AlertCircle
        : Clock

  const statusColor =
    imp.status === 'completed'
      ? 'text-green-500'
      : imp.status === 'failed'
        ? 'text-destructive'
        : 'text-yellow-500'

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className={cn('shrink-0', statusColor)}>
        <StatusIcon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">{imp.filename}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDate(imp.started_at)} • {formatNumber(imp.rows_read)} rows •{' '}
          {formatNumber(imp.transactions_inserted)} transactions
        </p>
      </div>
    </div>
  )
}
