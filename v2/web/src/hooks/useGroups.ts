import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '@/api/endpoints'

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.list(),
    select: (response) => response.data,
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, productIds }: { name: string; productIds: string[] }) =>
      groupsApi.create(name, productIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['tracked-products'] })
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (groupId: string) => groupsApi.delete(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['tracked-products'] })
    },
  })
}
