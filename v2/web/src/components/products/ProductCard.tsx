import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import type { DiscoveredProduct } from '@/types'
import { formatDate } from '@/lib/utils'

interface ProductCardProps {
  product: DiscoveredProduct
  onToggleTracking: (productId: string, isTracked: boolean) => void
  isToggling?: boolean
}

export function ProductCard({
  product,
  onToggleTracking,
  isToggling,
}: ProductCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-foreground truncate">
              {product.product_name}
            </h3>
            {product.is_tracked && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                Tracked
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {product.lever}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>First seen: {formatDate(product.first_seen_at)}</span>
            <span className="hidden sm:inline">
              Last seen: {formatDate(product.last_seen_at)}
            </span>
          </div>
        </div>
        <div className="shrink-0 touch-target flex items-center justify-center">
          <Switch
            checked={product.is_tracked}
            onCheckedChange={(checked) =>
              onToggleTracking(product.product_id, checked)
            }
            disabled={isToggling}
            aria-label={`Track ${product.product_name}`}
          />
        </div>
      </div>
    </div>
  )
}
