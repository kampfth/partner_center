import { useState, useEffect } from 'react';
import { Check, X, Pencil, Plus, Trash2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  fetchProducts, 
  fetchGroups, 
  updateProduct, 
  fetchAvailableProducts, 
  addProduct,
  removeProduct,
  type AvailableProduct 
} from '@/api/partnerApi';
import { useToast } from '@/hooks/use-toast';
import type { Product, Group } from '@/types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsData, groupsData] = await Promise.all([
        fetchProducts(),
        fetchGroups(),
      ]);
      setProducts(productsData);
      setGroups(groupsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailable = async () => {
    setLoadingAvailable(true);
    try {
      const data = await fetchAvailableProducts();
      setAvailableProducts(data);
    } catch (err) {
      console.error('Failed to load available products:', err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  useEffect(() => {
    loadData();
    loadAvailable();
  }, []);

  const startEdit = (product: Product) => {
    setEditingId(product.product_id);
    setEditLabel(product.label || product.product_name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
  };

  const saveEdit = async (product: Product) => {
    if (!editLabel.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Label cannot be empty' });
      return;
    }

    setSaving(true);
    try {
      await updateProduct(product.product_id, editLabel.trim(), product.group_id);
      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === product.product_id ? { ...p, label: editLabel.trim() } : p
        )
      );
      toast({ title: 'Saved', description: 'Product label updated' });
      cancelEdit();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Failed to update' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = async (ap: AvailableProduct) => {
    setAddingId(ap.product_id);
    try {
      await addProduct(ap.product_id, ap.product_name, ap.lever);
      toast({ title: 'Added', description: `${ap.product_name} added to tracked products` });
      // Reload both lists
      await Promise.all([loadData(), loadAvailable()]);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Failed to add' });
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveProduct = async (product: Product) => {
    setRemovingId(product.product_id);
    try {
      await removeProduct(product.product_id);
      toast({ title: 'Removed', description: `${product.label || product.product_name} removed` });
      await Promise.all([loadData(), loadAvailable()]);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Failed to remove' });
    } finally {
      setRemovingId(null);
    }
  };

  const filteredAvailable = availableProducts.filter(
    (ap) => ap.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingState variant="page" />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Products</h1>
        <p className="text-sm text-muted-foreground">
          {products.length} tracked · {availableProducts.length} available to add
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tracked Products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tracked Products</CardTitle>
            <CardDescription>Products visible in reports</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-1">
                {products.map((product) => {
                  const groupName = product.product_groups?.name || 
                    groups.find(g => g.id === product.group_id)?.name;
                  const isEditing = editingId === product.product_id;
                  const isRemoving = removingId === product.product_id;

                  return (
                    <div 
                      key={product.product_id} 
                      className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-secondary/50 group"
                    >
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="h-8 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(product);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                          />
                        ) : (
                          <>
                            <p className="text-sm font-medium truncate">
                              {product.label || product.product_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {product.product_name}
                            </p>
                          </>
                        )}
                      </div>
                      
                      {groupName && !isEditing && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {groupName}
                        </Badge>
                      )}

                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(product)} disabled={saving}>
                            <Check className="h-4 w-4 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit} disabled={saving}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(product)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-destructive hover:text-destructive" 
                            onClick={() => handleRemoveProduct(product)}
                            disabled={isRemoving}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {products.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No products tracked yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Available Products to Add */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Available Products</CardTitle>
            <CardDescription>Products from transactions not yet tracked</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <ScrollArea className="h-[350px] pr-3">
              <div className="space-y-1">
                {loadingAvailable ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 py-2 px-2">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-40 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-7 w-7 rounded" />
                    </div>
                  ))
                ) : filteredAvailable.length > 0 ? (
                  filteredAvailable.map((ap) => {
                    const isAdding = addingId === ap.product_id;
                    return (
                      <div 
                        key={ap.product_id} 
                        className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-secondary/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ap.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ap.transaction_count} txns · {formatCurrency(ap.total_amount)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {ap.lever}
                        </Badge>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-primary hover:text-primary"
                          onClick={() => handleAddProduct(ap)}
                          disabled={isAdding}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {searchTerm ? 'No products match your search' : 'All products are already tracked'}
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
