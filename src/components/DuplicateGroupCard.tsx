import { useState } from 'react';
import { Check, X, Crown, Trash2, Eye, ChevronDown, ChevronUp, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getScoreColor } from '@/lib/imageAnalysis';
import { ImageComparisonSlider } from '@/components/ImageComparisonSlider';
import type { DuplicateGroup } from '@/hooks/useDuplicateGroups';
import type { ImageRecord } from '@/hooks/useBatches';

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  onKeepBest: (groupId: string, bestImageId: string) => void;
  onSelectBest: (groupId: string, imageId: string) => void;
  onRejectImage: (imageId: string) => void;
  onDismissGroup: (groupId: string) => void;
  onViewImage: (image: ImageRecord) => void;
  isProcessing?: boolean;
}

export function DuplicateGroupCard({
  group,
  onKeepBest,
  onSelectBest,
  onRejectImage,
  onDismissGroup,
  onViewImage,
  isProcessing = false,
}: DuplicateGroupCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedBestId, setSelectedBestId] = useState<string | null>(
    group.best_image_id
  );
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState<string | null>(null);
  const [compareRightId, setCompareRightId] = useState<string | null>(null);

  const activeImages = group.images.filter(img => img.status !== 'rejected');
  const bestImage = group.images.find(img => img.id === selectedBestId) || 
    group.images.reduce((best, current) => 
      (current.overall_score || 0) > (best.overall_score || 0) ? current : best
    , group.images[0]);

  const handleSelectBest = (imageId: string) => {
    setSelectedBestId(imageId);
    onSelectBest(group.id, imageId);
  };

  const handleKeepBest = () => {
    if (selectedBestId || bestImage) {
      onKeepBest(group.id, selectedBestId || bestImage.id);
    }
  };

  const handleOpenCompare = () => {
    // Default to first two active images
    if (activeImages.length >= 2) {
      setCompareLeftId(activeImages[0].id);
      setCompareRightId(activeImages[1].id);
      setCompareOpen(true);
    }
  };

  const compareLeftImage = activeImages.find(img => img.id === compareLeftId);
  const compareRightImage = activeImages.find(img => img.id === compareRightId);

  if (activeImages.length <= 1) {
    return null;
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">
                Duplicate Group
              </CardTitle>
              <Badge variant="secondary">
                {activeImages.length} images
              </Badge>
              {group.similarity_threshold && (
                <Badge variant="outline">
                  {group.similarity_threshold.toFixed(0)}% similar
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenCompare}
                    disabled={activeImages.length < 2}
                  >
                    <GitCompare className="h-4 w-4 mr-1" />
                    Compare
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open comparison slider</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDismissGroup(group.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Dismiss
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Not duplicates - dismiss group</TooltipContent>
              </Tooltip>
              <Button
                variant="default"
                size="sm"
                onClick={handleKeepBest}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Keep Best
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {group.images.map((image) => {
                const isSelected = image.id === (selectedBestId || bestImage?.id);
                const isRejected = image.status === 'rejected';

                return (
                  <div
                    key={image.id}
                    className={cn(
                      'relative rounded-lg overflow-hidden border-2 transition-all',
                      isSelected && 'border-green-500 ring-2 ring-green-500/30',
                      isRejected && 'opacity-50 border-red-500',
                      !isSelected && !isRejected && 'border-border hover:border-muted-foreground'
                    )}
                  >
                    {/* Best indicator */}
                    {isSelected && !isRejected && (
                      <div className="absolute top-2 left-2 z-10">
                        <Badge className="bg-green-600 text-white">
                          <Crown className="h-3 w-3 mr-1" />
                          Best
                        </Badge>
                      </div>
                    )}

                    {/* Rejected overlay */}
                    {isRejected && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center z-10">
                        <Badge variant="destructive">Rejected</Badge>
                      </div>
                    )}

                    {/* Image */}
                    <div className="aspect-square bg-muted">
                      {image.thumbnail_url ? (
                        <img
                          src={image.thumbnail_url}
                          alt={image.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                          No preview
                        </div>
                      )}
                    </div>

                    {/* Info & Actions */}
                    <div className="p-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium truncate flex-1" title={image.filename}>
                          {image.filename}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'ml-2 text-xs font-bold',
                            image.overall_score !== null && getScoreColor(image.overall_score)
                          )}
                        >
                          {image.overall_score?.toFixed(0) ?? '—'}
                        </Badge>
                      </div>

                      {/* Score details */}
                      <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                        <div title="Blur Score">
                          B: {image.blur_score?.toFixed(0) ?? '—'}
                        </div>
                        <div title="Exposure Score">
                          E: {image.exposure_score?.toFixed(0) ?? '—'}
                        </div>
                        <div title="Contrast Score">
                          C: {image.contrast_score?.toFixed(0) ?? '—'}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {!isRejected && (
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-7 text-xs"
                                onClick={() => onViewImage(image)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View details</TooltipContent>
                          </Tooltip>

                          {!isSelected && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 h-7 text-xs"
                                  onClick={() => handleSelectBest(image.id)}
                                >
                                  <Crown className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Select as best</TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-7 text-xs text-red-500 hover:text-red-600"
                                onClick={() => onRejectImage(image.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reject</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Comparison Dialog */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Compare Images</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Image selectors */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Left Image</label>
                <Select value={compareLeftId || ''} onValueChange={setCompareLeftId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select image" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeImages.map((img) => (
                      <SelectItem key={img.id} value={img.id}>
                        {img.filename} (Score: {img.overall_score?.toFixed(0) ?? '—'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Right Image</label>
                <Select value={compareRightId || ''} onValueChange={setCompareRightId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select image" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeImages.map((img) => (
                      <SelectItem key={img.id} value={img.id}>
                        {img.filename} (Score: {img.overall_score?.toFixed(0) ?? '—'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Comparison slider */}
            {compareLeftImage?.thumbnail_url && compareRightImage?.thumbnail_url ? (
              <ImageComparisonSlider
                leftImage={compareLeftImage.thumbnail_url}
                rightImage={compareRightImage.thumbnail_url}
                leftLabel={`${compareLeftImage.filename} (${compareLeftImage.overall_score?.toFixed(0)})`}
                rightLabel={`${compareRightImage.filename} (${compareRightImage.overall_score?.toFixed(0)})`}
                className="max-h-[60vh]"
              />
            ) : (
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                Select two images to compare
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              {compareLeftImage && (
                <Button
                  variant="outline"
                  onClick={() => {
                    handleSelectBest(compareLeftImage.id);
                    setCompareOpen(false);
                  }}
                >
                  <Crown className="h-4 w-4 mr-1" />
                  Keep Left
                </Button>
              )}
              {compareRightImage && (
                <Button
                  variant="outline"
                  onClick={() => {
                    handleSelectBest(compareRightImage.id);
                    setCompareOpen(false);
                  }}
                >
                  <Crown className="h-4 w-4 mr-1" />
                  Keep Right
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
