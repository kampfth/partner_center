import { useState, useMemo } from 'react'
import { Search, Package } from 'lucide-react'
import { useProducts, useToggleTracking } from '@/hooks/useProducts'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProductList } from '@/components/products/ProductList'

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const { data: products, isLoading, error, refetch } = useProducts()
  const toggleTracking = useToggleTracking()
  const { toast } = useToast()

  const filteredProducts = useMemo(() => {
    if (!products) return []
    if (!search.trim()) return products

    const searchLower = search.toLowerCase()
    return products.filter(
      (p) =>
        p.product_name.toLowerCase().includes(searchLower) ||
        p.lever.toLowerCase().includes(searchLower)
    )
  }, [products, search])

  const handleToggleTracking = async (productId: string, isTracked: boolean) => {
    try {
      await toggleTracking.mutateAsync({ productId, isTracked })
      toast({
        type: 'success',
        title: isTracked ? 'Product tracked' : 'Tracking disabled',
        description: isTracked
          ? 'Future imports will save transactions for this product.'
          : 'Tracking has been disabled for this product.',
      })
    } catch (err) {
      toast({
        type: 'error',
        title: 'Failed to update tracking',
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Products"
          description="Manage which products to track for sales data"
        />
        <LoadingState variant="list" count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Products"
          description="Manage which products to track for sales data"
        />
        <ErrorState
          message={error instanceof Error ? error.message : 'Failed to load products'}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  const trackedCount = products?.filter((p) => p.is_tracked).length || 0

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${trackedCount} of ${products?.length || 0} products tracked`}
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Package className="h-6 w-6 text-muted-foreground" />}
          title={search ? 'No products found' : 'No products yet'}
          message={
            search
              ? 'Try adjusting your search terms.'
              : 'Upload a CSV file to discover products.'
          }
          action={
            search
              ? { label: 'Clear search', onClick: () => setSearch('') }
              : undefined
          }
        />
      ) : (
        <ProductList
          products={filteredProducts}
          onToggleTracking={handleToggleTracking}
          togglingProductId={
            toggleTracking.isPending
              ? (toggleTracking.variables?.productId as string)
              : undefined
          }
        />
      )}
    </div>
  )
}
