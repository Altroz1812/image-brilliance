import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalyticsData } from '@/hooks/useBatches';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
  const { data, isLoading } = useAnalyticsData();

  if (isLoading) return <Layout><p>Loading...</p></Layout>;

  const statusData = [
    { name: 'Accepted', value: data?.images.filter(i => i.status === 'accepted').length || 0 },
    { name: 'Review', value: data?.images.filter(i => i.status === 'review').length || 0 },
    { name: 'Rejected', value: data?.images.filter(i => i.status === 'rejected').length || 0 },
  ];

  const issueData = data?.images.reduce((acc, img) => {
    img.issues?.forEach(issue => {
      acc[issue] = (acc[issue] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>) || {};

  const issueChartData = Object.entries(issueData)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const scoreDistribution = [
    { range: '0-25', count: data?.images.filter(i => (i.overall_score || 0) <= 25).length || 0 },
    { range: '26-50', count: data?.images.filter(i => (i.overall_score || 0) > 25 && (i.overall_score || 0) <= 50).length || 0 },
    { range: '51-75', count: data?.images.filter(i => (i.overall_score || 0) > 50 && (i.overall_score || 0) <= 75).length || 0 },
    { range: '76-100', count: data?.images.filter(i => (i.overall_score || 0) > 75).length || 0 },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Analytics</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusData.map((_, index) => <Cell key={index} fill={COLORS[index]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Score Distribution</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Common Issues</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issueChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
