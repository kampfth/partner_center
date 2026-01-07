import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GroupManagementTab } from './admin/GroupManagementTab';
import { UploadTab } from './admin/UploadTab';
import { SortOrderTab } from './settings/SortOrderTab';
import { DangerZoneTab } from './settings/DangerZoneTab';
import { Users, Upload, ListOrdered, AlertTriangle } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground">Manage groups, upload data, and configure settings</p>
      </div>

      <Tabs defaultValue="groups" className="w-full">
        <TabsList className="grid w-full max-w-[600px] grid-cols-4">
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Groups</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="sort" className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4" />
            <span className="hidden sm:inline">Sort Order</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="flex items-center gap-2 text-destructive data-[state=active]:text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Danger</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="groups" className="mt-6">
          <GroupManagementTab />
        </TabsContent>
        <TabsContent value="upload" className="mt-6">
          <UploadTab />
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
