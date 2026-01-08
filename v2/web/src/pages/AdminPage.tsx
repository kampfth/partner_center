import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GroupManagementTab } from './admin/GroupManagementTab';
import { UploadTab } from './admin/UploadTab';
import { BalanceManagerTab } from './admin/BalanceManagerTab';
import { ProductsTab } from './admin/ProductsTab';
import { SortOrderTab } from './settings/SortOrderTab';
import { DangerZoneTab } from './settings/DangerZoneTab';
import { Users, Upload, ListOrdered, AlertTriangle, Wallet, Package } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground">Manage groups, upload data, and configure settings</p>
      </div>

      <Tabs defaultValue="groups" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:max-w-[900px] sm:grid-cols-6">
            <TabsTrigger value="groups" className="flex items-center gap-2 px-3 sm:px-4">
              <Users className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Groups</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2 px-3 sm:px-4">
              <Package className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Products</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2 px-3 sm:px-4">
              <Upload className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="balance" className="flex items-center gap-2 px-3 sm:px-4">
              <Wallet className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Balance</span>
            </TabsTrigger>
            <TabsTrigger value="sort" className="flex items-center gap-2 px-3 sm:px-4">
              <ListOrdered className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Sort</span>
            </TabsTrigger>
            <TabsTrigger value="danger" className="flex items-center gap-2 px-3 sm:px-4 text-destructive data-[state=active]:text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Danger</span>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="groups" className="mt-6">
          <GroupManagementTab />
        </TabsContent>
        <TabsContent value="products" className="mt-6">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="upload" className="mt-6">
          <UploadTab />
        </TabsContent>
        <TabsContent value="balance" className="mt-6">
          <BalanceManagerTab />
        </TabsContent>
        <TabsContent value="sort" className="mt-6">
          <SortOrderTab />
        </TabsContent>
        <TabsContent value="danger" className="mt-6">
          <DangerZoneTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
