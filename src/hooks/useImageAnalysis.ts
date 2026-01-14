import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  analyzeImage,
  determineStatus,
  findDuplicates,
  ImageAnalysisResult,
} from '@/lib/imageAnalysis';

export interface ProcessingImage {
  id: string;
  file: File;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: ImageAnalysisResult;
  error?: string;
  thumbnailUrl?: string;
}

export interface BatchProgress {
  total: number;
  processed: number;
  accepted: number;
  rejected: number;
  review: number;
  percentage: number;
}

export function useImageAnalysis() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [images, setImages] = useState<ProcessingImage[]>([]);
  const [progress, setProgress] = useState<BatchProgress>({
    total: 0,
    processed: 0,
    accepted: 0,
    rejected: 0,
    review: 0,
    percentage: 0,
  });
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const abortRef = useRef(false);
  const pauseRef = useRef(false);

  const generateThumbnail = useCallback(
    async (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
          const maxSize = 150;
          let { width, height } = img;
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', 0.7));
          URL.revokeObjectURL(img.src);
        };

        img.onerror = () => {
          resolve('');
          URL.revokeObjectURL(img.src);
        };

        img.src = URL.createObjectURL(file);
      });
    },
    []
  );

  const startProcessing = useCallback(
    async (files: File[], batchName: string) => {
      if (files.length === 0) return null;

      setIsProcessing(true);
      setIsPaused(false);
      abortRef.current = false;
      pauseRef.current = false;

      // Create batch in database
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .insert({
          name: batchName,
          total_images: files.length,
          status: 'processing',
        })
        .select()
        .single();

      if (batchError || !batch) {
        console.error('Failed to create batch:', batchError);
        setIsProcessing(false);
        return null;
      }

      setCurrentBatchId(batch.id);

      // Initialize images
      const processingImages: ProcessingImage[] = files.map((file, index) => ({
        id: `temp-${index}`,
        file,
        filename: file.name,
        status: 'pending',
      }));

      setImages(processingImages);
      setProgress({
        total: files.length,
        processed: 0,
        accepted: 0,
        rejected: 0,
        review: 0,
        percentage: 0,
      });

      // Process images in chunks
      const chunkSize = 10;
      const results: { hash: string; id: string; filename: string; score: number }[] = [];
      let processed = 0;
      let accepted = 0;
      let rejected = 0;
      let review = 0;

      for (let i = 0; i < files.length; i += chunkSize) {
        if (abortRef.current) break;

        // Wait while paused
        while (pauseRef.current && !abortRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const chunk = files.slice(i, Math.min(i + chunkSize, files.length));

        const chunkResults = await Promise.all(
          chunk.map(async (file, chunkIndex) => {
            const globalIndex = i + chunkIndex;

            try {
              // Update status to processing
              setImages((prev) =>
                prev.map((img, idx) =>
                  idx === globalIndex ? { ...img, status: 'processing' } : img
                )
              );

              // Analyze image
              const result = await analyzeImage(file);
              const thumbnail = await generateThumbnail(file);
              const status = determineStatus(result.overallScore);

              // Insert to database
              const { data: dbImage } = await supabase
                .from('images')
                .insert({
                  batch_id: batch.id,
                  filename: file.name,
                  file_size: file.size,
                  width: result.width,
                  height: result.height,
                  thumbnail_url: thumbnail,
                  blur_score: result.blurScore,
                  exposure_score: result.exposureScore,
                  contrast_score: result.contrastScore,
                  overall_score: result.overallScore,
                  has_face: result.hasFace,
                  status,
                  issues: result.issues,
                })
                .select()
                .single();

              return {
                index: globalIndex,
                success: true,
                result,
                thumbnail,
                status,
                dbId: dbImage?.id,
              };
            } catch (error) {
              return {
                index: globalIndex,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          })
        );

        // Update state with results
        chunkResults.forEach((result) => {
          processed++;
          if (result.success && result.result) {
            if (result.status === 'accepted') accepted++;
            else if (result.status === 'rejected') rejected++;
            else review++;

            results.push({
              hash: result.result.hash,
              id: result.dbId || '',
              filename: files[result.index].name,
              score: result.result.overallScore,
            });

            setImages((prev) =>
              prev.map((img, idx) =>
                idx === result.index
                  ? {
                      ...img,
                      id: result.dbId || img.id,
                      status: 'completed',
                      result: result.result,
                      thumbnailUrl: result.thumbnail,
                    }
                  : img
              )
            );
          } else {
            setImages((prev) =>
              prev.map((img, idx) =>
                idx === result.index
                  ? { ...img, status: 'error', error: result.error }
                  : img
              )
            );
          }
        });

        setProgress({
          total: files.length,
          processed,
          accepted,
          rejected,
          review,
          percentage: Math.round((processed / files.length) * 100),
        });
      }

      // Find and save duplicates
      if (results.length > 0 && !abortRef.current) {
        const duplicateGroups = findDuplicates(results, 85);

        for (const group of duplicateGroups) {
          // Find best image in group
          const bestImage = group.images.reduce((best, current) =>
            current.score > best.score ? current : best
          );

          // Create duplicate group in database
          const { data: dbGroup } = await supabase
            .from('duplicate_groups')
            .insert({
              batch_id: batch.id,
              image_count: group.images.length,
              best_image_id: bestImage.id,
              similarity_threshold: group.similarity,
            })
            .select()
            .single();

          if (dbGroup) {
            // Update images with group ID
            await supabase
              .from('images')
              .update({ duplicate_group_id: dbGroup.id })
              .in(
                'id',
                group.images.map((img) => img.id)
              );
          }
        }
      }

      // Update batch status
      await supabase
        .from('batches')
        .update({
          processed_images: processed,
          accepted_images: accepted,
          rejected_images: rejected,
          review_images: review,
          status: abortRef.current ? 'cancelled' : 'completed',
        })
        .eq('id', batch.id);

      setIsProcessing(false);
      return batch.id;
    },
    [generateThumbnail]
  );

  const pauseProcessing = useCallback(() => {
    pauseRef.current = true;
    setIsPaused(true);
  }, []);

  const resumeProcessing = useCallback(() => {
    pauseRef.current = false;
    setIsPaused(false);
  }, []);

  const cancelProcessing = useCallback(() => {
    abortRef.current = true;
    pauseRef.current = false;
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
    setImages([]);
    setProgress({
      total: 0,
      processed: 0,
      accepted: 0,
      rejected: 0,
      review: 0,
      percentage: 0,
    });
    setCurrentBatchId(null);
    setIsProcessing(false);
    setIsPaused(false);
    abortRef.current = false;
    pauseRef.current = false;
  }, []);

  return {
    isProcessing,
    isPaused,
    images,
    progress,
    currentBatchId,
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    cancelProcessing,
    reset,
  };
}
