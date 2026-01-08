import { useState, useEffect } from 'react';
import { GripVertical, Save, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { fetchSortOrder, saveSortOrder, fetchProducts, fetchGroups } from '@/api/partnerApi';
import { useToast } from '@/hooks/use-toast';
import type { Product, Group } from '@/types';

export function SortOrderTab() {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sortOrderData, products, groups] = await Promise.all([
        fetchSortOrder(),
        fetchProducts(),
        fetchGroups(),
      ]);

      if (sortOrderData.value && sortOrderData.value.length > 0) {
        setItems(sortOrderData.value);
      } else {
        // Generate default order from products/groups
        const groupNames = groups.map((g) => g.name);
        const productLabels = products
          .filter((p) => !p.group_id)
          .map((p) => p.label || p.product_name);
        setItems([...groupNames, ...productLabels]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sort order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSortOrder(items);
      toast({
        title: 'Success',
        description: 'Sort order saved',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save sort order',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading sort order..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sort Order</CardTitle>
        <CardDescription>
          Drag items to reorder how they appear in reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border divide-y">
          {items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 cursor-move transition-colors ${
                draggedIndex === index ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
              <span className="flex-1 font-medium">{item}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Order'}
          </Button>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
