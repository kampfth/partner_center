import { useState } from 'react'
import { History, Upload as UploadIcon } from 'lucide-react'
import { useImportHistory, useUploadCsv } from '@/hooks/useImports'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { UploadZone } from '@/components/imports/UploadZone'
import { ImportResult } from '@/components/imports/ImportResult'
import { ImportHistory } from '@/components/imports/ImportHistory'
import type { ImportResult as ImportResultType } from '@/types'

export default function ImportsPage() {
  const [lastResult, setLastResult] = useState<ImportResultType | null>(null)
  const { data: history, isLoading, error, refetch } = useImportHistory(10)
  const uploadCsv = useUploadCsv()
  const { toast } = useToast()

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = ['.csv', '.zip']
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    if (!validTypes.includes(fileExtension)) {
      toast({
        type: 'error',
        title: 'Invalid file type',
        description: 'Please upload a CSV or ZIP file.',
      })
      return
    }

    try {
      const result = await uploadCsv.mutateAsync(file)
      setLastResult(result.data)
      toast({
        type: 'success',
        title: 'Upload complete',
        description: `Processed ${result.data.rows_read} rows, inserted ${result.data.transactions_inserted} transactions.`,
      })
    } catch (err) {
      toast({
        type: 'error',
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import CSV"
        description="Upload Partner Center CSV exports to import transactions"
      />

      {/* Upload Zone */}
      <UploadZone
        onFileSelect={handleFileSelect}
        isUploading={uploadCsv.isPending}
      />

      {/* Last Import Result */}
      {lastResult && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Last Import
          </h2>
          <ImportResult result={lastResult} />
        </div>
      )}

      {/* Import History */}
      <div>
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
          <History className="h-4 w-4" />
          Import History
        </h2>

        {isLoading ? (
          <LoadingState variant="list" count={3} />
        ) : error ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to load history'}
            onRetry={() => refetch()}
          />
        ) : !history || history.length === 0 ? (
          <EmptyState
            icon={<UploadIcon className="h-6 w-6 text-muted-foreground" />}
            title="No imports yet"
            message="Upload your first CSV file to see import history here."
          />
        ) : (
          <ImportHistory imports={history} />
        )}
      </div>
    </div>
  )
}
