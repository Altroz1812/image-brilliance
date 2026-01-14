import { Check, X, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getScoreColor, getStatusColor } from '@/lib/imageAnalysis';
import type { ImageRecord } from '@/hooks/useBatches';

interface ImageCardProps {
  image: ImageRecord;
  onAccept?: () => void;
  onReject?: () => void;
  onReview?: () => void;
  onView?: () => void;
  selected?: boolean;
  onSelect?: () => void;
  showActions?: boolean;
}

export function ImageCard({
  image,
  onAccept,
  onReject,
  onReview,
  onView,
  selected = false,
  onSelect,
  showActions = true,
}: ImageCardProps) {
  const statusIcons = {
    accepted: <Check className="h-3 w-3" />,
    rejected: <X className="h-3 w-3" />,
    review: <AlertTriangle className="h-3 w-3" />,
    pending: null,
    processing: null,
  };

  const statusColors = {
    accepted: 'bg-green-500',
    rejected: 'bg-red-500',
    review: 'bg-amber-500',
    pending: 'bg-gray-400',
    processing: 'bg-blue-500',
  };

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all cursor-pointer group',
        selected && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      <div className="relative aspect-square bg-muted">
        {image.thumbnail_url ? (
          <img
            src={image.thumbnail_url}
            alt={image.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No preview
          </div>
        )}

        {/* Status badge */}
        <div
          className={cn(
            'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white',
            statusColors[image.status as keyof typeof statusColors]
          )}
        >
          {statusIcons[image.status as keyof typeof statusIcons]}
        </div>

        {/* Score badge */}
        <div className="absolute bottom-2 left-2">
          <Badge
            variant="secondary"
            className={cn(
              'font-bold',
              image.overall_score !== null && getScoreColor(image.overall_score)
            )}
          >
            {image.overall_score?.toFixed(0) ?? '—'}
          </Badge>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {onView && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View details</TooltipContent>
            </Tooltip>
          )}
          {showActions && (
            <>
              {onAccept && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-green-500 hover:bg-green-600 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAccept();
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Accept</TooltipContent>
                </Tooltip>
              )}
              {onReject && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-red-500 hover:bg-red-600 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReject();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reject</TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </div>
      </div>

      <CardContent className="p-3">
        <p className="text-sm font-medium truncate" title={image.filename}>
          {image.filename}
        </p>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {image.issues?.map((issue, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {issue}
            </Badge>
          ))}
          {(!image.issues || image.issues.length === 0) && (
            <span className="text-xs text-muted-foreground">No issues</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
