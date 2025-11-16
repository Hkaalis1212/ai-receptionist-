import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { MessageSquare, LayoutDashboard, Calendar, Settings, Bot, Phone, Shield, LogOut, User, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProtectedRoute } from "@/components/protected-route";
import Chat from "@/pages/chat";
import Dashboard from "@/pages/dashboard";
import Appointments from "@/pages/appointments";
import SettingsPage from "@/pages/settings";
import Checkout from "@/pages/checkout";
import Communications from "@/pages/communications";
import AdminDashboard from "@/pages/admin";
import Team from "@/pages/team";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

const navigation = [
  {
    title: "Chat",
    url: "/",
    icon: MessageSquare,
    roles: ["admin", "staff", "viewer"],
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "staff", "viewer"],
  },
  {
    title: "Appointments",
    url: "/appointments",
    icon: Calendar,
    roles: ["admin", "staff"],
  },
  {
    title: "Communications",
    url: "/communications",
    icon: Phone,
    roles: ["admin", "staff"],
  },
  {
    title: "Team",
    url: "/team",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Admin",
    url: "/admin",
    icon: Shield,
    roles: ["admin"],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

function AppSidebar() {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();

  // Don't show navigation until user data is loaded
  if (isLoading || !user) {
    return (
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold">AI Receptionist</span>
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent />
        <SidebarFooter className="border-t border-sidebar-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </SidebarFooter>
      </Sidebar>
    );
  }

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user.role)
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold">AI Receptionist</span>
            <span className="text-xs text-muted-foreground">Always Available</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavigation.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show landing page for unauthenticated users
  if (!isLoading && !isAuthenticated) {
    return <Landing />;
  }

  // Show loading skeleton while auth is resolving
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Chat} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/appointments">
        <ProtectedRoute allowedRoles={["admin", "staff"]}>
          <Appointments />
        </ProtectedRoute>
      </Route>
      <Route path="/communications">
        <ProtectedRoute allowedRoles={["admin", "staff"]}>
          <Communications />
        </ProtectedRoute>
      </Route>
      <Route path="/checkout" component={Checkout} />
      <Route path="/team">
        <ProtectedRoute allowedRoles={["admin"]}>
          <Team />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute allowedRoles={["admin"]}>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function UserProfile() {
  const { user } = useAuth();

  if (!user) return null;

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((n) => n?.[0])
    .join("")
    .toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium" data-testid="text-user-name">{displayName}</span>
            <span className="text-xs text-muted-foreground" data-testid="text-user-email">{user.email}</span>
            <span className="text-xs text-muted-foreground capitalize" data-testid="text-user-role">
              Role: {user.role}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/api/logout" data-testid="link-logout">
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function App() {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ai-receptionist-theme">
        <TooltipProvider>
          <AuthenticatedLayout style={style} />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedLayout({ style }: { style: any }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-3 border-b border-border bg-background sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <UserProfile />
          </header>
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default App;
