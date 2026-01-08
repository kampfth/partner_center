import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SortOrderTab } from './settings/SortOrderTab';
import { DangerZoneTab } from './settings/DangerZoneTab';
import { ListOrdered, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure application preferences</p>
      </div>

      <Tabs defaultValue="sort" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="sort" className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4" />
            Sort Order
          </TabsTrigger>
          <TabsTrigger value="danger" className="flex items-center gap-2 text-destructive data-[state=active]:text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </TabsTrigger>
        </TabsList>
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
