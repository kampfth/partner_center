import { useState, useEffect } from 'react';
import { Check, X, Search, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { fetchAllProducts, trackProduct, untrackProduct, type AllProduct } from '@/api/partnerApi';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export function ProductsTab() {
  const [allProducts, setAllProducts] = useState<AllProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllProducts();
      setAllProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleTracking = async (product: AllProduct) => {
    setProcessingIds((prev) => new Set(prev).add(product.product_id));
    try {
      if (product.is_tracked) {
        await untrackProduct(product.product_id);
        toast({
          title: 'Success',
          description: `"${product.product_name}" is no longer tracked`,
        });
      } else {
        await trackProduct(product.product_id);
        toast({
          title: 'Success',
          description: `"${product.product_name}" is now being tracked`,
        });
      }
      await loadData();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update tracking',
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(product.product_id);
        return next;
      });
    }
  };

  const filteredProducts = allProducts.filter((p) =>
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.lever && p.lever.toLowerCase().includes(searchTerm.toLowerCase())) ||
    p.product_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const trackedCount = allProducts.filter((p) => p.is_tracked).length;
  const untrackedCount = allProducts.length - trackedCount;

  if (loading) {
    return <LoadingState message="Loading products..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Product Tracking</CardTitle>
          <CardDescription>
            Manage which products are tracked in reports and analytics. Products are automatically discovered when you upload CSV files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span className="font-medium">{trackedCount} Tracked</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{untrackedCount} Not Tracked</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{allProducts.length} Total</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product name, lever, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Products List */}
          <div className="max-h-[500px] overflow-auto rounded-md border">
            {filteredProducts.length > 0 ? (
              <div className="divide-y">
                {filteredProducts.map((product) => {
                  const isProcessing = processingIds.has(product.product_id);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`track-${product.id}`}
                          checked={product.is_tracked}
                          disabled={isProcessing}
                          onCheckedChange={() => handleToggleTracking(product)}
                        />
                      </div>
                      
                      <label
                        htmlFor={`track-${product.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {product.product_name}
                          </span>
                          {product.is_tracked ? (
                            <Badge variant="default" className="text-xs bg-green-600">
                              Tracked
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Not Tracked
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div><span className="font-medium">Lever:</span> {product.lever || 'N/A'}</div>
                          <div><span className="font-medium">ID:</span> {product.product_id}</div>
                          <div>
                            <span className="font-medium">Last seen:</span>{' '}
                            {new Date(product.last_seen_at).toLocaleDateString()}
                          </div>
                        </div>
                      </label>

                      <div>
                        <Button
                          size="sm"
                          variant={product.is_tracked ? 'outline' : 'default'}
                          disabled={isProcessing}
                          onClick={() => handleToggleTracking(product)}
                        >
                          {isProcessing ? (
                            'Processing...'
                          ) : product.is_tracked ? (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Stop Tracking
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Track
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">
                  {searchTerm ? 'No products found matching search' : 'No products discovered yet. Upload a CSV to discover products.'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
