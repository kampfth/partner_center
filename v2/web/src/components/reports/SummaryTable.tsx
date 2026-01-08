import { Badge } from '@/components/ui/badge'
import type { ProductSummary } from '@/types'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface SummaryTableProps {
  data: ProductSummary[]
}

export function SummaryTable({ data }: SummaryTableProps) {
  const sortedData = [...data].sort((a, b) => b.total_amount - a.total_amount)

  // Mobile view: card layout
  // Desktop view: table layout
  return (
    <>
      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {sortedData.map((item, index) => (
          <div
            key={item.product_id || item.group_id}
            className="rounded-lg border bg-card p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    #{index + 1}
                  </span>
                  <span className="font-medium text-sm truncate">
                    {item.display_name}
                  </span>
                  {item.type === 'Group' && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Group
                    </Badge>
                  )}
                </div>
              </div>
              <span className="font-semibold shrink-0">
                {formatCurrency(item.total_amount)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(item.units_sold)} units sold
            </p>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                #
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Name
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Type
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                Units
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                Revenue
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedData.map((item, index) => (
              <tr
                key={item.product_id || item.group_id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {index + 1}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {item.display_name}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={item.type === 'Group' ? 'secondary' : 'outline'}
                    className="text-[10px]"
                  >
                    {item.type}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {formatNumber(item.units_sold)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-right">
                  {formatCurrency(item.total_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
