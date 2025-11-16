import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { type SettingsWithWorkingHours, type KnowledgeBase } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { Loader2, Save, Plus, Edit, Trash2 } from "lucide-react";
import { useState } from "react";

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

const knowledgeBaseSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  category: z.enum(["general", "hours", "services", "policies", "directions", "pricing", "contact"]),
  isActive: z.number().min(0).max(1),
});

type KnowledgeBaseForm = z.infer<typeof knowledgeBaseSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [kbDialogOpen, setKbDialogOpen] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null);

  const { data: settings, isLoading } = useQuery<SettingsWithWorkingHours>({
    queryKey: ["/api/settings"],
  });

  const { data: voices } = useQuery<Array<{ id: string; name: string; category: string }>>({
    queryKey: ["/api/elevenlabs/voices"],
  });

  const { data: audiences } = useQuery<Array<{ id: string; name: string; memberCount: number }>>({
    queryKey: ["/api/mailchimp/audiences"],
  });

  const { data: knowledgeBase } = useQuery<KnowledgeBase[]>({
    queryKey: ["/api/knowledge-base"],
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

  const kbForm = useForm<KnowledgeBaseForm>({
    resolver: zodResolver(knowledgeBaseSchema),
    defaultValues: {
      question: "",
      answer: "",
      category: "general",
      isActive: 1,
    },
  });

  const createKbMutation = useMutation({
    mutationFn: async (data: KnowledgeBaseForm) => {
      if (editingKb) {
        return await apiRequest("PUT", `/api/knowledge-base/${editingKb.id}`, data);
      }
      return await apiRequest("POST", "/api/knowledge-base", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      toast({
        title: editingKb ? "Entry updated" : "Entry created",
        description: `Knowledge base entry ${editingKb ? "updated" : "created"} successfully.`,
      });
      setKbDialogOpen(false);
      setEditingKb(null);
      kbForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save knowledge base entry.",
        variant: "destructive",
      });
    },
  });

  const deleteKbMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/knowledge-base/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      toast({
        title: "Entry deleted",
        description: "Knowledge base entry deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete knowledge base entry.",
        variant: "destructive",
      });
    },
  });

  const toggleKbActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: number }) => {
      return await apiRequest("PUT", `/api/knowledge-base/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update knowledge base entry.",
        variant: "destructive",
      });
    },
  });

  const handleEditKb = (kb: KnowledgeBase) => {
    setEditingKb(kb);
    kbForm.reset({
      question: kb.question,
      answer: kb.answer,
      category: kb.category,
      isActive: kb.isActive,
    });
    setKbDialogOpen(true);
  };

  const handleNewKb = () => {
    setEditingKb(null);
    kbForm.reset({
      question: "",
      answer: "",
      category: "general",
      isActive: 1,
    });
    setKbDialogOpen(true);
  };

  const onKbSubmit = (data: KnowledgeBaseForm) => {
    createKbMutation.mutate(data);
  };

  const kbByCategory = knowledgeBase?.reduce((acc, kb) => {
    if (!acc[kb.category]) acc[kb.category] = [];
    acc[kb.category].push(kb);
    return acc;
  }, {} as Record<string, KnowledgeBase[]>) || {};

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

          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Knowledge Base</CardTitle>
                  <CardDescription>
                    Add FAQs and business information for the AI to reference
                  </CardDescription>
                </div>
                <Dialog open={kbDialogOpen} onOpenChange={setKbDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleNewKb} data-testid="button-add-kb">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingKb ? "Edit" : "Add"} Knowledge Base Entry</DialogTitle>
                      <DialogDescription>
                        Add questions and answers for the AI to use when responding to customers
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...kbForm}>
                      <form onSubmit={kbForm.handleSubmit(onKbSubmit)} className="space-y-4">
                        <FormField
                          control={kbForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-kb-category">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="general">General</SelectItem>
                                  <SelectItem value="hours">Hours</SelectItem>
                                  <SelectItem value="services">Services</SelectItem>
                                  <SelectItem value="policies">Policies</SelectItem>
                                  <SelectItem value="directions">Directions</SelectItem>
                                  <SelectItem value="pricing">Pricing</SelectItem>
                                  <SelectItem value="contact">Contact</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={kbForm.control}
                          name="question"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Question</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="What are your hours?"
                                  {...field}
                                  data-testid="input-kb-question"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={kbForm.control}
                          name="answer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Answer</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="We're open Monday-Friday 9am-5pm"
                                  rows={4}
                                  {...field}
                                  data-testid="input-kb-answer"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={kbForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Active</FormLabel>
                                <FormDescription>
                                  Only active entries will be used by the AI
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value === 1}
                                  onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                                  data-testid="switch-kb-active"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createKbMutation.isPending} data-testid="button-save-kb">
                            {createKbMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                {editingKb ? "Update" : "Create"}
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {!knowledgeBase || knowledgeBase.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No knowledge base entries yet. Add your first FAQ to help the AI answer common questions.
                </p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(kbByCategory).map(([category, entries]) => (
                    <div key={category}>
                      <h3 className="text-sm font-medium capitalize mb-3">{category}</h3>
                      <div className="space-y-3">
                        {entries.map((kb) => (
                          <div
                            key={kb.id}
                            className="flex items-start gap-3 p-4 rounded-lg border border-border hover-elevate"
                            data-testid={`kb-entry-${kb.id}`}
                          >
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium">{kb.question}</p>
                              <p className="text-sm text-muted-foreground">{kb.answer}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={kb.isActive === 1}
                                onCheckedChange={(checked) =>
                                  toggleKbActiveMutation.mutate({
                                    id: kb.id,
                                    isActive: checked ? 1 : 0,
                                  })
                                }
                                data-testid={`switch-kb-active-${kb.id}`}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditKb(kb)}
                                data-testid={`button-edit-kb-${kb.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteKbMutation.mutate(kb.id)}
                                data-testid={`button-delete-kb-${kb.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
