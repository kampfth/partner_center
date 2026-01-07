import { useState, useEffect, useMemo, lazy, Suspense, useCallback } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { DollarSign, TrendingUp, ShoppingCart, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/ui/ErrorState';
import { ChartSkeleton, Skeleton } from '@/components/ui/skeleton';
import { fetchReport } from '@/api/partnerApi';
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
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-3 w-16 mt-2" />
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
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="display-number">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
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
    <div className="flex items-center gap-4 py-3 border-b border-border/20 last:border-0">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
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
  const [startDate, setStartDate] = useState(() => 
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(() => 
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
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
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    if (!data) return null;
    const totalSales = data.summary.reduce((sum, p) => sum + p.total_amount, 0);
    const totalUnits = data.summary.reduce((sum, p) => sum + p.units_sold, 0);
    const avgPerUnit = totalUnits > 0 ? totalSales / totalUnits : 0;
    const daysWithData = data.daily.length;
    return { totalSales, totalUnits, avgPerUnit, daysWithData };
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
    const end = new Date();
    const start = subDays(end, days);
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Sales overview</p>
        </div>
        
        {/* Date Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-2">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                variant="secondary"
                size="sm"
                onClick={() => setQuickRange(days)}
                className="bg-secondary/80 hover:bg-secondary border border-border/50"
              >
                {days}d
              </Button>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="start" className="text-xs text-muted-foreground">From</Label>
              <div className="relative">
                <Input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input-white"
                />
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="end" className="text-xs text-muted-foreground">To</Label>
              <div className="relative">
                <Input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
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
              subtitle={`${stats.daysWithData} days`}
            />
            <StatCard
              title="Units Sold"
              value={stats.totalUnits.toLocaleString()}
              icon={ShoppingCart}
            />
            <StatCard
              title="Avg/Unit"
              value={formatCurrency(stats.avgPerUnit)}
              icon={TrendingUp}
            />
            <StatCard
              title="Period"
              value={`${stats.daysWithData}d`}
              icon={Calendar}
              subtitle={`${format(new Date(startDate), 'MMM d')} – ${format(new Date(endDate), 'MMM d')}`}
            />
          </>
        ) : null}
      </div>

      {/* Chart + Top Products Side by Side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart */}
        <Card>
          <div className="p-4 sm:p-5">
            <h2 className="text-base font-semibold">Daily Sales</h2>
          </div>
          <CardContent className="pt-0">
            {loading ? (
              <ChartSkeleton />
            ) : chartData.length > 0 ? (
              <Suspense fallback={<ChartSkeleton />}>
                <SalesChart data={chartData} />
              </Suspense>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No data for selected period
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <div className="p-4 sm:p-5">
            <h2 className="text-base font-semibold">Top Products</h2>
          </div>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 py-3">
                    <Skeleton className="w-7 h-7 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-16" />
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
