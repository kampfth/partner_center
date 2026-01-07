import { useState, useRef } from 'react';
import { Upload, FileUp, CheckCircle2, XCircle, File } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { uploadFile } from '@/api/partnerApi';
import { useToast } from '@/hooks/use-toast';
import type { UploadResponse } from '@/types';

export function UploadTab() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['.csv', '.zip'];
      const ext = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
      if (!validTypes.includes(ext)) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please upload a CSV or ZIP file',
        });
        return;
      }
      setFile(selectedFile);
      setResult(null);
      setProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);
    setProgress(0);
    
    try {
      const response = await uploadFile(file, (percent) => {
        setProgress(percent);
      });
      setResult(response);
      toast({
        title: 'Upload Complete',
        description: `Processed ${response.processed} records, inserted ${response.inserted}`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: err instanceof Error ? err.message : 'Failed to upload file',
      });
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Transactions</CardTitle>
          <CardDescription>
            Upload CSV or ZIP files containing transaction data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.zip"
            className="hidden"
          />

          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 font-medium">Click to upload</p>
              <p className="mt-1 text-sm text-muted-foreground">
                CSV or ZIP files (max 50MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearFile} disabled={uploading}>
                    Remove
                  </Button>
                  <Button size="sm" onClick={handleUpload} disabled={uploading}>
                    <FileUp className="mr-2 h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-medium tabular-nums">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  {progress === 100 && (
                    <p className="text-sm text-muted-foreground">Processing file on server...</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.errors && result.errors.length > 0 ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
              Upload Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-accent/50 p-4">
                <p className="text-sm text-muted-foreground">Processed</p>
                <p className="text-2xl font-bold">{result.processed}</p>
              </div>
              <div className="rounded-lg bg-accent/50 p-4">
                <p className="text-sm text-muted-foreground">Inserted</p>
                <p className="text-2xl font-bold">{result.inserted}</p>
              </div>
              {result.csv_files_processed !== undefined && (
                <div className="rounded-lg bg-accent/50 p-4">
                  <p className="text-sm text-muted-foreground">CSV Files</p>
                  <p className="text-2xl font-bold">{result.csv_files_processed}</p>
                </div>
              )}
              {result.latest_date && (
                <div className="rounded-lg bg-accent/50 p-4">
                  <p className="text-sm text-muted-foreground">Latest Date</p>
                  <p className="text-lg font-bold">{result.latest_date}</p>
                </div>
              )}
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <p className="font-medium text-destructive">Errors</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
