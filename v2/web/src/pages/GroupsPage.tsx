import { useState } from 'react'
import { Plus, FolderTree } from 'lucide-react'
import { useGroups, useCreateGroup, useDeleteGroup } from '@/hooks/useGroups'
import { useTrackedProducts } from '@/hooks/useProducts'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { GroupCard } from '@/components/groups/GroupCard'
import { CreateGroupModal } from '@/components/groups/CreateGroupModal'

export default function GroupsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { data: groups, isLoading, error, refetch } = useGroups()
  const { data: products } = useTrackedProducts()
  const createGroup = useCreateGroup()
  const deleteGroup = useDeleteGroup()
  const { toast } = useToast()

  const handleCreateGroup = async (name: string, productIds: string[]) => {
    try {
      await createGroup.mutateAsync({ name, productIds })
      toast({
        type: 'success',
        title: 'Group created',
        description: `"${name}" has been created with ${productIds.length} products.`,
      })
    } catch (err) {
      toast({
        type: 'error',
        title: 'Failed to create group',
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    const group = groups?.find((g) => g.id === groupId)
    if (!group) return

    try {
      await deleteGroup.mutateAsync(groupId)
      toast({
        type: 'success',
        title: 'Group deleted',
        description: `"${group.name}" has been deleted. Products are now ungrouped.`,
      })
    } catch (err) {
      toast({
        type: 'error',
        title: 'Failed to delete group',
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Groups"
          description="Organize tracked products into groups"
        />
        <LoadingState variant="list" count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Groups"
          description="Organize tracked products into groups"
        />
        <ErrorState
          message={error instanceof Error ? error.message : 'Failed to load groups'}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  const hasUngroupedProducts = products?.some((p) => !p.group_id)

  return (
    <div>
      <PageHeader
        title="Groups"
        description={`${groups?.length || 0} groups created`}
        action={
          <Button onClick={() => setIsModalOpen(true)} disabled={!hasUngroupedProducts}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        }
      />

      {/* Groups List */}
      {!groups || groups.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="h-6 w-6 text-muted-foreground" />}
          title="No groups yet"
          message="Create groups to combine products for reporting. Each group requires at least 2 tracked products."
          action={
            hasUngroupedProducts
              ? { label: 'Create Group', onClick: () => setIsModalOpen(true) }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              products={products || []}
              onDelete={handleDeleteGroup}
              isDeleting={deleteGroup.isPending}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateGroup}
        products={products || []}
        isSubmitting={createGroup.isPending}
      />
    </div>
  )
}
