import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBatches, useBatchImages } from '@/hooks/useBatches';
import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ExportPage() {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const { data: batches } = useBatches();
  const activeBatchId = selectedBatchId || batches?.[0]?.id;
  const { data: images } = useBatchImages(activeBatchId, 'accepted');
  const { toast } = useToast();

  const exportCSV = () => {
    if (!images) return;
    const headers = ['filename', 'status', 'overall_score', 'blur_score', 'exposure_score', 'contrast_score', 'issues'];
    const rows = images.map(img => [
      img.filename, img.status, img.overall_score, img.blur_score, img.exposure_score, img.contrast_score, img.issues?.join('; ')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    a.click();
    toast({ title: 'CSV exported!' });
  };

  const exportJSON = () => {
    if (!images) return;
    const blob = new Blob([JSON.stringify(images, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.json';
    a.click();
    toast({ title: 'JSON exported!' });
  };

  const copyFilenames = () => {
    if (!images) return;
    navigator.clipboard.writeText(images.map(i => i.filename).join('\n'));
    toast({ title: 'Filenames copied!' });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Export</h1>

        <Select value={activeBatchId || ''} onValueChange={setSelectedBatchId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select batch" />
          </SelectTrigger>
          <SelectContent>
            {batches?.map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:border-primary" onClick={exportCSV}>
            <CardContent className="p-6 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="font-medium">Export CSV</p>
              <p className="text-sm text-muted-foreground">{images?.length || 0} accepted images</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary" onClick={exportJSON}>
            <CardContent className="p-6 text-center">
              <FileJson className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <p className="font-medium">Export JSON</p>
              <p className="text-sm text-muted-foreground">Full metadata</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary" onClick={copyFilenames}>
            <CardContent className="p-6 text-center">
              <Copy className="h-12 w-12 mx-auto mb-4 text-purple-500" />
              <p className="font-medium">Copy Filenames</p>
              <p className="text-sm text-muted-foreground">To clipboard</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
