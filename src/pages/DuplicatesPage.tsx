import { Layout } from '@/components/Layout';

export default function DuplicatesPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Duplicates</h1>
        <p className="text-muted-foreground">Duplicate detection groups will appear here after processing batches.</p>
      </div>
    </Layout>
  );
}
