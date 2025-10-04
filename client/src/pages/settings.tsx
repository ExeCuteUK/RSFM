import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSettingsSchema, insertUserSchema, type Settings, type InsertSettings, type User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserPlus, Pencil, Trash2, Shield, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("financials");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Omit<User, 'password'> | null>(null);
  const [userToEdit, setUserToEdit] = useState<Omit<User, 'password'> | null>(null);
  
  // Email signature state
  const [useSignature, setUseSignature] = useState(currentUser?.useSignature || false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // Update signature state when user changes
  useEffect(() => {
    if (currentUser) {
      setUseSignature(currentUser.useSignature || false);
    }
  }, [currentUser]);
  
  // Fetch Gmail connection status
  const { data: gmailStatus, isLoading: gmailLoading } = useQuery<{ connected: boolean; email: string | null }>({
    queryKey: ["/api/gmail/status"],
  });
  
  // Save signature enabled/disabled mutation
  const saveSignatureMutation = useMutation({
    mutationFn: async (data: { useSignature: boolean }) => {
      return apiRequest("PATCH", `/api/users/${currentUser?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Signature settings saved",
        description: "Your signature preferences have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload template mutation
  const uploadTemplateMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('template', file);
      const response = await fetch('/api/signature/upload-template', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      setTemplateFile(null);
      toast({
        title: "Template uploaded",
        description: "Your signature template has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload the template file.",
        variant: "destructive",
      });
    },
  });

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await fetch('/api/signature/upload-logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      setLogoFile(null);
      toast({
        title: "Logo uploaded",
        description: "Your signature logo has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload the logo file.",
        variant: "destructive",
      });
    },
  });

  // Fetch settings
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<InsertSettings>({
    resolver: zodResolver(insertSettingsSchema),
    defaultValues: {
      importClearanceFee: null,
      inventoryLinkedFee: null,
      commodityCodesIncludedFree: null,
      additionalCommodityCodeCharge: null,
      defermentChargeMinimum: null,
      defermentChargePercentage: null,
      handoverFee: null,
    },
  });

  // Update form values when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        importClearanceFee: settings.importClearanceFee,
        inventoryLinkedFee: settings.inventoryLinkedFee,
        commodityCodesIncludedFree: settings.commodityCodesIncludedFree,
        additionalCommodityCodeCharge: settings.additionalCommodityCodeCharge,
        defermentChargeMinimum: settings.defermentChargeMinimum,
        defermentChargePercentage: settings.defermentChargePercentage,
        handoverFee: settings.handoverFee,
      });
    }
  }, [settings, form]);

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<InsertSettings>) => {
      if (!settings?.id) {
        // Create new settings if none exist
        return apiRequest("POST", "/api/settings", data);
      }
      return apiRequest("PATCH", `/api/settings/${settings.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertSettings) => {
    // Convert numeric values to strings for PostgreSQL numeric type
    const processedData = {
      importClearanceFee: data.importClearanceFee !== null ? String(data.importClearanceFee) : null,
      inventoryLinkedFee: data.inventoryLinkedFee !== null ? String(data.inventoryLinkedFee) : null,
      commodityCodesIncludedFree: data.commodityCodesIncludedFree,
      additionalCommodityCodeCharge: data.additionalCommodityCodeCharge !== null ? String(data.additionalCommodityCodeCharge) : null,
      defermentChargeMinimum: data.defermentChargeMinimum !== null ? String(data.defermentChargeMinimum) : null,
      defermentChargePercentage: data.defermentChargePercentage !== null ? String(data.defermentChargePercentage) : null,
      handoverFee: data.handoverFee !== null ? String(data.handoverFee) : null,
    };
    updateSettings.mutate(processedData);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Settings</h1>
        <p className="text-muted-foreground">
          Manage system settings and configurations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="financials" data-testid="tab-financials">Financials & Charges</TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email">Email</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="financials" className="mt-6">
          <Card className="bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
              <CardDescription>
                Configure default fees and charges for shipments and clearances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="importClearanceFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Import Clearance Fee</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                data-testid="input-import-clearance-fee"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="inventoryLinkedFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inventory Linked Fee</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                data-testid="input-inventory-linked-fee"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="commodityCodesIncludedFree"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commodity Codes Included Free</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                              data-testid="input-commodity-codes-included-free"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="additionalCommodityCodeCharge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Commodity Code Charge</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                data-testid="input-additional-commodity-code-charge"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="defermentChargeMinimum"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deferment Charge Minimum</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                data-testid="input-deferment-charge-minimum"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="defermentChargePercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deferment Charge %</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              data-testid="input-deferment-charge-percentage"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="handoverFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Handover Fee</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                data-testid="input-handover-fee"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateSettings.isPending}
                      data-testid="button-save-settings"
                    >
                      {updateSettings.isPending ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gmail Integration</CardTitle>
              <CardDescription>
                Connect your Gmail account to send emails directly from the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentUser?.gmailEmail ? (
                <div className="space-y-4">
                  <Alert className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertTitle className="text-green-800 dark:text-green-200">Gmail Connected</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      Your Gmail account <strong>{currentUser.gmailEmail}</strong> is connected and ready to send emails.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                      <p className="font-medium">{currentUser.gmailEmail}</p>
                      <p className="text-sm text-muted-foreground">Connected Gmail account</p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await apiRequest("POST", "/api/gmail/disconnect", {});
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                          toast({
                            title: "Gmail disconnected",
                            description: "Your Gmail account has been disconnected.",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to disconnect Gmail account.",
                            variant: "destructive",
                          });
                        }
                      }}
                      data-testid="button-disconnect-gmail"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Gmail Account Connected</AlertTitle>
                    <AlertDescription>
                      Connect your Gmail account to enable sending emails from the application.
                      This will allow you to send invoices, shipping documents, and other communications directly from your Gmail.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={async () => {
                      try {
                        const response = await apiRequest("GET", "/api/gmail/auth-url");
                        const data = await response.json() as { authUrl: string };
                        // Open in new window to avoid iframe restrictions
                        window.open(data.authUrl, '_blank', 'noopener,noreferrer');
                        toast({
                          title: "Opening Google authorization",
                          description: "Complete the authorization in the new window, then return here.",
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to initiate Gmail connection.",
                          variant: "destructive",
                        });
                      }
                    }}
                    data-testid="button-connect-gmail"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Connect Gmail Account
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Email Signature</CardTitle>
              <CardDescription>
                Upload an HTML template and logo image for your email signature
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* HTML Template Upload */}
              <div className="space-y-2">
                <Label htmlFor="template-upload">Signature Template (HTML)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="template-upload"
                    type="file"
                    accept=".html"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setTemplateFile(file);
                    }}
                    data-testid="input-template-file"
                  />
                  <Button
                    onClick={() => {
                      if (templateFile) {
                        uploadTemplateMutation.mutate(templateFile);
                      }
                    }}
                    disabled={!templateFile || uploadTemplateMutation.isPending}
                    data-testid="button-upload-template"
                  >
                    {uploadTemplateMutation.isPending ? "Uploading..." : "Upload"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.href = '/api/signature/download-template';
                    }}
                    data-testid="button-download-template"
                  >
                    Download
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload an HTML file for your signature. Use {'{{USER_NAME}}'} and {'{{LOGO_URL}}'} as placeholders.
                </p>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label htmlFor="logo-upload">Signature Logo Image</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setLogoFile(file);
                    }}
                    data-testid="input-logo-file"
                  />
                  <Button
                    onClick={() => {
                      if (logoFile) {
                        uploadLogoMutation.mutate(logoFile);
                      }
                    }}
                    disabled={!logoFile || uploadLogoMutation.isPending}
                    data-testid="button-upload-logo"
                  >
                    {uploadLogoMutation.isPending ? "Uploading..." : "Upload"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.href = '/api/signature/download-logo';
                    }}
                    data-testid="button-download-logo"
                  >
                    Download
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload an image file for your signature logo. Only one logo can be hosted at a time.
                </p>
              </div>

              {/* Enable/Disable Signature */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useSignature"
                  checked={useSignature}
                  onCheckedChange={(checked) => setUseSignature(checked as boolean)}
                  data-testid="checkbox-use-signature"
                />
                <Label
                  htmlFor="useSignature"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Include signature in emails
                </Label>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    saveSignatureMutation.mutate({
                      useSignature,
                    });
                  }}
                  disabled={saveSignatureMutation.isPending}
                  data-testid="button-save-signature"
                >
                  {saveSignatureMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          {currentUser?.isAdmin ? (
            <UsersManagement 
              isAddUserOpen={isAddUserOpen}
              setIsAddUserOpen={setIsAddUserOpen}
              userToDelete={userToDelete}
              setUserToDelete={setUserToDelete}
              userToEdit={userToEdit}
              setUserToEdit={setUserToEdit}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  Administrator access is required to manage users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  You don't have permission to view this page. Please contact your administrator.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersManagement({ 
  isAddUserOpen, 
  setIsAddUserOpen,
  userToDelete,
  setUserToDelete,
  userToEdit,
  setUserToEdit
}: {
  isAddUserOpen: boolean;
  setIsAddUserOpen: (open: boolean) => void;
  userToDelete: Omit<User, 'password'> | null;
  setUserToDelete: (user: Omit<User, 'password'> | null) => void;
  userToEdit: Omit<User, 'password'> | null;
  setUserToEdit: (user: Omit<User, 'password'> | null) => void;
}) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { data: users, isLoading } = useQuery<Omit<User, 'password'>[]>({
    queryKey: ["/api/users"],
  });

  const addUserForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      isAdmin: false,
    },
  });

  const editUserForm = useForm({
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      isAdmin: false,
    },
  });

  // Update form when userToEdit changes
  useEffect(() => {
    if (userToEdit) {
      editUserForm.reset({
        username: userToEdit.username,
        fullName: userToEdit.fullName || "",
        email: userToEdit.email || "",
        isAdmin: userToEdit.isAdmin,
      });
    }
  }, [userToEdit, editUserForm]);

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddUserOpen(false);
      addUserForm.reset();
      toast({
        title: "User created",
        description: "The new user has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      return apiRequest("PATCH", `/api/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserToEdit(null);
      editUserForm.reset();
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserToDelete(null);
      toast({
        title: "User deleted",
        description: "The user has been removed from the system.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (data: any) => {
    createUserMutation.mutate(data);
  };

  const handleUpdateUser = (data: any) => {
    if (userToEdit) {
      updateUserMutation.mutate({ userId: userToEdit.id, data });
    }
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading users...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts and permissions
              </CardDescription>
            </div>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-user">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the system
                  </DialogDescription>
                </DialogHeader>
                <Form {...addUserForm}>
                  <form onSubmit={addUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
                    <FormField
                      control={addUserForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-new-username" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addUserForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password *</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} data-testid="input-new-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addUserForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-new-fullname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addUserForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} value={field.value || ""} data-testid="input-new-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addUserForm.control}
                      name="isAdmin"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4"
                              data-testid="checkbox-new-admin"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Administrator</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddUserOpen(false)}
                        data-testid="button-cancel-add-user"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createUserMutation.isPending}
                        data-testid="button-create-user"
                      >
                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.fullName || "-"}</TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>
                      {user.isAdmin && (
                        <Badge variant="default" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {!user.isAdmin && <span className="text-muted-foreground">User</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUserToEdit(user as Omit<User, 'password'>)}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUserToDelete(user)}
                          disabled={user.id === currentUser?.id}
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role
            </DialogDescription>
          </DialogHeader>
          <Form {...editUserForm}>
            <form onSubmit={editUserForm.handleSubmit(handleUpdateUser)} className="space-y-4">
              <FormField
                control={editUserForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} disabled data-testid="input-edit-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editUserForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-fullname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editUserForm.control}
                name="isAdmin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <select
                        value={field.value ? "admin" : "user"}
                        onChange={(e) => field.onChange(e.target.value === "admin")}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        data-testid="select-edit-role"
                      >
                        <option value="user">User</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUserToEdit(null)}
                  data-testid="button-cancel-edit-user"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  data-testid="button-update-user"
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete user "{userToDelete?.username}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
