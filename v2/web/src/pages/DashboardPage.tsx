import { useState, useMemo, useEffect } from 'react'
import { DollarSign, ShoppingCart, Package } from 'lucide-react'
import { useReports, useDateRange } from '@/hooks/useReports'
import { useProducts } from '@/hooks/useProducts'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { KPICard } from '@/components/reports/KPICard'
import { SalesChart } from '@/components/reports/SalesChart'
import { TopProductsList } from '@/components/reports/TopProductsList'
import { DateRangePicker } from '@/components/reports/DateRangePicker'
import { formatCurrency, formatNumber } from '@/lib/utils'

export default function DashboardPage() {
  const { data: dateRange, isLoading: isLoadingRange } = useDateRange()
  const { data: products } = useProducts()

  // Initialize dates based on available range
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  useEffect(() => {
    if (dateRange && !startDate && !endDate) {
      // Default to last 30 days or available range
      const today = new Date().toISOString().split('T')[0]
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const defaultStart = thirtyDaysAgo.toISOString().split('T')[0]

      setStartDate(
        defaultStart < dateRange.min_date ? dateRange.min_date : defaultStart
      )
      setEndDate(today > dateRange.max_date ? dateRange.max_date : today)
    }
  }, [dateRange, startDate, endDate])

  const {
    data: report,
    isLoading: isLoadingReport,
    error,
    refetch,
  } = useReports(startDate, endDate)

  const trackedCount = useMemo(
    () => products?.filter((p) => p.is_tracked).length || 0,
    [products]
  )

  const totals = useMemo(() => {
    if (!report?.daily) return { amount: 0, units: 0 }
    return report.daily.reduce(
      (acc, day) => ({
        amount: acc.amount + day.total_amount,
        units: acc.units + day.total_units,
      }),
      { amount: 0, units: 0 }
    )
  }, [report])

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
  }

  if (isLoadingRange || (isLoadingReport && !report)) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <LoadingState variant="page" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <ErrorState
          message={error instanceof Error ? error.message : 'Failed to load data'}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  const hasData = report && report.daily.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your Partner Center sales"
        action={
          dateRange && (
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
              minDate={dateRange.min_date}
              maxDate={dateRange.max_date}
            />
          )
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(totals.amount)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KPICard
          title="Units Sold"
          value={formatNumber(totals.units)}
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <KPICard
          title="Products Tracked"
          value={formatNumber(trackedCount)}
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      {/* Main Content */}
      {!hasData ? (
        <EmptyState
          title="No sales data"
          message="Upload CSV files and track products to see your sales dashboard."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart - takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <SalesChart data={report.daily} />
          </div>

          {/* Top Products */}
          <div>
            <TopProductsList data={report.summary} limit={5} />
          </div>
        </div>
      )}
    </div>
  )
}
