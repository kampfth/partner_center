import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Users } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function GroupManagementTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

    const productIdsArray = Array.from(selectedProducts);
    if (productIdsArray.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Select at least 2 products (currently ${productIdsArray.length} selected)`,
      });
      return;
    }

    setCreating(true);
    try {
      await createGroup(groupName.trim(), productIdsArray);
      toast({
        title: 'Success',
        description: `Group "${groupName}" created with ${productIdsArray.length} products`,
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
  
  // Filter products by search term
  const filteredProducts = ungroupedProducts.filter((p) => 
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.label && p.label.toLowerCase().includes(searchTerm.toLowerCase())) ||
    p.product_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingState message="Loading products and groups..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left column: Create Group */}
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Group
          </CardTitle>
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
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[250px] overflow-auto rounded-md border p-2 space-y-1">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const checkboxId = `grp-cb-${product.id}`;
                  const isChecked = selectedProducts.has(product.product_id);
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center space-x-3 rounded-md p-2 cursor-pointer transition-colors ${
                        isChecked ? 'bg-primary/10' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => toggleProduct(product.product_id)}
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={isChecked}
                        onCheckedChange={() => toggleProduct(product.product_id)}
                      />
                      <label
                        htmlFor={checkboxId}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        <span className="font-medium">
                          {product.label || product.product_name}
                        </span>
                        {product.lever && (
                          <span className="ml-2 text-muted-foreground text-xs">
                            ({product.lever})
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })
              ) : (
                <p className="py-4 text-center text-muted-foreground text-sm">
                  {searchTerm ? 'No products found' : 'All products are already grouped'}
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
            {creating ? 'Creating...' : `Create Group (${selectedProducts.size} products)`}
          </Button>
        </CardContent>
      </Card>

      {/* Right column: Existing Groups */}
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Existing Groups ({groups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {groups.map((group) => {
                const groupProducts = products.filter((p) => p.group_id === group.id);
                return (
                  <div
                    key={group.id}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {groupProducts.length} product{groupProducts.length !== 1 ? 's' : ''}
                      </p>
                      {groupProducts.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {groupProducts.map(p => p.label || p.product_name).join(', ')}
                        </p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-2 shrink-0">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Group</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{group.name}"? Products in this group will become ungrouped.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                // TODO: Add deleteGroup API call
                                toast({
                                  title: 'Info',
                                  description: 'Delete functionality coming soon',
                                });
                              } catch (err) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Error',
                                  description: 'Failed to delete group',
                                });
                              }
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                No groups created yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Select products on the left to create your first group
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
