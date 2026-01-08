import {
  CheckCircle,
  AlertCircle,
  FileText,
  Package,
  Database,
  XCircle,
  MinusCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ImportResult as ImportResultType } from '@/types'
import { formatNumber } from '@/lib/utils'

interface ImportResultProps {
  result: ImportResultType
}

export function ImportResult({ result }: ImportResultProps) {
  const isSuccess = result.status === 'completed'
  const isFailed = result.status === 'failed'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {isSuccess ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : isFailed ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
          {result.filename}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatItem
            icon={<FileText className="h-4 w-4" />}
            label="Rows read"
            value={formatNumber(result.rows_read)}
          />
          <StatItem
            icon={<Package className="h-4 w-4" />}
            label="Products discovered"
            value={formatNumber(result.products_discovered)}
            highlight={result.products_discovered > 0}
          />
          <StatItem
            icon={<Database className="h-4 w-4" />}
            label="Transactions inserted"
            value={formatNumber(result.transactions_inserted)}
            highlight={result.transactions_inserted > 0}
          />
          <StatItem
            icon={<XCircle className="h-4 w-4" />}
            label="Skipped (dupes)"
            value={formatNumber(result.transactions_skipped)}
          />
          <StatItem
            icon={<MinusCircle className="h-4 w-4" />}
            label="Untracked"
            value={formatNumber(result.transactions_untracked)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function StatItem({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={
            highlight ? 'font-semibold text-green-500' : 'font-medium text-foreground'
          }
        >
          {value}
        </p>
      </div>
    </div>
  )
}
