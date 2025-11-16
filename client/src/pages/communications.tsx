import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import type { SmsMessage, CallLog } from "@shared/schema";

export default function CommunicationsPage() {
  const { data, isLoading } = useQuery<{ smsMessages: SmsMessage[]; callLogs: CallLog[] }>({
    queryKey: ["/api/communications"],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Communications</h1>
          <p className="text-muted-foreground mb-6">Loading communication history...</p>
        </div>
      </div>
    );
  }

  const smsMessages = data?.smsMessages || [];
  const callLogs = data?.callLogs || [];

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Communications</h1>
          <p className="text-muted-foreground">
            View SMS messages and call logs
          </p>
        </div>

        <Tabs defaultValue="sms" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sms" data-testid="tab-sms">
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS Messages ({smsMessages.length})
            </TabsTrigger>
            <TabsTrigger value="calls" data-testid="tab-calls">
              <Phone className="w-4 h-4 mr-2" />
              Call Logs ({callLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sms" className="space-y-4">
            {smsMessages.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No SMS Messages Yet</h3>
                  <p className="text-muted-foreground">
                    SMS messages sent and received will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {smsMessages.map((sms) => (
                  <Card key={sms.id} data-testid={`sms-${sms.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          {sms.direction === "inbound" ? (
                            <ArrowDownLeft className="w-4 h-4 text-blue-500 shrink-0" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-green-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">
                              {sms.direction === "inbound" ? `From: ${sms.from}` : `To: ${sms.to}`}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {format(new Date(sms.createdAt), "PPp")}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge
                          variant={
                            sms.status === "delivered" || sms.status === "received"
                              ? "default"
                              : sms.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                          data-testid={`badge-${sms.status}`}
                        >
                          {sms.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm" data-testid={`text-body-${sms.id}`}>{sms.body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calls" className="space-y-4">
            {callLogs.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Phone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Call Logs Yet</h3>
                  <p className="text-muted-foreground">
                    Call logs will appear here when customers call your AI Receptionist.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {callLogs.map((call) => (
                  <Card key={call.id} data-testid={`call-${call.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          {call.direction === "inbound" ? (
                            <ArrowDownLeft className="w-4 h-4 text-blue-500 shrink-0" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-green-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">
                              {call.direction === "inbound" ? `From: ${call.from}` : `To: ${call.to}`}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {format(new Date(call.createdAt), "PPp")}
                              {call.duration && ` • ${call.duration}s`}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge
                          variant={
                            call.status === "completed"
                              ? "default"
                              : call.status === "failed" || call.status === "no-answer"
                              ? "destructive"
                              : "secondary"
                          }
                          data-testid={`badge-${call.status}`}
                        >
                          {call.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    {call.transcript && (
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Transcript:</p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-transcript-${call.id}`}>
                            {call.transcript}
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
