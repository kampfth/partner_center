import { ChevronDown, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Group, TrackedProduct } from '@/types'

interface GroupCardProps {
  group: Group
  products: TrackedProduct[]
  onDelete: (groupId: string) => void
  isDeleting?: boolean
}

export function GroupCard({
  group,
  products,
  onDelete,
  isDeleting,
}: GroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const groupProducts = products.filter((p) => p.group_id === group.id)

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
          <div>
            <h3 className="font-medium">{group.name}</h3>
            <p className="text-xs text-muted-foreground">
              {group.product_count} products
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(group.id)
          }}
          disabled={isDeleting}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </button>

      {isExpanded && groupProducts.length > 0 && (
        <div className="border-t bg-muted/30 p-4">
          <ul className="space-y-2">
            {groupProducts.map((product) => (
              <li
                key={product.id}
                className="flex items-center gap-2 text-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="truncate">
                  {product.label || product.product_name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
