-- Create batches table
CREATE TABLE public.batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  total_images INTEGER NOT NULL DEFAULT 0,
  processed_images INTEGER NOT NULL DEFAULT 0,
  accepted_images INTEGER NOT NULL DEFAULT 0,
  rejected_images INTEGER NOT NULL DEFAULT 0,
  review_images INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create images table
CREATE TABLE public.images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  thumbnail_url TEXT,
  blur_score NUMERIC(5,2),
  exposure_score NUMERIC(5,2),
  contrast_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  has_face BOOLEAN DEFAULT false,
  duplicate_group_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'accepted', 'rejected', 'review')),
  issues TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create duplicate_groups table
CREATE TABLE public.duplicate_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  image_count INTEGER NOT NULL DEFAULT 0,
  best_image_id UUID,
  similarity_threshold NUMERIC(5,2) DEFAULT 0.90,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for duplicate_group_id after duplicate_groups exists
ALTER TABLE public.images 
ADD CONSTRAINT images_duplicate_group_fk 
FOREIGN KEY (duplicate_group_id) REFERENCES public.duplicate_groups(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_images_batch_id ON public.images(batch_id);
CREATE INDEX idx_images_status ON public.images(status);
CREATE INDEX idx_images_duplicate_group ON public.images(duplicate_group_id);
CREATE INDEX idx_images_overall_score ON public.images(overall_score);
CREATE INDEX idx_duplicate_groups_batch_id ON public.duplicate_groups(batch_id);

-- Enable Row Level Security (public access for now - no auth required)
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_groups ENABLE ROW LEVEL SECURITY;

-- Create public access policies (no auth required for this app)
CREATE POLICY "Public batches access" ON public.batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public images access" ON public.images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public duplicate_groups access" ON public.duplicate_groups FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_images_updated_at
  BEFORE UPDATE ON public.images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();