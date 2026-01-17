import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ImageRecord } from './useBatches';

export interface DuplicateGroup {
  id: string;
  batch_id: string;
  image_count: number;
  best_image_id: string | null;
  similarity_threshold: number | null;
  created_at: string;
  images: ImageRecord[];
}

export function useDuplicateGroups(batchId?: string) {
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ['duplicate-groups', batchId],
    queryFn: async () => {
      let query = supabase
        .from('duplicate_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (batchId) {
        query = query.eq('batch_id', batchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch images for each group
      const groupsWithImages: DuplicateGroup[] = await Promise.all(
        (data || []).map(async (group) => {
          const { data: images } = await supabase
            .from('images')
            .select('*')
            .eq('duplicate_group_id', group.id)
            .order('overall_score', { ascending: false });

          return {
            ...group,
            images: images || [],
          };
        })
      );

      return groupsWithImages;
    },
  });

  const keepBestMutation = useMutation({
    mutationFn: async ({ groupId, bestImageId }: { groupId: string; bestImageId: string }) => {
      // Get all images in the group
      const { data: images } = await supabase
        .from('images')
        .select('id')
        .eq('duplicate_group_id', groupId);

      if (!images) return;

      // Accept the best image, reject others
      await supabase
        .from('images')
        .update({ status: 'accepted' })
        .eq('id', bestImageId);

      const otherImageIds = images.filter(img => img.id !== bestImageId).map(img => img.id);
      if (otherImageIds.length > 0) {
        await supabase
          .from('images')
          .update({ status: 'rejected' })
          .in('id', otherImageIds);
      }

      // Update batch counts
      const group = groups.find(g => g.id === groupId);
      if (group) {
        const { data: batch } = await supabase
          .from('batches')
          .select('*')
          .eq('id', group.batch_id)
          .single();

        if (batch) {
          await supabase
            .from('batches')
            .update({
              accepted_images: batch.accepted_images + 1,
              rejected_images: batch.rejected_images + otherImageIds.length,
              review_images: Math.max(0, batch.review_images - images.length),
            })
            .eq('id', group.batch_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicate-groups'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });

  const selectBestMutation = useMutation({
    mutationFn: async ({ groupId, bestImageId }: { groupId: string; bestImageId: string }) => {
      await supabase
        .from('duplicate_groups')
        .update({ best_image_id: bestImageId })
        .eq('id', groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicate-groups'] });
    },
  });

  const rejectImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      await supabase
        .from('images')
        .update({ status: 'rejected' })
        .eq('id', imageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicate-groups'] });
    },
  });

  const dismissGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      // Remove duplicate_group_id from images
      await supabase
        .from('images')
        .update({ duplicate_group_id: null })
        .eq('duplicate_group_id', groupId);

      // Delete the group
      await supabase
        .from('duplicate_groups')
        .delete()
        .eq('id', groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicate-groups'] });
    },
  });

  return {
    groups,
    isLoading,
    refetch,
    keepBest: keepBestMutation.mutate,
    selectBest: selectBestMutation.mutate,
    rejectImage: rejectImageMutation.mutate,
    dismissGroup: dismissGroupMutation.mutate,
    isKeepingBest: keepBestMutation.isPending,
  };
}
