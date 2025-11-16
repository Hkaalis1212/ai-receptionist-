import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Crown, Briefcase, Eye } from "lucide-react";
import type { User } from "@shared/schema";

export default function Team() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Only fetch users if user is an admin (ProtectedRoute already verified this)
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
    enabled: currentUser?.role === "admin",
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading team members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Team</CardTitle>
            <CardDescription>
              Failed to load team members. You may not have permission to view this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case "staff":
        return <Briefcase className="h-4 w-4 text-blue-600" />;
      case "viewer":
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "staff":
        return "secondary";
      case "viewer":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Team Management</h1>
            <p className="text-muted-foreground">Manage user roles and permissions</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {users?.length} team member{users?.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users?.map((user) => {
                const initials = [user.firstName, user.lastName]
                  .filter(Boolean)
                  .map((n) => n?.[0])
                  .join("")
                  .toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

                const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";
                const isCurrentUser = currentUser?.id === user.id;

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                    data-testid={`user-card-${user.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium" data-testid={`text-user-name-${user.id}`}>
                            {displayName}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isCurrentUser ? (
                        <div className="flex items-center gap-2 px-3 py-2">
                          {getRoleIcon(user.role)}
                          <Badge variant={getRoleBadgeVariant(user.role)} data-testid={`badge-user-role-${user.id}`}>
                            {user.role}
                          </Badge>
                        </div>
                      ) : (
                        <Select
                          value={user.role}
                          onValueChange={(newRole) =>
                            updateRoleMutation.mutate({ userId: user.id, role: newRole })
                          }
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-32" data-testid={`select-role-${user.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin" data-testid={`option-admin-${user.id}`}>
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4" />
                                Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="staff" data-testid={`option-staff-${user.id}`}>
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                Staff
                              </div>
                            </SelectItem>
                            <SelectItem value="viewer" data-testid={`option-viewer-${user.id}`}>
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                Viewer
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium">Admin</p>
                  <p className="text-sm text-muted-foreground">
                    Full access to all features including settings, team management, and audit logs
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Staff</p>
                  <p className="text-sm text-muted-foreground">
                    Can manage appointments, conversations, and communications but cannot access settings
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="font-medium">Viewer</p>
                  <p className="text-sm text-muted-foreground">
                    Read-only access to chat, dashboard, and analytics
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
