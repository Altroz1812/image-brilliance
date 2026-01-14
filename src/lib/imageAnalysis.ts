// Client-side image analysis utilities
// All processing happens in the browser - no API costs!

export interface ImageAnalysisResult {
  blurScore: number;
  exposureScore: number;
  contrastScore: number;
  overallScore: number;
  issues: string[];
  hasFace: boolean;
  width: number;
  height: number;
  hash: string;
}

export interface DuplicateGroup {
  images: { id: string; filename: string; hash: string; score: number }[];
  similarity: number;
}

// Calculate Laplacian variance for blur detection
export function calculateBlurScore(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const gray: number[] = [];

  // Convert to grayscale
  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  // Apply Laplacian kernel
  const laplacian: number[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap =
        gray[idx - width] +
        gray[idx - 1] +
        -4 * gray[idx] +
        gray[idx + 1] +
        gray[idx + width];
      laplacian.push(lap);
    }
  }

  // Calculate variance
  const mean = laplacian.reduce((a, b) => a + b, 0) / laplacian.length;
  const variance =
    laplacian.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    laplacian.length;

  // Normalize to 0-100 scale (higher variance = sharper image)
  // Typical range: 0-2000 for variance
  const normalized = Math.min(100, Math.max(0, (variance / 500) * 100));
  return Math.round(normalized * 100) / 100;
}

// Calculate exposure score from histogram analysis
export function calculateExposureScore(imageData: ImageData): number {
  const { data } = imageData;
  const histogram = new Array(256).fill(0);
  let totalLuminance = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const luminance = Math.round(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    );
    histogram[luminance]++;
    totalLuminance += luminance;
  }

  const avgLuminance = totalLuminance / pixelCount;

  // Check for over/underexposure
  const darkPixels = histogram.slice(0, 30).reduce((a, b) => a + b, 0);
  const brightPixels = histogram.slice(225).reduce((a, b) => a + b, 0);
  const darkRatio = darkPixels / pixelCount;
  const brightRatio = brightPixels / pixelCount;

  // Ideal average luminance is around 128 (middle gray)
  const luminanceScore = 100 - Math.abs(avgLuminance - 128) / 1.28;

  // Penalize for extreme dark or bright areas
  let exposurePenalty = 0;
  if (darkRatio > 0.3) exposurePenalty += (darkRatio - 0.3) * 100;
  if (brightRatio > 0.3) exposurePenalty += (brightRatio - 0.3) * 100;

  const score = Math.max(0, Math.min(100, luminanceScore - exposurePenalty));
  return Math.round(score * 100) / 100;
}

// Calculate contrast score
export function calculateContrastScore(imageData: ImageData): number {
  const { data } = imageData;
  const luminances: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    luminances.push(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    );
  }

  const mean = luminances.reduce((a, b) => a + b, 0) / luminances.length;
  const stdDev = Math.sqrt(
    luminances.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      luminances.length
  );

  // Normalize standard deviation to 0-100 (ideal std dev around 50-70)
  const normalized = Math.min(100, (stdDev / 64) * 100);
  return Math.round(normalized * 100) / 100;
}

// Generate perceptual hash for duplicate detection (dHash)
export function generatePerceptualHash(imageData: ImageData): string {
  const { data, width, height } = imageData;

  // Resize to 9x8 (we need 8x8 differences)
  const resizedWidth = 9;
  const resizedHeight = 8;
  const resized: number[] = [];

  for (let y = 0; y < resizedHeight; y++) {
    for (let x = 0; x < resizedWidth; x++) {
      const srcX = Math.floor((x / resizedWidth) * width);
      const srcY = Math.floor((y / resizedHeight) * height);
      const idx = (srcY * width + srcX) * 4;
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      resized.push(gray);
    }
  }

  // Generate hash by comparing adjacent pixels
  let hash = '';
  for (let y = 0; y < resizedHeight; y++) {
    for (let x = 0; x < resizedWidth - 1; x++) {
      const idx = y * resizedWidth + x;
      hash += resized[idx] < resized[idx + 1] ? '1' : '0';
    }
  }

  // Convert to hex
  let hexHash = '';
  for (let i = 0; i < hash.length; i += 4) {
    const chunk = hash.substring(i, i + 4);
    hexHash += parseInt(chunk, 2).toString(16);
  }

  return hexHash;
}

