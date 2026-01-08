import { useCallback, useState } from 'react'
import { Upload, FileUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  onFileSelect: (file: File) => void
  isUploading: boolean
  accept?: string
}

export function UploadZone({
  onFileSelect,
  isUploading,
  accept = '.csv,.zip',
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onFileSelect(file)
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [onFileSelect]
  )

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-dashed p-8 transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        isUploading && 'pointer-events-none opacity-60'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading}
      />
      <div className="flex flex-col items-center justify-center text-center">
        {isUploading ? (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="mt-4 text-sm font-medium text-foreground">
              Uploading...
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Please wait while we process your file
            </p>
          </>
        ) : (
          <>
            <div className="rounded-full bg-muted p-3">
              {isDragging ? (
                <FileUp className="h-6 w-6 text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">
              {isDragging ? 'Drop your file here' : 'Drag & drop CSV or ZIP'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              or click to select a file
            </p>
          </>
        )}
      </div>
    </div>
  )
}
