import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi, trackedProductsApi } from '@/api/endpoints'

export function useProducts(tracked?: boolean) {
  return useQuery({
    queryKey: ['products', { tracked }],
    queryFn: () => productsApi.list(tracked),
    select: (response) => response.data,
  })
}

export function useTrackedProducts() {
  return useQuery({
    queryKey: ['tracked-products'],
    queryFn: () => trackedProductsApi.list(),
    select: (response) => response.data,
  })
}

export function useToggleTracking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      productId,
      isTracked,
    }: {
      productId: string
      isTracked: boolean
    }) => productsApi.toggleTracking(productId, isTracked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['tracked-products'] })
    },
  })
}

export function useUpdateTrackedProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string
      data: { label?: string; group_id?: string | null; sort_order?: number }
    }) => trackedProductsApi.update(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-products'] })
    },
  })
}
