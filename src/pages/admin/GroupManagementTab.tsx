import { useState, useEffect } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { fetchProducts, fetchGroups, createGroup } from '@/api/partnerApi';
import { useToast } from '@/hooks/use-toast';
import type { Product, Group } from '@/types';

export function GroupManagementTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
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
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a group name',
      });
      return;
    }

    if (selectedProducts.size < 2) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Select at least 2 products to create a group',
      });
      return;
    }

    setCreating(true);
    try {
      await createGroup(groupName.trim(), Array.from(selectedProducts));
      toast({
        title: 'Success',
        description: `Group "${groupName}" created with ${selectedProducts.size} products`,
      });
      setGroupName('');
      setSelectedProducts(new Set());
      await loadData();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create group',
      });
    } finally {
      setCreating(false);
    }
  };

  const ungroupedProducts = products.filter((p) => p.group_id === null);

  if (loading) {
    return <LoadingState message="Loading products and groups..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Group</CardTitle>
          <CardDescription>
            Select at least 2 ungrouped products to create a group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
            />
          </div>

          <div className="space-y-2">
            <Label>Select Products ({selectedProducts.size} selected)</Label>
            <div className="max-h-[300px] overflow-auto rounded-md border p-4 space-y-2">
              {ungroupedProducts.length > 0 ? (
                ungroupedProducts.map((product) => (
                  <div
                    key={product.product_id}
                    className="flex items-center space-x-3 rounded-md p-2 hover:bg-accent/50"
                  >
                    <Checkbox
                      id={product.product_id}
                      checked={selectedProducts.has(product.product_id)}
                      onCheckedChange={() => toggleProduct(product.product_id)}
                    />
                    <label
                      htmlFor={product.product_id}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <span className="font-medium">
                        {product.label || product.product_name}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        ({product.lever})
                      </span>
                    </label>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-muted-foreground">
                  All products are already grouped
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={handleCreateGroup}
            disabled={creating || selectedProducts.size < 2 || !groupName.trim()}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Groups ({groups.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length > 0 ? (
            <div className="space-y-2">
              {groups.map((group) => {
                const groupProducts = products.filter((p) => p.group_id === group.id);
                return (
                  <div
                    key={group.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {groupProducts.length} products
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              No groups created yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
