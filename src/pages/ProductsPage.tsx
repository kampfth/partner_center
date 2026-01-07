import { useState, useEffect } from 'react';
import { Check, X, Pencil, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { fetchProducts, fetchGroups, updateProduct } from '@/api/partnerApi';
import { useToast } from '@/hooks/use-toast';
import type { Product, Group } from '@/types';

// Mobile product card component
function ProductCard({
  product,
  groups,
  isEditing,
  editLabel,
  saving,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onLabelChange,
}: {
  product: Product;
  groups: Group[];
  isEditing: boolean;
  editLabel: string;
  saving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onLabelChange: (value: string) => void;
}) {
  const groupName = product.product_groups?.name || 
    groups.find(g => g.id === product.group_id)?.name;

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-muted-foreground mb-1">
            {product.product_id.slice(0, 12)}...
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {product.product_name}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {product.lever}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3">
        {isEditing ? (
          <Input
            value={editLabel}
            onChange={(e) => onLabelChange(e.target.value)}
            className="h-10 flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            autoFocus
          />
        ) : (
          <p className="text-sm font-medium flex-1 truncate">
            {product.label || product.product_name}
          </p>
        )}

        {isEditing ? (
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 touch-target"
              onClick={onSaveEdit}
              disabled={saving}
            >
              <Check className="h-5 w-5 text-primary" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 touch-target"
              onClick={onCancelEdit}
              disabled={saving}
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 touch-target"
            onClick={onStartEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        {product.group_id ? (
          <Badge variant="default">
            {groupName || 'Grouped'}
          </Badge>
        ) : (
          <Badge variant="outline">Ungrouped</Badge>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'grouped' | 'ungrouped'>('all');
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

  useEffect(() => {
    loadData();
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
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Label cannot be empty',
      });
      return;
    }

    setSaving(true);
    try {
      await updateProduct(product.product_id, editLabel.trim(), product.group_id);
      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === product.product_id
            ? { ...p, label: editLabel.trim() }
            : p
        )
      );
      toast({
        title: 'Saved',
        description: 'Product label updated',
      });
      cancelEdit();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update product',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (filter === 'grouped') return p.group_id !== null;
    if (filter === 'ungrouped') return p.group_id === null;
    return true;
  });

  const groupedCount = products.filter((p) => p.group_id !== null).length;
  const ungroupedCount = products.filter((p) => p.group_id === null).length;

  if (loading) {
    return <LoadingState variant="products" count={6} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage product labels and groupings
          </p>
        </div>

        {/* Stats & Filter */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="tabular-nums">{groupedCount} grouped</span>
            <span>·</span>
            <span className="tabular-nums">{ungroupedCount} ungrouped</span>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[130px] h-10">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({products.length})</SelectItem>
              <SelectItem value="grouped">Grouped ({groupedCount})</SelectItem>
              <SelectItem value="ungrouped">Ungrouped ({ungroupedCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Product List */}
      <div className="space-y-3">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.product_id}
            product={product}
            groups={groups}
            isEditing={editingId === product.product_id}
            editLabel={editLabel}
            saving={saving}
            onStartEdit={() => startEdit(product)}
            onCancelEdit={cancelEdit}
            onSaveEdit={() => saveEdit(product)}
            onLabelChange={setEditLabel}
          />
        ))}

        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-sm text-muted-foreground">
                No products found
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
