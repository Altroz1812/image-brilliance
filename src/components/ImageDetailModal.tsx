import { Check, X, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatFileSize, getScoreColor, getStatusColor } from '@/lib/imageAnalysis';
import type { ImageRecord } from '@/hooks/useBatches';

interface ImageDetailModalProps {
  image: ImageRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  onReject?: () => void;
  onReview?: () => void;
}

export function ImageDetailModal({
  image,
  open,
  onOpenChange,
  onAccept,
  onReject,
  onReview,
}: ImageDetailModalProps) {
  if (!image) return null;

  const scores = [
    { label: 'Sharpness', value: image.blur_score, weight: '35%' },
    { label: 'Exposure', value: image.exposure_score, weight: '35%' },
    { label: 'Contrast', value: image.contrast_score, weight: '30%' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="truncate">{image.filename}</span>
            <Badge
              variant="outline"
              className={cn('capitalize', getStatusColor(image.status))}
            >
              {image.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image preview */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              {image.thumbnail_url ? (
                <img
                  src={image.thumbnail_url}
                  alt={image.filename}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No preview available
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600"
                onClick={onAccept}
                disabled={image.status === 'accepted'}
              >
                <Check className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={onReview}
                disabled={image.status === 'review'}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Review
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={onReject}
                disabled={image.status === 'rejected'}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Overall score */}
            <div className="text-center p-6 bg-accent/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
              <p
                className={cn(
                  'text-5xl font-bold',
                  image.overall_score !== null &&
                    getScoreColor(image.overall_score)
                )}
              >
                {image.overall_score?.toFixed(0) ?? '—'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">out of 100</p>
            </div>

            {/* Individual scores */}
            <div className="space-y-4">
              <h4 className="font-medium">Quality Breakdown</h4>
              {scores.map((score) => (
                <div key={score.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>
                      {score.label}{' '}
                      <span className="text-muted-foreground">
                        ({score.weight})
                      </span>
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        score.value !== null && getScoreColor(score.value)
                      )}
                    >
                      {score.value?.toFixed(1) ?? '—'}
                    </span>
                  </div>
                  <Progress value={score.value ?? 0} className="h-2" />
                </div>
              ))}
            </div>

            <Separator />

            {/* Issues */}
            {image.issues && image.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Detected Issues</h4>
                <div className="flex flex-wrap gap-2">
                  {image.issues.map((issue, idx) => (
                    <Badge key={idx} variant="destructive">
                      {issue}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-2">
              <h4 className="font-medium">Image Info</h4>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Dimensions</dt>
                <dd>
                  {image.width} × {image.height}
                </dd>
                <dt className="text-muted-foreground">File Size</dt>
                <dd>{image.file_size ? formatFileSize(image.file_size) : '—'}</dd>
                <dt className="text-muted-foreground">Has Face</dt>
                <dd>{image.has_face ? 'Yes' : 'No'}</dd>
                {image.duplicate_group_id && (
                  <>
                    <dt className="text-muted-foreground">Duplicate Group</dt>
                    <dd>
                      <Badge variant="outline">Has duplicates</Badge>
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
