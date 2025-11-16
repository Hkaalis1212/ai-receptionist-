import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Analytics, type AuditLog } from "@shared/schema";
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  Phone, 
  DollarSign, 
  TrendingUp,
  Shield,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery<Analytics>({
    queryKey: ["/api/analytics"],
  });

  const { data: auditLogs, isLoading: logsLoading, error: logsError } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
  });

  if (analyticsError || logsError) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border bg-background px-6 py-4">
          <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System analytics and security monitoring
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="text-center max-w-md">
            <h2 className="text-lg font-semibold text-destructive mb-2">Failed to Load Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              There was an error loading the dashboard data. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (analyticsLoading || logsLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border bg-background px-6 py-4">
          <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System analytics and security monitoring
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32 mt-1" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Conversations",
      value: analytics?.totalConversations || 0,
      icon: MessageSquare,
      description: "All-time chat conversations",
      testId: "stat-conversations"
    },
    {
      title: "Total Appointments",
      value: analytics?.totalAppointments || 0,
      icon: Calendar,
      description: "Scheduled appointments",
      testId: "stat-appointments"
    },
    {
      title: "Phone Calls",
      value: analytics?.totalCalls || 0,
      icon: Phone,
      description: "Incoming voice calls",
      testId: "stat-calls"
    },
    {
      title: "Revenue",
      value: `$${((analytics?.totalRevenue || 0) / 100).toFixed(2)}`,
      icon: DollarSign,
      description: "Total payments received",
      testId: "stat-revenue"
    },
  ];

  const getActionBadgeVariant = (action: string): "default" | "destructive" | "outline" => {
    if (action.includes("DELETE")) return "destructive";
    if (action.includes("UPDATE")) return "default";
    return "outline";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-background px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System analytics and security monitoring
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid={stat.testId}>{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest conversations and appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">Active Conversations</p>
                      <p className="text-xs text-muted-foreground">
                        {analytics?.activeConversations || 0} ongoing
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">Pending Appointments</p>
                      <p className="text-xs text-muted-foreground">
                        {analytics?.pendingAppointments || 0} awaiting confirmation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">Unique Customers</p>
                      <p className="text-xs text-muted-foreground">
                        {analytics?.uniqueCustomers || 0} total
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Audit Log
                </CardTitle>
                <CardDescription>
                  Recent system activity and data access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[220px]">
                  <div className="space-y-3">
                    {!auditLogs || auditLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No audit logs yet</p>
                    ) : (
                      auditLogs.slice(0, 20).map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 text-sm pb-3 border-b border-border last:border-0 last:pb-0"
                          data-testid={`audit-log-${log.id}`}
                        >
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={getActionBadgeVariant(log.action)}
                                className="text-xs"
                              >
                                {log.action}
                              </Badge>
                              <span className="font-medium truncate">{log.resource}</span>
                            </div>
                            {log.details && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {log.details}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                              {" • "}
                              {log.ipAddress}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
