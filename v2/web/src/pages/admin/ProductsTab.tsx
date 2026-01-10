import { useState, useEffect, useMemo, useRef } from 'react';
import { Check, X, Search, AlertCircle, Edit2, CheckSquare, Square, Download, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { 
  fetchAllProducts, 
  trackProduct, 
  untrackProduct, 
  updateAllProduct,
  importProductsCsv,
  exportProductsCsvUrl,
  PRODUCT_TYPES,
  type AllProduct, 
  type ProductType 
} from '@/api/partnerApi';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ProductsTab() {
  const [allProducts, setAllProducts] = useState<AllProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AllProduct | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editProductType, setEditProductType] = useState<ProductType | ''>('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<{ updated: number; skipped: number; warnings: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllProducts();
      setAllProducts(data);
      setSelectedIds(new Set()); // Clear selection on reload
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
          description: `"${product.label || product.product_name}" is no longer tracked`,
        });
      } else {
        await trackProduct(product.product_id);
        toast({
          title: 'Success',
          description: `"${product.label || product.product_name}" is now being tracked`,
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

  const toggleSelection = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const filteredProducts = useMemo(() => 
    allProducts.filter((p) =>
      p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.lever && p.lever.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.label && p.label.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.product_type && p.product_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.product_id.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [allProducts, searchTerm]
  );

  const selectAll = () => {
    setSelectedIds(new Set(filteredProducts.map(p => p.product_id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkTrack = async (track: boolean) => {
    if (selectedIds.size === 0) return;
    
    setBulkProcessing(true);
    const selectedProducts = allProducts.filter(p => selectedIds.has(p.product_id));
    let successCount = 0;
    let errorCount = 0;

    for (const product of selectedProducts) {
      // Skip if already in desired state
      if (product.is_tracked === track) {
        successCount++;
        continue;
      }
      
      try {
        if (track) {
          await trackProduct(product.product_id);
        } else {
          await untrackProduct(product.product_id);
        }
        successCount++;
      } catch {
        errorCount++;
      }
    }

    toast({
      title: errorCount > 0 ? 'Partial Success' : 'Success',
      description: `${successCount} product${successCount !== 1 ? 's' : ''} ${track ? 'tracked' : 'untracked'}${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      variant: errorCount > 0 ? 'destructive' : 'default',
    });

    await loadData();
    setBulkProcessing(false);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    
    setSavingEdit(true);
    try {
      const payload: { label?: string | null; product_type?: ProductType | null } = {};
      
      // Determine label value
      const trimmedLabel = editLabel.trim();
      if (trimmedLabel === '' || trimmedLabel === editingProduct.product_name) {
        payload.label = null; // Clear label to use product_name
      } else {
        payload.label = trimmedLabel;
      }
      
      // Determine product_type value
      if (editProductType === '') {
        payload.product_type = null;
      } else {
        payload.product_type = editProductType as ProductType;
      }

      await updateAllProduct(editingProduct.product_id, payload);
      
      toast({
        title: 'Success',
        description: `Product "${editingProduct.product_name}" updated`,
      });
      
      setEditingProduct(null);
      await loadData();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update product',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExport = () => {
    // Open export URL in new tab/download
    window.open(exportProductsCsvUrl(), '_blank');
    toast({
      title: 'Export Started',
      description: 'Your product list CSV is being downloaded.',
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please select a CSV file.',
      });
      return;
    }

    setImporting(true);
    setImportResult(null);
    setImportDialogOpen(true);

    try {
      const csvContent = await file.text();
      const result = await importProductsCsv(csvContent);
      setImportResult(result);
      
      if (result.updated > 0) {
        await loadData();
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: err instanceof Error ? err.message : 'Failed to import products',
      });
      setImportDialogOpen(false);
    } finally {
      setImporting(false);
    }
  };

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
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Product Tracking</CardTitle>
              <CardDescription>
                Manage which products are tracked in reports and analytics.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleImportClick}>
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm">
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

          {/* Search + Bulk Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, label, type, lever, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={bulkProcessing}
                className="whitespace-nowrap"
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                Select All
              </Button>
              {selectedIds.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    disabled={bulkProcessing}
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleBulkTrack(true)}
                    disabled={bulkProcessing}
                    className="whitespace-nowrap"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Track ({selectedIds.size})
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleBulkTrack(false)}
                    disabled={bulkProcessing}
                    className="whitespace-nowrap"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Untrack ({selectedIds.size})
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Products List */}
          <div className="max-h-[calc(100vh-350px)] min-h-[200px] overflow-auto rounded-md border scrollbar-thin">
            {filteredProducts.length > 0 ? (
              <div className="divide-y">
                {filteredProducts.map((product) => {
                  const isProcessing = processingIds.has(product.product_id);
                  const isSelected = selectedIds.has(product.product_id);
                  const checkboxId = `prod-sel-${product.id}`;
                  const displayName = product.label || product.product_name;
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 p-3 transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-accent/50'
                      }`}
                    >
                      {/* Selection checkbox */}
                      <Checkbox
                        id={checkboxId}
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(product.product_id)}
                        disabled={bulkProcessing}
                      />
                      
                      {/* Tracking checkbox */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`track-${product.id}`}
                          checked={product.is_tracked}
                          disabled={isProcessing || bulkProcessing}
                          onCheckedChange={() => handleToggleTracking(product)}
                        />
                      </div>
                      
                      <div
                        className="flex-1 cursor-pointer min-w-0"
                        onClick={() => toggleSelection(product.product_id)}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {displayName}
                          </span>
                          {product.label && product.label !== product.product_name && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={product.product_name}>
                              ({product.product_name})
                            </span>
                          )}
                          {product.is_tracked ? (
                            <Badge variant="default" className="text-xs bg-green-600 shrink-0">
                              Tracked
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Not Tracked
                            </Badge>
                          )}
                          {product.product_type && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {product.product_type}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div><span className="font-medium">Lever:</span> {product.lever || 'N/A'}</div>
                          <div className="truncate"><span className="font-medium">ID:</span> {product.product_id}</div>
                          <div>
                            <span className="font-medium">Last seen:</span>{' '}
                            {new Date(product.last_seen_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isProcessing || bulkProcessing}
                          onClick={() => {
                            setEditingProduct(product);
                            setEditLabel(product.label || product.product_name);
                            setEditProductType((product.product_type as ProductType) || '');
                          }}
                          title="Edit label & type"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={product.is_tracked ? 'outline' : 'default'}
                          disabled={isProcessing || bulkProcessing}
                          onClick={() => handleToggleTracking(product)}
                        >
                          {isProcessing ? (
                            '...'
                          ) : product.is_tracked ? (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Stop
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

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the display label and category for this product.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Original Name</Label>
              <p className="text-sm text-muted-foreground break-words">{editingProduct?.product_name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-label">Display Label</Label>
              <Input
                id="edit-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="Enter custom label..."
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                This label will be shown in reports and dashboards instead of the original name.
                Leave empty or same as original to use the product name.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Product Type</Label>
              <Select
                value={editProductType}
                onValueChange={(val) => setEditProductType(val as ProductType | '')}
              >
                <SelectTrigger id="edit-type">
                  <SelectValue placeholder="Select a type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- None --</SelectItem>
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Categorize this product for filtering and organization.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Result Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Results</DialogTitle>
          </DialogHeader>
          {importing ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Importing products...</p>
            </div>
          ) : importResult ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-lg bg-green-500/10">
                  <div className="text-2xl font-bold text-green-600">{importResult.updated}</div>
                  <div className="text-sm text-muted-foreground">Updated</div>
                </div>
                <div className="p-4 rounded-lg bg-amber-500/10">
                  <div className="text-2xl font-bold text-amber-600">{importResult.skipped}</div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </div>
              </div>
              
              {importResult.warnings.length > 0 && (
                <div className="space-y-2">
                  <Label>Warnings ({importResult.warnings.length})</Label>
                  <div className="max-h-[200px] overflow-auto rounded-md border p-3 bg-muted/50">
                    {importResult.warnings.map((warning, i) => (
                      <p key={i} className="text-xs text-amber-600 mb-1">{warning}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setImportDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
