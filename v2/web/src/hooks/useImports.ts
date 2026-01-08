import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { importsApi } from '@/api/endpoints'

export function useImportHistory(limit?: number) {
  return useQuery({
    queryKey: ['imports', { limit }],
    queryFn: () => importsApi.list(limit),
    select: (response) => response.data,
  })
}

export function useUploadCsv() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => importsApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}
