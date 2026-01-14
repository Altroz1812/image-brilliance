import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { ImageCard } from '@/components/ImageCard';
import { ImageDetailModal } from '@/components/ImageDetailModal';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBatches, useBatchImages, useUpdateImageStatus, useBulkUpdateImageStatus } from '@/hooks/useBatches';
import type { ImageRecord } from '@/hooks/useBatches';
import { Check, X } from 'lucide-react';

export default function ReviewPage() {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: batches } = useBatches();
  const activeBatchId = selectedBatchId || batches?.[0]?.id;
  const { data: images, isLoading } = useBatchImages(activeBatchId, 'review');
  const updateStatus = useUpdateImageStatus();
  const bulkUpdate = useBulkUpdateImageStatus();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAccept = () => {
    bulkUpdate.mutate({ imageIds: Array.from(selectedIds), status: 'accepted' });
    setSelectedIds(new Set());
  };

  const handleBulkReject = () => {
    bulkUpdate.mutate({ imageIds: Array.from(selectedIds), status: 'rejected' });
    setSelectedIds(new Set());
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Review Queue</h1>
            <p className="text-muted-foreground mt-1">
              Images needing manual review (score 50-75)
            </p>
          </div>
          <Select value={activeBatchId || ''} onValueChange={setSelectedBatchId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select batch" />
            </SelectTrigger>
            <SelectContent>
              {batches?.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.name} ({batch.review_images} to review)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-4 p-4 bg-accent rounded-lg">
            <span className="font-medium">{selectedIds.size} selected</span>
            <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={handleBulkAccept}>
              <Check className="h-4 w-4 mr-1" /> Accept All
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkReject}>
              <X className="h-4 w-4 mr-1" /> Reject All
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : !images?.length ? (
          <p className="text-muted-foreground text-center py-12">No images need review 🎉</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                selected={selectedIds.has(image.id)}
                onSelect={() => toggleSelect(image.id)}
                onView={() => setSelectedImage(image)}
                onAccept={() => updateStatus.mutate({ imageId: image.id, status: 'accepted' })}
                onReject={() => updateStatus.mutate({ imageId: image.id, status: 'rejected' })}
              />
            ))}
          </div>
        )}

        <ImageDetailModal
          image={selectedImage}
          open={!!selectedImage}
          onOpenChange={(open) => !open && setSelectedImage(null)}
          onAccept={() => { if (selectedImage) { updateStatus.mutate({ imageId: selectedImage.id, status: 'accepted' }); setSelectedImage(null); } }}
          onReject={() => { if (selectedImage) { updateStatus.mutate({ imageId: selectedImage.id, status: 'rejected' }); setSelectedImage(null); } }}
          onReview={() => { if (selectedImage) { updateStatus.mutate({ imageId: selectedImage.id, status: 'review' }); setSelectedImage(null); } }}
        />
      </div>
    </Layout>
  );
}
