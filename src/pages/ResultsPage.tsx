import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ImageCard } from '@/components/ImageCard';
import { ImageDetailModal } from '@/components/ImageDetailModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBatches, useBatchImages, useUpdateImageStatus } from '@/hooks/useBatches';
import type { ImageRecord } from '@/hooks/useBatches';
import { Check, X } from 'lucide-react';

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batch');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(batchId);
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: batches } = useBatches();
  const { data: images, isLoading } = useBatchImages(
    selectedBatchId,
    statusFilter === 'all' ? undefined : statusFilter
  );
  const updateStatus = useUpdateImageStatus();

  const activeBatchId = selectedBatchId || batches?.[0]?.id;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Results</h1>
            <p className="text-muted-foreground mt-1">
              View and manage analyzed images
            </p>
          </div>
          <Select
            value={activeBatchId || ''}
            onValueChange={setSelectedBatchId}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select batch" />
            </SelectTrigger>
            <SelectContent>
              {batches?.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.name} ({batch.total_images})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <p>Loading...</p>
        ) : !images?.length ? (
          <p className="text-muted-foreground">No images found</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
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
          onAccept={() => {
            if (selectedImage) {
              updateStatus.mutate({ imageId: selectedImage.id, status: 'accepted' });
              setSelectedImage(null);
            }
          }}
          onReject={() => {
            if (selectedImage) {
              updateStatus.mutate({ imageId: selectedImage.id, status: 'rejected' });
              setSelectedImage(null);
            }
          }}
          onReview={() => {
            if (selectedImage) {
              updateStatus.mutate({ imageId: selectedImage.id, status: 'review' });
              setSelectedImage(null);
            }
          }}
        />
      </div>
    </Layout>
  );
}
