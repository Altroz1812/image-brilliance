import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, Pause, Play, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/imageAnalysis';

interface BatchUploaderProps {
  onStartProcessing: (files: File[], batchName: string) => Promise<string | null>;
  isProcessing: boolean;
  isPaused: boolean;
  progress: {
    total: number;
    processed: number;
    accepted: number;
    rejected: number;
    review: number;
    percentage: number;
  };
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function BatchUploader({
  onStartProcessing,
  isProcessing,
  isPaused,
  progress,
  onPause,
  onResume,
  onCancel,
}: BatchUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [batchName, setBatchName] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter((file) =>
      file.type.startsWith('image/')
    );
    setFiles((prev) => [...prev, ...imageFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.bmp'],
    },
    disabled: isProcessing,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
    setBatchName('');
  };

  const handleStartProcessing = async () => {
    if (files.length === 0) return;

    const name = batchName.trim() || `Batch ${new Date().toLocaleDateString()}`;
    await onStartProcessing(files, name);
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <div className="space-y-6">
      {/* Upload area */}
      {!isProcessing && (
        <>
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">
              {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to select files (supports 500-2000 images)
            </p>
          </div>

          {files.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg">
                    {files.length} images selected
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total size: {formatFileSize(totalSize)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearFiles}>
                    Clear all
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="Batch name (optional)"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="max-w-sm"
                  />
                  <Button onClick={handleStartProcessing} size="lg">
                    <Loader2 className="mr-2 h-4 w-4 hidden" />
                    Start Analysis
                  </Button>
                </div>

                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <div className="divide-y">
                    {files.slice(0, 100).map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between px-4 py-2 hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                            <img
                              src={URL.createObjectURL(file)}
                              alt=""
                              className="w-full h-full object-cover"
                              onLoad={(e) =>
                                URL.revokeObjectURL(
                                  (e.target as HTMLImageElement).src
                                )
                              }
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {files.length > 100 && (
                      <div className="px-4 py-3 text-center text-sm text-muted-foreground bg-accent/30">
                        + {files.length - 100} more images
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Processing progress */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isPaused ? (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
                {isPaused ? 'Processing Paused' : 'Analyzing Images...'}
              </CardTitle>
              <div className="flex gap-2">
                {isPaused ? (
                  <Button variant="outline" size="sm" onClick={onResume}>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={onPause}>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {progress.processed} of {progress.total} images processed
                </span>
                <span className="font-medium">{progress.percentage}%</span>
              </div>
              <Progress value={progress.percentage} className="h-3" />
            </div>

            <div className="flex gap-4 pt-2">
              <Badge
                variant="default"
                className="bg-green-500/10 text-green-600 hover:bg-green-500/20"
              >
                ✓ Accepted: {progress.accepted}
              </Badge>
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
              >
                ⚠ Review: {progress.review}
              </Badge>
              <Badge
                variant="destructive"
                className="bg-red-500/10 text-red-600 hover:bg-red-500/20"
              >
                ✗ Rejected: {progress.rejected}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
