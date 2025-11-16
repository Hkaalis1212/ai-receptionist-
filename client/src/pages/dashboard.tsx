import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  Calendar, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  Users,
  AlertCircle,
  BarChart3
} from "lucide-react";
import { type Analytics } from "@shared/schema";

export default function Dashboard() {
  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ["/api/analytics"],
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border bg-background px-6 py-4">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your AI Receptionist activity
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: "Total Conversations",
      value: analytics?.totalConversations || 0,
      icon: MessageSquare,
      description: `${analytics?.activeConversations || 0} active`,
      color: "text-chart-1",
    },
    {
      title: "Total Appointments",
      value: analytics?.totalAppointments || 0,
      icon: Calendar,
      description: `${analytics?.confirmedAppointments || 0} confirmed`,
      color: "text-chart-2",
    },
    {
      title: "Completed",
      value: analytics?.completedConversations || 0,
      icon: CheckCircle2,
      description: "Conversations resolved",
      color: "text-chart-3",
    },
    {
      title: "Pending",
      value: analytics?.pendingAppointments || 0,
      icon: Clock,
      description: "Awaiting confirmation",
      color: "text-chart-4",
    },
  ];

  const sentimentData = [
    { label: "Positive", value: analytics?.sentimentBreakdown.positive || 0, color: "bg-chart-2" },
    { label: "Neutral", value: analytics?.sentimentBreakdown.neutral || 0, color: "bg-chart-1" },
    { label: "Negative", value: analytics?.sentimentBreakdown.negative || 0, color: "bg-destructive" },
  ];

  const intentData = [
    { label: "Booking", value: analytics?.intentBreakdown.booking || 0, icon: Calendar },
    { label: "Inquiry", value: analytics?.intentBreakdown.inquiry || 0, icon: Users },
    { label: "FAQ", value: analytics?.intentBreakdown.faq || 0, icon: AlertCircle },
    { label: "General", value: analytics?.intentBreakdown.general || 0, icon: MessageSquare },
  ];

  const totalSentiment = sentimentData.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-background px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your AI Receptionist activity
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, index) => (
              <Card key={index} data-testid={`metric-${metric.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.title}
                  </CardTitle>
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metric.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  Sentiment Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sentimentData.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground">
                          {item.value} ({totalSentiment > 0 ? Math.round((item.value / totalSentiment) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all duration-500`}
                          style={{ width: totalSentiment > 0 ? `${(item.value / totalSentiment) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  Intent Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {intentData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <span className="text-2xl font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {analytics && analytics.escalatedConversations > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Escalated Conversations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {analytics.escalatedConversations} conversation{analytics.escalatedConversations !== 1 ? 's' : ''} {analytics.escalatedConversations !== 1 ? 'require' : 'requires'} human attention.
                  These have been flagged for manual review.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
