import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ("admin" | "staff" | "viewer")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // Don't redirect more than once
    if (hasRedirected.current) return;

    // Redirect unauthenticated users to login
    if (!user) {
      hasRedirected.current = true;
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    // Redirect unauthorized roles to home
    if (!allowedRoles.includes(user.role)) {
      hasRedirected.current = true;
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [user, isLoading, allowedRoles, toast, setLocation]);

  // Show loading while auth is loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Don't render children if unauthorized (redirect is in progress)
  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  // Only render children if user has required role
  return <>{children}</>;
}
