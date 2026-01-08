import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ProductSummary } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface TopProductsListProps {
  data: ProductSummary[]
  title?: string
  limit?: number
}

export function TopProductsList({
  data,
  title = 'Top Products',
  limit = 5,
}: TopProductsListProps) {
  const sortedData = [...data]
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, limit)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {sortedData.map((item, index) => (
            <div
              key={item.product_id || item.group_id}
              className="flex items-center gap-3"
            >
              <span className="text-sm font-medium text-muted-foreground w-5">
                {index + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {item.display_name}
                  </span>
                  {item.type === 'Group' && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Group
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(item.units_sold)} units
                </p>
              </div>
              <span className="font-semibold text-sm shrink-0">
                {formatCurrency(item.total_amount)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
