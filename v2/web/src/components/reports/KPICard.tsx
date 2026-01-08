import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend?: {
    value: number
    label: string
  }
}

export function KPICard({ title, value, icon, trend }: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <p
                className={cn(
                  'text-xs mt-1',
                  trend.value >= 0 ? 'text-green-500' : 'text-destructive'
                )}
              >
                {trend.value >= 0 ? '+' : ''}
                {trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
