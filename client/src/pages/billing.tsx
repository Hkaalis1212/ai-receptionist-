import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Users, Check, ArrowRight } from "lucide-react";
import type { Subscription } from "@shared/schema";

export default function Billing() {
  const { toast } = useToast();
  const [additionalSeats, setAdditionalSeats] = useState(1);

  const { data: subscription, isLoading } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
    retry: false,
  });

  const upgradeMutation = useMutation({
    mutationFn: async (seats: number) => {
      const response = await apiRequest("POST", "/api/subscription/upgrade", { seats });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading billing information...</p>
      </div>
    );
  }

  const currentUsers = subscription?.currentTeamMembers || 0;
  const maxSeats = subscription?.maxTeamMembers || 3;
  const currentPlan = subscription?.plan || "free";
  const isFreePlan = currentPlan === "free";
  const paidSeats = Math.max(0, maxSeats - 3);

  const handleUpgrade = () => {
    if (additionalSeats < 1) {
      toast({
        title: "Invalid input",
        description: "Please enter at least 1 additional seat.",
        variant: "destructive",
      });
      return;
    }

    upgradeMutation.mutate(additionalSeats);
  };

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <CreditCard className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Billing & Subscription</h1>
            <p className="text-muted-foreground">Manage your subscription and team member seats</p>
          </div>
        </div>

        {/* Current plan */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your current subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{isFreePlan ? "Free Plan" : "Pro Plan"}</p>
                <p className="text-sm text-muted-foreground">
                  {isFreePlan ? "Up to 3 team members" : `${maxSeats} team members`}
                </p>
              </div>
              {!isFreePlan && (
                <Badge variant="default" className="text-lg px-4 py-2">
                  ${paidSeats * 10}/month
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Team Members</span>
                <span className="font-medium">{currentUsers} / {maxSeats}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(currentUsers / maxSeats) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Unlimited conversations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Appointment scheduling</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Analytics & reporting</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Email & SMS notifications</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade plan */}
        {(isFreePlan || currentUsers >= maxSeats) && (
          <Card>
            <CardHeader>
              <CardTitle>Add Team Members</CardTitle>
              <CardDescription>
                Expand your team with additional seats at $10/month per member
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Free Plan</CardTitle>
                      <CardDescription>Perfect for getting started</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-3xl font-bold">$0</p>
                        <p className="text-sm text-muted-foreground">Up to 3 team members</p>
                        <ul className="space-y-2 pt-4">
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4" />
                            All core features
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4" />
                            3 team member seats
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-primary">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Pro Plan
                        <Badge>Recommended</Badge>
                      </CardTitle>
                      <CardDescription>For growing teams</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-3xl font-bold">$10</p>
                        <p className="text-sm text-muted-foreground">per additional member/month</p>
                        <ul className="space-y-2 pt-4">
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4" />
                            All core features
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4" />
                            Unlimited team members
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4" />
                            Priority support
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <Label htmlFor="additional-seats">Additional Team Member Seats</Label>
                      <Input
                        id="additional-seats"
                        type="number"
                        min="1"
                        value={additionalSeats}
                        onChange={(e) => setAdditionalSeats(parseInt(e.target.value) || 1)}
                        className="mt-2"
                        data-testid="input-additional-seats"
                      />
                    </div>
                    <div className="w-48 flex flex-col items-end">
                      <span className="text-sm text-muted-foreground">Total per month</span>
                      <span className="text-3xl font-bold">${additionalSeats * 10}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">Your new plan</p>
                      <p className="text-sm text-muted-foreground">
                        {3 + additionalSeats} total team members
                      </p>
                    </div>
                    <Button
                      onClick={handleUpgrade}
                      disabled={upgradeMutation.isPending}
                      data-testid="button-upgrade"
                    >
                      {upgradeMutation.isPending ? "Processing..." : "Upgrade Now"}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing history placeholder */}
        {!isFreePlan && (
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View your past invoices and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your billing history will appear here once you have an active subscription.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
