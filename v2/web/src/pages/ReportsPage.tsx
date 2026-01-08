import { useState, useEffect, useMemo } from 'react'
import { FileText } from 'lucide-react'
import { useReports, useDateRange } from '@/hooks/useReports'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SalesChart } from '@/components/reports/SalesChart'
import { SummaryTable } from '@/components/reports/SummaryTable'
import { DateRangePicker } from '@/components/reports/DateRangePicker'
import { formatCurrency, formatNumber } from '@/lib/utils'

export default function ReportsPage() {
  const { data: dateRange, isLoading: isLoadingRange } = useDateRange()

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
        <PageHeader title="Reports" />
        <LoadingState variant="page" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Reports" />
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
        title="Reports"
        description="Detailed sales reports and analytics"
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

      {!hasData ? (
        <EmptyState
          icon={<FileText className="h-6 w-6 text-muted-foreground" />}
          title="No report data"
          message="There's no sales data for the selected period. Try selecting a different date range or upload more CSV files."
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(totals.amount)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Units
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatNumber(totals.units)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Chart */}
          <SalesChart data={report.daily} title="Revenue Over Time" />

          {/* Summary Table */}
          <div>
            <h2 className="text-lg font-semibold mb-3">
              Sales by Product/Group
            </h2>
            <SummaryTable data={report.summary} />
          </div>
        </>
      )}
    </div>
  )
}
