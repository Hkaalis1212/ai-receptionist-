import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CreditCard, Check, Star, ArrowRight, Zap } from "lucide-react";
import type { Subscription } from "@shared/schema";

const PRICING_PLANS = [
  {
    name: "Starter",
    price: 75,
    yearlyPrice: 75 * 12 * 0.83, // 17% discount
    recommended: false,
    features: [
      "24/7 call answering (Twilio)",
      "1 voice/brand",
      "Basic FAQ routing",
      "Simple Google Calendar booking",
      "Email/SMS notifications",
    ],
    recommendedFor: "Local offices, solo practitioners",
    maxTeamMembers: 3,
  },
  {
    name: "Professional",
    price: 249,
    yearlyPrice: 249 * 12 * 0.83, // 17% discount
    recommended: true,
    features: [
      "Everything in Starter, plus:",
      "Multiple custom voices",
      "Multilingual support (auto-detect, 2+ languages)",
      "CRM integration (Mailchimp, Google Sheets)",
      "Call logs & daily reports",
      "Custom greeting/branding",
    ],
    recommendedFor: "Busy clinics, agencies, small business chains",
    maxTeamMembers: 10,
  },
  {
    name: "Premium",
    price: 499,
    yearlyPrice: 499 * 12 * 0.83, // 17% discount
    recommended: false,
    features: [
      "Everything in Professional, plus:",
      "Unlimited integrations (Slack, Teams, industry CRMs)",
      "Advanced appointment logic",
      "Industry compliance option (medical/legal)",
      "White-label dashboard",
      "Dedicated onboarding + support",
    ],
    recommendedFor: "Law, healthcare, property, franchises",
    maxTeamMembers: 50,
  },
  {
    name: "Enterprise",
    price: 1749,
    yearlyPrice: 1749 * 12 * 0.83, // 17% discount
    recommended: false,
    features: [
      "Everything in Premium, plus:",
      "Unlimited calls/locations/users",
      "Full custom workflow builds (AI, API, scheduling)",
      "Dedicated support staff",
      "Revenue share or on-prem deployment",
      "Advanced analytics & reporting",
    ],
    recommendedFor: "Multi-location, vertical SaaS partners",
    maxTeamMembers: -1, // unlimited
  },
];

export default function Billing() {
  const { toast } = useToast();
  const [isYearly, setIsYearly] = useState(false);

  const { data: subscription, isLoading } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
    retry: false,
  });

  const upgradeMutation = useMutation({
    mutationFn: async (data: { plan: string; billingCycle: string }) => {
      const response = await apiRequest("POST", "/api/subscription/upgrade", data);
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

  const currentPlan = subscription?.plan || "free";
  const billingCycle = subscription?.billingCycle || "monthly";

  const handleUpgrade = (planName: string) => {
    const plan = planName.toLowerCase();
    const cycle = isYearly ? "yearly" : "monthly";
    upgradeMutation.mutate({ plan, billingCycle: cycle });
  };

  return (
    <div className="h-full overflow-auto p-8 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Professional AI Receptionist Plans</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight" data-testid="text-page-title">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Scale your customer service with AI-powered phone answering, appointment scheduling, and intelligent routing
          </p>
        </div>

        {/* Billing cycle toggle */}
        <div className="flex items-center justify-center gap-4">
          <Label htmlFor="billing-cycle" className={!isYearly ? "font-semibold" : ""}>
            Monthly
          </Label>
          <Switch
            id="billing-cycle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
            data-testid="switch-billing-cycle"
          />
          <Label htmlFor="billing-cycle" className={isYearly ? "font-semibold" : ""}>
            Yearly
          </Label>
          <Badge variant="default" className="ml-2">
            Save 17%
          </Badge>
        </div>

        {/* Current plan banner */}
        {currentPlan !== "free" && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-2xl font-bold capitalize">{currentPlan}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {billingCycle} billing
                  </p>
                </div>
                <Badge variant="default" className="text-lg px-4 py-2">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRICING_PLANS.map((plan) => {
            const monthlyPrice = plan.price;
            const yearlyMonthlyPrice = Math.round(plan.yearlyPrice / 12);
            const displayPrice = isYearly ? yearlyMonthlyPrice : monthlyPrice;
            const isCurrentPlan = currentPlan === plan.name.toLowerCase();

            return (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.recommended
                    ? "border-primary shadow-lg scale-105"
                    : "border-border"
                }`}
                data-testid={`card-plan-${plan.name.toLowerCase()}`}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <Badge className="px-4 py-1 text-sm gap-1">
                      <Star className="h-3 w-3" />
                      Recommended
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm min-h-[40px]">
                    {plan.recommendedFor}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${displayPrice}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>
                    {isYearly && (
                      <p className="text-sm text-muted-foreground">
                        ${Math.round(plan.yearlyPrice)} billed annually
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.recommended ? "default" : "outline"}
                    onClick={() => handleUpgrade(plan.name)}
                    disabled={upgradeMutation.isPending || isCurrentPlan}
                    data-testid={`button-upgrade-${plan.name.toLowerCase()}`}
                  >
                    {isCurrentPlan ? (
                      "Current Plan"
                    ) : upgradeMutation.isPending ? (
                      "Processing..."
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Features comparison note */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Need Help Choosing?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              All plans include our core AI receptionist features with 24/7 availability, intelligent call routing, and automated appointment scheduling. Higher tiers add more customization, integrations, and team collaboration features.
            </p>
            <div className="grid md:grid-cols-2 gap-4 pt-4">
              <div>
                <h4 className="font-semibold mb-2">Perfect for getting started</h4>
                <p className="text-sm text-muted-foreground">
                  Starter and Professional plans are ideal for solo practitioners and small businesses looking to automate their phone answering.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Enterprise-ready</h4>
                <p className="text-sm text-muted-foreground">
                  Premium and Enterprise plans offer advanced features, compliance options, and dedicated support for growing organizations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Money-back guarantee */}
        <div className="text-center text-sm text-muted-foreground">
          <p>All plans include a 30-day money-back guarantee. Cancel anytime.</p>
        </div>
      </div>
    </div>
  );
}