// Calculate Hamming distance between two hashes
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const bin1 = parseInt(hash1[i], 16).toString(2).padStart(4, '0');
    const bin2 = parseInt(hash2[i], 16).toString(2).padStart(4, '0');
    for (let j = 0; j < 4; j++) {
      if (bin1[j] !== bin2[j]) distance++;
    }
  }

  return distance;
}

// Calculate similarity percentage from Hamming distance
export function calculateSimilarity(hash1: string, hash2: string): number {
  const distance = hammingDistance(hash1, hash2);
  const maxBits = hash1.length * 4;
  return Math.round(((maxBits - distance) / maxBits) * 100 * 100) / 100;
}

// Find duplicate groups in a set of images
export function findDuplicates(
  images: { id: string; filename: string; hash: string; score: number }[],
  threshold: number = 90
): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < images.length; i++) {
    if (assigned.has(images[i].id)) continue;

    const group: DuplicateGroup = {
      images: [images[i]],
      similarity: 100,
    };

    for (let j = i + 1; j < images.length; j++) {
      if (assigned.has(images[j].id)) continue;

      const similarity = calculateSimilarity(images[i].hash, images[j].hash);
      if (similarity >= threshold) {
        group.images.push(images[j]);
        group.similarity = Math.min(group.similarity, similarity);
        assigned.add(images[j].id);
      }
    }

    if (group.images.length > 1) {
      assigned.add(images[i].id);
      groups.push(group);
    }
  }

  return groups;
}

// Analyze a single image
export async function analyzeImage(file: File): Promise<ImageAnalysisResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Resize for analysis (max 800px for performance)
      const maxSize = 800;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      const imageData = ctx?.getImageData(0, 0, width, height);
      if (!imageData) {
        reject(new Error('Failed to get image data'));
        return;
      }

      const blurScore = calculateBlurScore(imageData);
      const exposureScore = calculateExposureScore(imageData);
      const contrastScore = calculateContrastScore(imageData);
      const hash = generatePerceptualHash(imageData);

      // Identify issues
      const issues: string[] = [];
      if (blurScore < 30) issues.push('Blurry');
      else if (blurScore < 50) issues.push('Slightly blurry');
      if (exposureScore < 40) issues.push('Poor exposure');
      if (exposureScore > 90) issues.push('Overexposed');
      if (contrastScore < 30) issues.push('Low contrast');

      // Calculate overall score (weighted)
      const overallScore = Math.round(
        blurScore * 0.35 + exposureScore * 0.35 + contrastScore * 0.30
      );

      resolve({
        blurScore,
        exposureScore,
        contrastScore,
        overallScore,
        issues,
        hasFace: false, // Basic version - no face detection
        width: img.naturalWidth,
        height: img.naturalHeight,
        hash,
      });

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(img.src);
    };

    img.src = URL.createObjectURL(file);
  });
}

// Determine image status based on score
export function determineStatus(score: number): 'accepted' | 'rejected' | 'review' {
  if (score >= 75) return 'accepted';
  if (score < 50) return 'rejected';
  return 'review';
}

// Get status color class
export function getStatusColor(status: string): string {
  switch (status) {
    case 'accepted':
      return 'text-green-500';
    case 'rejected':
      return 'text-red-500';
    case 'review':
      return 'text-amber-500';
    case 'processing':
      return 'text-blue-500';
    default:
      return 'text-muted-foreground';
  }
}

// Get score color class
export function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}

// Get score badge variant
export function getScoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 75) return 'default';
  if (score >= 50) return 'secondary';
  return 'destructive';
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
