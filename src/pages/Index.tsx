import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { StatsCard } from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBatches } from '@/hooks/useBatches';
import {
  Images,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Upload,
  ArrowRight,
} from 'lucide-react';

const Index = () => {
  const { data: batches, isLoading } = useBatches();

  const stats = batches?.reduce(
    (acc, batch) => ({
      total: acc.total + batch.total_images,
      accepted: acc.accepted + batch.accepted_images,
      rejected: acc.rejected + batch.rejected_images,
      review: acc.review + batch.review_images,
    }),
    { total: 0, accepted: 0, rejected: 0, review: 0 }
  ) || { total: 0, accepted: 0, rejected: 0, review: 0 };

  const recentBatches = batches?.slice(0, 5) || [];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Photo quality review overview
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Batch
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Images"
            value={stats.total.toLocaleString()}
            icon={Images}
          />
          <StatsCard
            title="Accepted"
            value={stats.accepted.toLocaleString()}
            subtitle={stats.total > 0 ? `${((stats.accepted / stats.total) * 100).toFixed(1)}%` : '0%'}
            icon={CheckCircle}
            iconClassName="bg-green-500/10"
          />
          <StatsCard
            title="Rejected"
            value={stats.rejected.toLocaleString()}
            subtitle={stats.total > 0 ? `${((stats.rejected / stats.total) * 100).toFixed(1)}%` : '0%'}
            icon={XCircle}
            iconClassName="bg-red-500/10"
          />
          <StatsCard
            title="Needs Review"
            value={stats.review.toLocaleString()}
            icon={AlertCircle}
            iconClassName="bg-amber-500/10"
          />
        </div>

        {/* Recent Batches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Batches</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/results">
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : recentBatches.length === 0 ? (
              <div className="text-center py-8">
                <Images className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No batches yet</p>
                <Button asChild className="mt-4">
                  <Link to="/upload">Upload your first batch</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{batch.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {batch.total_images} images •{' '}
                        {new Date(batch.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        <Badge variant="default" className="bg-green-500/10 text-green-600">
                          {batch.accepted_images} ✓
                        </Badge>
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                          {batch.review_images} ⚠
                        </Badge>
                        <Badge variant="destructive" className="bg-red-500/10 text-red-600">
                          {batch.rejected_images} ✗
                        </Badge>
                      </div>
                      <Badge
                        variant={batch.status === 'completed' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {batch.status === 'processing' && (
                          <Clock className="mr-1 h-3 w-3 animate-spin" />
                        )}
                        {batch.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Index;
