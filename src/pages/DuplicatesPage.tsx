import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { DuplicateGroupCard } from '@/components/DuplicateGroupCard';
import { ImageDetailModal } from '@/components/ImageDetailModal';
import { useDuplicateGroups } from '@/hooks/useDuplicateGroups';
import { useBatches } from '@/hooks/useBatches';
import type { ImageRecord } from '@/hooks/useBatches';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function DuplicatesPage() {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);
  
  const { data: batches = [] } = useBatches();
  const { 
    groups, 
    isLoading, 
    refetch,
    keepBest, 
    selectBest, 
    rejectImage, 
    dismissGroup,
    isKeepingBest,
  } = useDuplicateGroups(selectedBatchId === 'all' ? undefined : selectedBatchId);

  // Filter to only show groups with 2+ active images
  const activeGroups = groups.filter(
    group => group.images.filter(img => img.status !== 'rejected').length >= 2
  );

  const totalDuplicateImages = activeGroups.reduce(
    (sum, group) => sum + group.images.filter(img => img.status !== 'rejected').length, 
    0
  );

  const handleKeepAllBest = () => {
    activeGroups.forEach(group => {
      const bestImage = group.images.reduce((best, current) => 
        (current.overall_score || 0) > (best.overall_score || 0) ? current : best
      , group.images[0]);
      keepBest({ groupId: group.id, bestImageId: group.best_image_id || bestImage.id });
    });
    toast.success(`Processing ${activeGroups.length} duplicate groups`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Duplicate Manager</h1>
            <p className="text-muted-foreground mt-1">
              Review and manage duplicate images detected across your batches
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Duplicate Groups</p>
                  <p className="text-2xl font-bold">{activeGroups.length}</p>
                </div>
                <Copy className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Duplicate Images</p>
                  <p className="text-2xl font-bold">{totalDuplicateImages}</p>
                </div>
                <Badge variant="secondary" className="text-lg">
                  ~{totalDuplicateImages - activeGroups.length} to remove
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-center">
              <Button 
                onClick={handleKeepAllBest}
                disabled={activeGroups.length === 0 || isKeepingBest}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Keep Best for All Groups
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="aspect-square rounded-lg" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && activeGroups.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Copy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Duplicate Groups Found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {selectedBatchId === 'all' 
                  ? 'No duplicate images have been detected yet. Upload and process a batch of images to detect duplicates.'
                  : 'No duplicates found in the selected batch. Try selecting a different batch or "All Batches".'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Duplicate groups */}
        {!isLoading && activeGroups.length > 0 && (
          <div className="space-y-4">
            {activeGroups.map((group) => (
              <DuplicateGroupCard
                key={group.id}
                group={group}
                onKeepBest={(groupId, bestImageId) => 
                  keepBest({ groupId, bestImageId })
                }
                onSelectBest={(groupId, imageId) => 
                  selectBest({ groupId, bestImageId: imageId })
                }
                onRejectImage={rejectImage}
                onDismissGroup={dismissGroup}
                onViewImage={setSelectedImage}
                isProcessing={isKeepingBest}
              />
            ))}
          </div>
        )}

        {/* Image detail modal */}
        {selectedImage && (
          <ImageDetailModal
            image={selectedImage}
            open={!!selectedImage}
            onOpenChange={(open) => !open && setSelectedImage(null)}
            onAccept={() => {
              // Handle accept if needed
              setSelectedImage(null);
            }}
            onReject={() => {
              rejectImage(selectedImage.id);
              setSelectedImage(null);
            }}
          />
        )}
      </div>
    </Layout>
  );
}
