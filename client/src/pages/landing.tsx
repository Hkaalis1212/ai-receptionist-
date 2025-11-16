import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Calendar, MessageSquare, BarChart3, Users, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-title">
            AI Receptionist
          </h1>
          <p className="text-xl text-muted-foreground mb-8" data-testid="text-subtitle">
            Intelligent 24/7 customer service automation for your business
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Log In to Dashboard
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card className="hover-elevate">
            <CardHeader>
              <MessageSquare className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>AI-Powered Chat</CardTitle>
              <CardDescription>
                Natural conversations with customers using advanced AI technology
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <Calendar className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Smart Scheduling</CardTitle>
              <CardDescription>
                Automated appointment booking with email and SMS notifications
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <BarChart3 className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Real-Time Analytics</CardTitle>
              <CardDescription>
                Track conversations, appointments, and customer sentiment
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <Bot className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Multi-Channel Support</CardTitle>
              <CardDescription>
                Handle chat, SMS, and voice calls from a single platform
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <Users className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Team Collaboration</CardTitle>
              <CardDescription>
                Multi-user access with role-based permissions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <Shield className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Security & Compliance</CardTitle>
              <CardDescription>
                Audit logging, privacy controls, and data protection
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Transform your customer service with AI automation
          </p>
        </div>
      </div>
    </div>
  );
}
