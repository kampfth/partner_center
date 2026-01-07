import { useState, useEffect, useMemo, lazy, Suspense, useCallback } from 'react';
import { format, startOfMonth } from 'date-fns';
import { Copy, Check, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/ui/ErrorState';
import { ChartSkeleton, Skeleton } from '@/components/ui/skeleton';
import { fetchReport, fetchSortOrder, fetchDateRange } from '@/api/partnerApi';
import { useToast } from '@/hooks/use-toast';
import type { ReportResponse, ReportSummary } from '@/types';

const BarChartComponent = lazy(() => import('@/components/charts/BarChartComponent'));
const ProductPieChart = lazy(() => import('@/components/charts/ProductPieChart'));

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ReportPage() {
  const [minDate, setMinDate] = useState<string | null>(null);
  const [maxDate, setMaxDate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [data, setData] = useState<ReportResponse | null>(null);
  const [sortOrder, setSortOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Load date range first
  useEffect(() => {
    async function loadDateRange() {
      try {
        const range = await fetchDateRange();
        setMinDate(range.min_date);
        setMaxDate(range.max_date);
        
        if (range.max_date) {
          const lastSaleDate = new Date(range.max_date);
          const monthStart = format(startOfMonth(lastSaleDate), 'yyyy-MM-dd');
          setStartDate(monthStart);
          setEndDate(range.max_date);
        } else {
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
      const [reportData, sortOrderData] = await Promise.all([
        fetchReport(startDate, endDate),
        fetchSortOrder(),
      ]);
      setData(reportData);
      setSortOrder(sortOrderData.value || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!initializing && startDate && endDate) {
      loadData();
    }
  }, [loadData, initializing, startDate, endDate]);

  const sortedSummary = useMemo(() => {
    if (!data?.summary) return [];
    const summary = [...data.summary];
    if (sortOrder.length === 0) return summary.sort((a, b) => b.total_amount - a.total_amount);
    return summary.sort((a, b) => {
      const aIndex = sortOrder.indexOf(a.display_name);
      const bIndex = sortOrder.indexOf(b.display_name);
      if (aIndex === -1 && bIndex === -1) return b.total_amount - a.total_amount;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [data?.summary, sortOrder]);

  const chartData = useMemo(() => {
    if (!data?.daily) return [];
    return data.daily.map((d) => ({
      date: format(new Date(d.date), 'MMM dd'),
      sales: d.total_amount,
    }));
  }, [data]);

  const pieData = useMemo(() => {
    if (!sortedSummary.length) return [];
    
    const total = sortedSummary.reduce((sum, p) => sum + p.total_amount, 0);
    if (total === 0) return [];

    const withPercentage = sortedSummary.map(p => ({
      name: p.display_name,
      value: p.total_amount,
      percentage: (p.total_amount / total) * 100
    }));

    // Group items below 5% as "Others"
    const significant = withPercentage.filter(p => p.percentage >= 5);
    const others = withPercentage.filter(p => p.percentage < 5);
    
    if (others.length > 0) {
      const othersTotal = others.reduce((sum, p) => sum + p.value, 0);
      const othersPercentage = (othersTotal / total) * 100;
      significant.push({
        name: 'Others',
        value: othersTotal,
        percentage: othersPercentage
      });
    }

    return significant;
  }, [sortedSummary]);

  const handleCopyForSheets = () => {
    if (!sortedSummary.length) return;
    const headers = ['Product', 'Total Amount', 'Units Sold', 'Avg Amount'];
    const rows = sortedSummary.map((p) => {
      const avgAmount = p.units_sold > 0 ? p.total_amount / p.units_sold : 0;
      return [p.display_name, p.total_amount.toFixed(2), p.units_sold.toString(), avgAmount.toFixed(2)];
    });
    const tsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      toast({ title: 'Copied!', description: 'Paste into Google Sheets' });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendWhatsApp = () => {
    if (!sortedSummary.length) return;
    
    const total = sortedSummary.reduce((sum, p) => sum + p.total_amount, 0);
    const lines = [
      `📊 *Sales Report*`,
      `📅 ${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`,
      ``,
      `💰 *Total: ${formatCurrency(total)}*`,
      ``,
      ...sortedSummary.slice(0, 10).map((p, i) => 
        `${i + 1}. ${p.display_name}: ${formatCurrency(p.total_amount)}`
      )
    ];
    
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header with dates and buttons */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Sales report and export</p>
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {/* Date pickers on left */}
          <div className="flex gap-2">
            <div className="space-y-1">
              <Label htmlFor="start" className="text-xs text-muted-foreground">From</Label>
              <Input 
                id="start" 
                type="date" 
                value={startDate} 
                min={minDate || undefined}
                max={maxDate || undefined}
                onChange={(e) => setStartDate(e.target.value)} 
                className="h-9 w-[140px]" 
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end" className="text-xs text-muted-foreground">To</Label>
              <Input 
                id="end" 
                type="date" 
                value={endDate} 
                min={minDate || undefined}
                max={maxDate || undefined}
                onChange={(e) => setEndDate(e.target.value)} 
                className="h-9 w-[140px]" 
              />
            </div>
          </div>

          {/* Buttons on right */}
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleCopyForSheets}
              disabled={loading || initializing || !sortedSummary.length}
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy for Sheets'}
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleSendWhatsApp}
              disabled={loading || initializing || !sortedSummary.length}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Send via WhatsApp
            </Button>
          </div>
        </div>
      </div>

      {/* Charts side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Sales Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Sales</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading || initializing ? (
              <ChartSkeleton />
            ) : chartData.length > 0 ? (
              <Suspense fallback={<ChartSkeleton />}>
                <BarChartComponent data={chartData} />
              </Suspense>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Product Distribution Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Product Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading || initializing ? (
              <div className="h-[280px] flex items-center justify-center">
                <Skeleton className="h-[180px] w-[180px] rounded-full" />
              </div>
            ) : pieData.length > 0 ? (
              <Suspense fallback={<ChartSkeleton />}>
                <ProductPieChart data={pieData} />
              </Suspense>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Product Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || initializing ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-4 w-40 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : sortedSummary.length > 0 ? (
            <div className="space-y-1">
              {sortedSummary.map((product, index) => {
                const avgAmount = product.units_sold > 0 ? product.total_amount / product.units_sold : 0;
                return (
                  <div 
                    key={product.product_id || product.group_id || product.display_name}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-secondary/50"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.display_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {product.units_sold.toLocaleString()} units
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      avg {formatCurrency(avgAmount)}
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(product.total_amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No products found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
