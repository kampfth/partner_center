import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { TrackedProduct } from '@/types'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string, productIds: string[]) => void
  products: TrackedProduct[]
  isSubmitting: boolean
}

export function CreateGroupModal({
  isOpen,
  onClose,
  onSubmit,
  products,
  isSubmitting,
}: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Only show products without a group
  const availableProducts = products.filter((p) => !p.group_id)

  const handleToggle = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(productId)
    } else {
      newSelected.delete(productId)
    }
    setSelectedIds(newSelected)
  }

  const handleSubmit = () => {
    if (name.trim() && selectedIds.size >= 2) {
      onSubmit(name.trim(), Array.from(selectedIds))
      handleClose()
    }
  }

  const handleClose = () => {
    setName('')
    setSelectedIds(new Set())
    onClose()
  }

  const isValid = name.trim().length > 0 && selectedIds.size >= 2

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>
            Group products together for combined reporting. Select at least 2
            products.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="e.g., Flight Sim Bundle"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Products ({selectedIds.size} selected)
            </Label>
            {availableProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No ungrouped products available. All tracked products are
                already in groups.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto rounded-lg border p-2">
                {availableProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.has(product.product_id)}
                      onCheckedChange={(checked) =>
                        handleToggle(product.product_id, checked as boolean)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {product.label || product.product_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {product.lever}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
