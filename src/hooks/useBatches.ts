import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Batch {
  id: string;
  name: string;
  total_images: number;
  processed_images: number;
  accepted_images: number;
  rejected_images: number;
  review_images: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ImageRecord {
  id: string;
  batch_id: string;
  filename: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  thumbnail_url: string | null;
  blur_score: number | null;
  exposure_score: number | null;
  contrast_score: number | null;
  overall_score: number | null;
  has_face: boolean | null;
  duplicate_group_id: string | null;
  status: string;
  issues: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DuplicateGroupRecord {
  id: string;
  batch_id: string;
  image_count: number;
  best_image_id: string | null;
  similarity_threshold: number | null;
  created_at: string;
}

export function useBatches() {
  return useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Batch[];
    },
  });
}

export function useBatch(id: string | null) {
  return useQuery({
    queryKey: ['batch', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Batch;
    },
    enabled: !!id,
  });
}

export function useBatchImages(batchId: string | null, status?: string) {
  return useQuery({
    queryKey: ['batch-images', batchId, status],
    queryFn: async () => {
      if (!batchId) return [];

      let query = supabase
        .from('images')
        .select('*')
        .eq('batch_id', batchId)
        .order('overall_score', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ImageRecord[];
    },
    enabled: !!batchId,
  });
}

export function useDuplicateGroups(batchId: string | null) {
  return useQuery({
    queryKey: ['duplicate-groups', batchId],
    queryFn: async () => {
      if (!batchId) return [];

      const { data, error } = await supabase
        .from('duplicate_groups')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DuplicateGroupRecord[];
    },
    enabled: !!batchId,
  });
}

export function useDuplicateGroupImages(groupId: string | null) {
  return useQuery({
    queryKey: ['duplicate-group-images', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('duplicate_group_id', groupId)
        .order('overall_score', { ascending: false });

      if (error) throw error;
      return data as ImageRecord[];
    },
    enabled: !!groupId,
  });
}

export function useUpdateImageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      imageId,
      status,
    }: {
      imageId: string;
      status: 'accepted' | 'rejected' | 'review';
    }) => {
      const { error } = await supabase
        .from('images')
        .update({ status })
        .eq('id', imageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-images'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useBulkUpdateImageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      imageIds,
      status,
    }: {
      imageIds: string[];
      status: 'accepted' | 'rejected' | 'review';
    }) => {
      const { error } = await supabase
        .from('images')
        .update({ status })
        .in('id', imageIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-images'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useAnalyticsData() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const { data: batches } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      const { data: allImages } = await supabase
        .from('images')
        .select('overall_score, status, issues, blur_score, exposure_score, contrast_score')
        .limit(5000);

      return {
        batches: batches || [],
        images: allImages || [],
      };
    },
  });
}
