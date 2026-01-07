import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GroupManagementTab } from './admin/GroupManagementTab';
import { UploadTab } from './admin/UploadTab';
import { Users, Upload } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground">Manage groups and upload data</p>
      </div>

      <Tabs defaultValue="groups" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Group Management
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
        </TabsList>
        <TabsContent value="groups" className="mt-6">
          <GroupManagementTab />
        </TabsContent>
        <TabsContent value="upload" className="mt-6">
          <UploadTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
