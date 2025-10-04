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
import { insertSettingsSchema, type Settings, type InsertSettings } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, CheckCircle, XCircle } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("financials");
  
  // Fetch Gmail connection status
  const { data: gmailStatus, isLoading: gmailLoading } = useQuery<{ connected: boolean; email: string | null }>({
    queryKey: ["/api/gmail/status"],
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
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Connect your Gmail account to send emails with attachments directly from the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {gmailLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Checking Gmail connection...</p>
                </div>
              ) : gmailStatus?.connected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900 dark:text-green-100">Gmail Connected</p>
                      {gmailStatus.email && (
                        <p className="text-sm text-green-700 dark:text-green-300">{gmailStatus.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Your Gmail account is connected. You can now send emails with PDF attachments directly from the application.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.open('/~/connectors', '_blank');
                      }}
                      data-testid="button-manage-gmail"
                    >
                      Manage Connection
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                    <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-900 dark:text-amber-100">Gmail Not Connected</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">Connect your Gmail account to enable email functionality</p>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <p className="text-sm font-medium">What you'll be able to do:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Send emails with PDF attachments directly from shipment and clearance documents</li>
                      <li>Emails are sent from your own Gmail account</li>
                      <li>Full control over your email communications</li>
                    </ul>
                  </div>
                  <div className="pt-2">
                    <Button
                      onClick={() => {
                        window.open('/~/connectors', '_blank');
                      }}
                      data-testid="button-connect-gmail"
                    >
                      Connect Gmail Account
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
