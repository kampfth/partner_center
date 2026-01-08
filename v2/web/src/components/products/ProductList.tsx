import { ProductCard } from './ProductCard'
import type { DiscoveredProduct } from '@/types'

interface ProductListProps {
  products: DiscoveredProduct[]
  onToggleTracking: (productId: string, isTracked: boolean) => void
  togglingProductId?: string
}

export function ProductList({
  products,
  onToggleTracking,
  togglingProductId,
}: ProductListProps) {
  return (
    <div className="space-y-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onToggleTracking={onToggleTracking}
          isToggling={togglingProductId === product.product_id}
        />
      ))}
    </div>
  )
}
