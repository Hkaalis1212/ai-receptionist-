import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Crown, Briefcase, Eye, Mail, Trash2, UserPlus, CreditCard } from "lucide-react";
import type { User, Invitation, Subscription } from "@shared/schema";

export default function Team() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "staff" | "viewer">("viewer");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
    enabled: currentUser?.role === "admin",
  });

  // Fetch invitations
  const { data: invitations } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations"],
    retry: false,
    enabled: currentUser?.role === "admin",
  });

  // Fetch subscription
  const { data: subscription } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
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

  const sendInviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const response = await apiRequest("POST", "/api/invitations", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      setInviteEmail("");
      setInviteRole("viewer");
      toast({
        title: "Invitation sent",
        description: "Team member invitation has been sent successfully.",
      });
    },
    onError: (error: any) => {
      if (error.upgrade) {
        setShowUpgradeDialog(true);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to send invitation. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/invitations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel invitation.",
        variant: "destructive",
      });
    },
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    sendInviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading team members...</p>
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

  const currentTeamSize = (users?.length || 0) + (invitations?.filter(i => i.status === "pending").length || 0);
  const maxTeamSize = subscription?.maxTeamMembers || 3;
  const isAtLimit = currentTeamSize >= maxTeamSize;

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">Team Management</h1>
              <p className="text-muted-foreground">Manage team members and permissions</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/billing")}
            data-testid="button-billing"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </Button>
        </div>

        {/* Subscription status */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>
              Current plan: {subscription?.plan === "free" ? "Free Plan" : "Pro Plan"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Team Members</span>
                <span className="text-sm text-muted-foreground">
                  {currentTeamSize} / {maxTeamSize}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(currentTeamSize / maxTeamSize) * 100}%` }}
                />
              </div>
              {isAtLimit && (
                <p className="text-sm text-destructive mt-2">
                  You've reached your team member limit. Upgrade to add more members.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invite new team member */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Team Member
            </CardTitle>
            <CardDescription>
              Send an invitation to add a new team member
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvite} className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="invite-email" className="sr-only">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={sendInviteMutation.isPending || isAtLimit}
                  data-testid="input-invite-email"
                />
              </div>
              <div className="w-32">
                <Select
                  value={inviteRole}
                  onValueChange={(value: any) => setInviteRole(value)}
                  disabled={sendInviteMutation.isPending || isAtLimit}
                >
                  <SelectTrigger data-testid="select-invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={sendInviteMutation.isPending || isAtLimit}
                data-testid="button-send-invite"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Invite
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Pending invitations */}
        {invitations && invitations.filter(i => i.status === "pending").length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                {invitations.filter(i => i.status === "pending").length} invitation(s) waiting to be accepted
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations
                  .filter(i => i.status === "pending")
                  .map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      data-testid={`invitation-card-${invitation.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Invited {new Date(invitation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getRoleBadgeVariant(invitation.role)}>
                          {invitation.role}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteInviteMutation.mutate(invitation.id)}
                          disabled={deleteInviteMutation.isPending}
                          data-testid={`button-cancel-invite-${invitation.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team members */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {users?.length} active team member{users?.length !== 1 ? "s" : ""}
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

        {/* Role permissions reference */}
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
              <div className="flex items-center gap-3">
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

        {/* Upgrade dialog */}
        <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Upgrade Required</AlertDialogTitle>
              <AlertDialogDescription>
                You've reached your team member limit of {maxTeamSize} members. Upgrade your plan to add more team members.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => setLocation("/billing")}>
                View Billing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
