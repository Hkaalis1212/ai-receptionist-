import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { type SettingsWithWorkingHours } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";

const settingsFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessType: z.string().min(1, "Business type is required"),
  businessPhone: z.string().optional(),
  availableServices: z.array(z.string()).min(1, "At least one service is required"),
  workingHours: z.object({
    start: z.string(),
    end: z.string(),
  }),
  timezone: z.string(),
  welcomeMessage: z.string().optional(),
  escalationEmail: z.string().email("Invalid email").or(z.literal("")).optional(),
  elevenLabsVoiceId: z.string().optional(),
  mailchimpAudienceId: z.string().optional(),
  mailchimpEnableSync: z.enum(["true", "false"]).optional(),
});

type SettingsForm = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<SettingsWithWorkingHours>({
    queryKey: ["/api/settings"],
  });

  const { data: voices } = useQuery<Array<{ id: string; name: string; category: string }>>({
    queryKey: ["/api/elevenlabs/voices"],
  });

  const { data: audiences } = useQuery<Array<{ id: string; name: string; memberCount: number }>>({
    queryKey: ["/api/mailchimp/audiences"],
  });

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsFormSchema),
    values: settings ? {
      ...settings,
      businessPhone: settings.businessPhone || "",
      welcomeMessage: settings.welcomeMessage || "",
      escalationEmail: settings.escalationEmail || "",
      elevenLabsVoiceId: settings.elevenLabsVoiceId || "",
      mailchimpAudienceId: settings.mailchimpAudienceId || "",
      mailchimpEnableSync: settings.mailchimpEnableSync || "false",
    } : {
      businessName: "",
      businessType: "",
      businessPhone: "",
      availableServices: [],
      workingHours: { start: "09:00", end: "17:00" },
      timezone: "UTC",
      welcomeMessage: "",
      escalationEmail: "",
      elevenLabsVoiceId: "",
      mailchimpAudienceId: "",
      mailchimpEnableSync: "false",
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsForm) => {
      return await apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsForm) => {
    updateSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border bg-background px-6 py-4">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your AI Receptionist
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-background px-6 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your AI Receptionist
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>
                    Basic details about your business
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Acme Inc." 
                            {...field} 
                            data-testid="input-business-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Type</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Salon, Clinic, Restaurant, etc." 
                            {...field}
                            data-testid="input-business-type"
                          />
                        </FormControl>
                        <FormDescription>
                          This helps the AI provide more relevant responses
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="businessPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Phone</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel"
                            placeholder="+1 (555) 123-4567" 
                            {...field}
                            data-testid="input-business-phone"
                          />
                        </FormControl>
                        <FormDescription>
                          Contact number for your business
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="availableServices"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Services</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Haircut, Massage, Consultation (comma-separated)" 
                            value={field.value.join(", ")}
                            onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                            data-testid="input-services"
                          />
                        </FormControl>
                        <FormDescription>
                          Enter services separated by commas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Working Hours</CardTitle>
                  <CardDescription>
                    Set your business operating hours
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="workingHours.start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field}
                              data-testid="input-start-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workingHours.end"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field}
                              data-testid="input-end-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="America/New_York" 
                            {...field}
                            data-testid="input-timezone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Customization</CardTitle>
                  <CardDescription>
                    Personalize your AI Receptionist's behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="welcomeMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Welcome Message (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Leave blank to use the default welcome message"
                            className="resize-none"
                            rows={3}
                            {...field}
                            value={field.value || ""}
                            data-testid="input-welcome-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="escalationEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Escalation Email (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="support@example.com"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-escalation-email"
                          />
                        </FormControl>
                        <FormDescription>
                          Where to send notifications for escalated conversations
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="elevenLabsVoiceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voice for Phone Calls (Optional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-voice">
                              <SelectValue placeholder="Select a voice (default: Rachel)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {voices?.map((voice) => (
                              <SelectItem key={voice.id} value={voice.id}>
                                {voice.name} ({voice.category})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose an ElevenLabs voice for AI phone call responses
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Marketing</CardTitle>
                  <CardDescription>
                    Connect to Mailchimp to automatically add customers to your email list
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="mailchimpAudienceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mailchimp Audience (Optional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-audience">
                              <SelectValue placeholder="Select an audience" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {audiences?.map((audience) => (
                              <SelectItem key={audience.id} value={audience.id}>
                                {audience.name} ({audience.memberCount} members)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose which Mailchimp audience to sync customers to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mailchimpEnableSync"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auto-Sync Customers</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "false"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-sync">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Enabled</SelectItem>
                            <SelectItem value="false">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Automatically add customers to Mailchimp when they book appointments
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
