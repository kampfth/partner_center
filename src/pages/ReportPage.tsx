import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { format, subDays } from 'date-fns';
import { Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ChartSkeleton } from '@/components/ui/skeleton';
import { fetchReport, fetchSortOrder } from '@/api/partnerApi';
import { useToast } from '@/hooks/use-toast';
import type { ReportResponse, ReportSummary } from '@/types';

const BarChartComponent = lazy(() => import('@/components/charts/BarChartComponent'));

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function ProductRankCard({
  product,
  rank,
}: {
  product: ReportSummary;
  rank: number;
}) {
  const averageAmount = product.units_sold > 0 
    ? product.total_amount / product.units_sold 
    : 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.display_name}</p>
        <p className="text-xs text-muted-foreground">
          {product.units_sold.toLocaleString()} units · avg {formatCurrency(averageAmount)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums">{formatCurrency(product.total_amount)}</p>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<ReportResponse | null>(null);
  const [sortOrder, setSortOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

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

  if (loading) return <LoadingState variant="page" />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Report</h1>
          <p className="text-sm text-muted-foreground">Sales report and export</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-2 flex-1">
            <div className="flex-1 space-y-1">
              <Label htmlFor="start" className="text-xs text-muted-foreground">Start</Label>
              <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10" />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="end" className="text-xs text-muted-foreground">End</Label>
              <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10" />
            </div>
          </div>
          <Button size="touch" onClick={handleCopyForSheets} className="w-full sm:w-auto">
            {copied ? <Check className="h-5 w-5 mr-2" /> : <Copy className="h-5 w-5 mr-2" />}
            {copied ? 'Copied!' : 'Copy for Sheets'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Daily Sales</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {chartData.length > 0 ? (
            <Suspense fallback={<ChartSkeleton />}><BarChartComponent data={chartData} /></Suspense>
          ) : <p className="py-12 text-center text-sm text-muted-foreground">No data available</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Product Ranking</CardTitle></CardHeader>
        <CardContent>
          {sortedSummary.length > 0 ? (
            <div className="space-y-2">
              {sortedSummary.map((product, index) => (
                <ProductRankCard 
                  key={product.product_id || product.group_id || product.display_name} 
                  product={product} 
                  rank={index + 1} 
                />
              ))}
            </div>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">No products found</p>}
        </CardContent>
      </Card>
    </div>
  );
}
