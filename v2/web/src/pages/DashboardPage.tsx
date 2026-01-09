import { useState, useEffect, useMemo, lazy, Suspense, useCallback } from 'react';
import { format, startOfMonth } from 'date-fns';
import { DollarSign, TrendingUp, ShoppingCart, CalendarDays, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/ui/ErrorState';
import { ChartSkeleton, Skeleton } from '@/components/ui/skeleton';
import { fetchReport, fetchDateRange } from '@/api/partnerApi';
import type { ReportResponse, ReportSummary } from '@/types';

const SalesChart = lazy(() => import('@/components/charts/SalesChart'));

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function StatCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Skeleton className="h-3 w-16 sm:w-20" />
          <Skeleton className="h-4 w-4 rounded shrink-0" />
        </div>
        <Skeleton className="h-6 sm:h-7 w-20 sm:w-24" />
        <Skeleton className="h-3 w-14 sm:w-16 mt-1" />
      </CardContent>
    </Card>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  subtitle?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </span>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
        </div>
        <div className="text-lg sm:text-2xl font-semibold tracking-tight tabular-nums truncate">{value}</div>
        {subtitle && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ProductSummaryCard({ 
  product, 
  rank 
}: { 
  product: ReportSummary;
  rank: number;
}) {
  const averageAmount = product.units_sold > 0 
    ? product.total_amount / product.units_sold 
    : 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/20 last:border-0">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.display_name}</p>
        <p className="text-xs text-muted-foreground">
          {product.units_sold.toLocaleString()} units
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums">{formatCurrency(product.total_amount)}</p>
        <p className="text-xs text-muted-foreground">avg {formatCurrency(averageAmount)}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [minDate, setMinDate] = useState<string | null>(null);
  const [maxDate, setMaxDate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load date range first
  useEffect(() => {
    async function loadDateRange() {
      try {
        const range = await fetchDateRange();
        setMinDate(range.min_date);
        setMaxDate(range.max_date);
        
        if (range.max_date) {
          // Set default to the month of the last sale
          const lastSaleDate = new Date(range.max_date);
          const monthStart = format(startOfMonth(lastSaleDate), 'yyyy-MM-dd');
          setStartDate(monthStart);
          setEndDate(range.max_date);
        } else {
          // No data, use current month
          const now = new Date();
          setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
          setEndDate(format(now, 'yyyy-MM-dd'));
        }
      } catch (err) {
        console.error('Failed to load date range:', err);
        const now = new Date();
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
      } finally {
        setInitializing(false);
      }
    }
    loadDateRange();
  }, []);

  const loadData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchReport(startDate, endDate);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!initializing && startDate && endDate) {
    loadData();
    }
  }, [loadData, initializing, startDate, endDate]);

  const stats = useMemo(() => {
    if (!data) return null;
    const totalSales = data.summary.reduce((sum, p) => sum + p.total_amount, 0);
    const totalUnits = data.summary.reduce((sum, p) => sum + p.units_sold, 0);
    const avgPerUnit = totalUnits > 0 ? totalSales / totalUnits : 0;
    const daysWithData = data.daily.length;
    const avgPerDay = daysWithData > 0 ? totalSales / daysWithData : 0;
    return { totalSales, totalUnits, avgPerUnit, avgPerDay, daysWithData };
  }, [data]);

  const chartData = useMemo(() => {
    if (!data?.daily) return [];
    return data.daily.map((d) => ({
      date: format(new Date(d.date), 'MMM dd'),
      sales: d.total_amount,
      transactions: d.total_units,
    }));
  }, [data]);

  const setQuickRange = (days: number) => {
    if (!maxDate) return;
    const end = new Date(maxDate);
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    
    // Don't go before minDate
    if (minDate && start < new Date(minDate)) {
      setStartDate(minDate);
    } else {
    setStartDate(format(start, 'yyyy-MM-dd'));
    }
    setEndDate(maxDate);
  };

  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Sales overview</p>
          </div>
          {maxDate && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Last Sale</p>
              <p className="text-sm font-medium">{format(new Date(maxDate), 'MMM d, yyyy')}</p>
            </div>
          )}
        </div>
        
        {/* Date Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-2">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                variant="secondary"
                size="sm"
                onClick={() => setQuickRange(days)}
                className="bg-secondary/80 hover:bg-secondary border border-border/50"
                disabled={!maxDate}
              >
                {days}d
              </Button>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="start" className="text-xs text-muted-foreground">From</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                min={minDate || undefined}
                max={maxDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="end" className="text-xs text-muted-foreground">To</Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                min={minDate || undefined}
                max={maxDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats - 5 cards: Total Sales, Units Sold, Avg/Day, Avg/Unit, Period */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {loading || initializing ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : stats ? (
          <>
            <StatCard
              title="Total Sales"
              value={formatCurrency(stats.totalSales)}
              icon={DollarSign}
            />
            <StatCard
              title="Units Sold"
              value={stats.totalUnits.toLocaleString()}
              icon={ShoppingCart}
            />
            <StatCard
              title="Avg/Day"
              value={formatCurrency(stats.avgPerDay)}
              icon={Activity}
            />
            <StatCard
              title="Avg/Unit"
              value={formatCurrency(stats.avgPerUnit)}
              icon={TrendingUp}
            />
            <StatCard
              title="Period"
              value={`${stats.daysWithData}d`}
              icon={CalendarDays}
              subtitle={startDate && endDate ? `${format(new Date(startDate), 'MMM d')} – ${format(new Date(endDate), 'MMM d')}` : ''}
            />
          </>
        ) : null}
      </div>

      {/* Chart + Top Products Side by Side */}
      <div className="grid gap-4 lg:grid-cols-2">
      {/* Chart */}
      <Card>
          <div className="p-4">
          <h2 className="text-base font-semibold">Daily Sales</h2>
        </div>
        <CardContent className="pt-0">
            {loading || initializing ? (
              <ChartSkeleton />
            ) : chartData.length > 0 ? (
            <Suspense fallback={<ChartSkeleton />}>
              <SalesChart data={chartData} />
            </Suspense>
          ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
              No data for selected period
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
          <div className="p-4">
          <h2 className="text-base font-semibold">Top Products</h2>
        </div>
        <CardContent className="pt-0">
            {loading || initializing ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-28 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data?.summary && data.summary.length > 0 ? (
            <div>
              {data.summary
                  .sort((a, b) => b.total_amount - a.total_amount)
                .slice(0, 5)
                .map((product, index) => (
                  <ProductSummaryCard 
                      key={product.product_id || product.group_id || product.display_name} 
                    product={product} 
                    rank={index + 1} 
                  />
                ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No products found
            </p>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
