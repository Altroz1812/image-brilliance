import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { BatchUploader } from '@/components/BatchUploader';
import { useImageAnalysis } from '@/hooks/useImageAnalysis';
import { useToast } from '@/hooks/use-toast';

export default function UploadPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    isProcessing,
    isPaused,
    progress,
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    cancelProcessing,
  } = useImageAnalysis();

  const handleStartProcessing = async (files: File[], batchName: string) => {
    const batchId = await startProcessing(files, batchName);
    if (batchId) {
      toast({
        title: 'Processing complete!',
        description: `Analyzed ${files.length} images.`,
      });
      navigate(`/results?batch=${batchId}`);
    }
    return batchId;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Upload Images</h1>
          <p className="text-muted-foreground mt-1">
            Drag and drop up to 2000 images for quality analysis
          </p>
        </div>

        <BatchUploader
          onStartProcessing={handleStartProcessing}
          isProcessing={isProcessing}
          isPaused={isPaused}
          progress={progress}
          onPause={pauseProcessing}
          onResume={resumeProcessing}
          onCancel={cancelProcessing}
        />
      </div>
    </Layout>
  );
}
