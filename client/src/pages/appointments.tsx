import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Phone, Mail, FileText, CreditCard } from "lucide-react";
import { type Appointment } from "@shared/schema";

export default function Appointments() {
  const [, setLocation] = useLocation();
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const getStatusVariant = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "completed":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmed":
        return "text-chart-2";
      case "pending":
        return "text-chart-4";
      case "cancelled":
        return "text-destructive";
      case "completed":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const getPaymentStatusVariant = (paymentStatus: Appointment["paymentStatus"]) => {
    switch (paymentStatus) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      case "refunded":
        return "outline";
      default:
        return "secondary";
    }
  };

  const handlePayNow = (appointmentId: string) => {
    setLocation(`/checkout?appointmentId=${appointmentId}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border bg-background px-6 py-4">
          <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and view all customer appointments
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-7xl mx-auto space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const sortedAppointments = [...(appointments || [])].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-background px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage and view all customer appointments
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-7xl mx-auto">
          {sortedAppointments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Appointments Yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  When customers book appointments through the AI Receptionist, they'll appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedAppointments.map((appointment) => (
                <Card key={appointment.id} data-testid={`appointment-${appointment.id}`} className="hover-elevate">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <CardTitle className="text-lg">
                        {appointment.service}
                      </CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={getStatusVariant(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        {appointment.paymentStatus && (
                          <Badge variant={getPaymentStatusVariant(appointment.paymentStatus)}>
                            Payment: {appointment.paymentStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{appointment.customerName}</span>
                        </div>
                        {appointment.customerEmail && (
                          <div className="flex items-center gap-3 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{appointment.customerEmail}</span>
                          </div>
                        )}
                        {appointment.customerPhone && (
                          <div className="flex items-center gap-3 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{appointment.customerPhone}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {new Date(appointment.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{appointment.time}</span>
                        </div>
                        {appointment.notes && (
                          <div className="flex items-start gap-3 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <span className="text-muted-foreground flex-1">{appointment.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {(appointment.amountCents || appointment.paymentStatus === "pending") && (
                      <div className="flex items-center justify-between gap-4 pt-4 border-t border-border flex-wrap">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {appointment.amountCents 
                              ? `Amount: $${(appointment.amountCents / 100).toFixed(2)}`
                              : "Amount: Pending"}
                          </span>
                        </div>
                        {appointment.paymentStatus === "pending" && (
                          <Button 
                            size="sm"
                            onClick={() => handlePayNow(appointment.id)}
                            data-testid={`button-pay-${appointment.id}`}
                          >
                            Pay Now
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
