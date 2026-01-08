import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/endpoints'

export function useReports(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['reports', { startDate, endDate }],
    queryFn: () => reportsApi.get(startDate, endDate),
    select: (response) => response.data,
    enabled: !!startDate && !!endDate,
  })
}

export function useDateRange() {
  return useQuery({
    queryKey: ['date-range'],
    queryFn: () => reportsApi.getDateRange(),
    select: (response) => response.data,
  })
}
