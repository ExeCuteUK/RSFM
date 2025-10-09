import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertImportShipmentSchema, type InsertImportShipment, type ImportCustomer, type InsertImportCustomer, type Haulier, type ShippingLine, type ClearanceAgent } from "@shared/schema"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { FileUpload, type FileMetadata } from "@/components/ui/file-upload"
import { ObjectStorageUploader } from "@/components/ui/object-storage-uploader"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, parseISO } from "date-fns"
import { CalendarIcon, Plus, FileText, X, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImportCustomerForm } from "./import-customer-form"
import { ContactCombobox } from "./ContactCombobox"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

interface ImportShipmentFormProps {
  onSubmit: (data: InsertImportShipment) => void
  onCancel: () => void
  defaultValues?: Partial<InsertImportShipment>
}

// Validation helpers
const numericWithDecimalsRegex = /^(\d+\.?\d*|\.\d+)?$/;

const importShipmentFormSchema = insertImportShipmentSchema.superRefine((data: any, ctx: z.RefinementCtx) => {
  // Numeric field validations
  const numericFields = [
    { field: 'weight', label: 'Weight' },
    { field: 'numberOfPieces', label: 'Number of pieces' },
    { field: 'cube', label: 'Cube' },
    { field: 'invoiceValue', label: 'Invoice value' },
    { field: 'freightCharge', label: 'Freight charge' },
    { field: 'exportCustomsClearanceCharge', label: 'Export customs clearance charge' },
    { field: 'freightRateOut', label: 'Freight rate out' },
    { field: 'additionalCommodityCodeCharge', label: 'Additional commodity code charge' },
    { field: 'haulierFreightRateIn', label: 'Haulier freight rate in' },
    { field: 'exportClearanceChargeIn', label: 'Export clearance charge in' },
    { field: 'destinationClearanceCostIn', label: 'Destination clearance cost in' },
  ];

  numericFields.forEach(({ field, label }) => {
    const value = data[field];
    if (value && !numericWithDecimalsRegex.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} must be a number (decimals allowed)`,
        path: [field],
      });
    }
  });

  // Container number validation
  if (data.containerShipment === "Container Shipment" && data.trailerOrContainerNumber) {
    const containerNo = data.trailerOrContainerNumber.replace(/\s/g, "");
    if (containerNo.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Container number must be exactly 11 characters with no spaces",
        path: ["trailerOrContainerNumber"],
      });
    }
  }
});

export function ImportShipmentForm({ onSubmit, onCancel, defaultValues }: ImportShipmentFormProps) {
  const { toast } = useToast()
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [pendingProofOfDelivery, setPendingProofOfDelivery] = useState<string[]>([])
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([])
  const [newHaulierEmail, setNewHaulierEmail] = useState("")
  const [newHaulierContactName, setNewHaulierContactName] = useState("")
  const [newJobContactName, setNewJobContactName] = useState("")
  const [newJobContactEmail, setNewJobContactEmail] = useState("")
  const [showUnsavedFieldsWarning, setShowUnsavedFieldsWarning] = useState(false)

  const form = useForm<InsertImportShipment>({
    resolver: zodResolver(importShipmentFormSchema),
    defaultValues: {
      jobType: "import",
      status: "Awaiting Collection",
      importCustomerId: "",
      jobContactName: [],
      jobContactEmail: [],
      bookingDate: defaultValues?.bookingDate || format(new Date(), "yyyy-MM-dd"),
      collectionDate: "",
      dispatchDate: "",
      deliveryDate: "",
      deliveryTime: "",
      deliveryReference: "",
      deliveryTimeNotes: "",
      proofOfDelivery: [],
      importDateEtaPort: "",
      portOfArrival: "",
      trailerOrContainerNumber: "",
      departureCountry: "",
      containerShipment: "",
      handoverContainerAtPort: false,
      vesselName: "",
      shippingLine: "",
      deliveryRelease: "",
      incoterms: "",
      numberOfPieces: "",
      packaging: "",
      weight: "",
      cube: "",
      goodsDescription: "",
      invoiceValue: "",
      freightCharge: "",
      exportCustomsClearanceCharge: "",
      currency: "",
      freightRateOut: "",
      additionalCommodityCodes: 1,
      additionalCommodityCodeCharge: "",
      expensesToChargeOut: [],
      additionalExpensesIn: [],
      currencyIn: "GBP",
      haulierFreightRateIn: "",
      exportClearanceChargeIn: "",
      destinationClearanceCostIn: "",
      haulierName: "",
      haulierContactName: [],
      haulierEmail: [],
      haulierTelephone: "",
      haulierReference: "",
      vatZeroRated: false,
      clearanceType: "",
      customsClearanceAgent: "",
      rsToClear: false,
      customerReferenceNumber: "",
      deliveryAddress: "",
      supplierName: "",
      collectionAddress: "",
      collectionContactName: "",
      collectionContactTelephone: "",
      collectionContactEmail: "",
      collectionReference: "",
      collectionNotes: "",
      additionalNotes: "",
      jobTags: [],
      attachments: [],
      ...defaultValues
    },
  })

  const selectedCustomerId = form.watch("importCustomerId")

  const { data: selectedCustomer } = useQuery<ImportCustomer>({
    queryKey: ["/api/import-customers", selectedCustomerId],
    enabled: !!selectedCustomerId,
  })

  const { data: hauliers } = useQuery<Haulier[]>({
    queryKey: ["/api/hauliers"],
  })

  const { data: shippingLines } = useQuery<ShippingLine[]>({
    queryKey: ["/api/shipping-lines"],
  })

  const { data: clearanceAgents = [] } = useQuery<ClearanceAgent[]>({
    queryKey: ["/api/clearance-agents"],
  })

  const createCustomerMutation = useMutation({
    mutationFn: async (data: InsertImportCustomer) => {
      const response = await apiRequest("POST", "/api/import-customers", data);
      return response.json() as Promise<ImportCustomer>;
    },
    onSuccess: async (newCustomer: ImportCustomer) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/import-customers"] })
      form.setValue("importCustomerId", newCustomer.id)
      setIsCustomerDialogOpen(false)
      toast({
        title: "Success",
        description: "Import customer created successfully",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create import customer",
        variant: "destructive",
      })
    },
  })
  const rsToClear = form.watch("rsToClear")
  const containerShipment = form.watch("containerShipment")
  const handoverContainerAtPort = form.watch("handoverContainerAtPort")
  const status = form.watch("status")
  const haulierEmails = form.watch("haulierEmail") || []
  const haulierContactNames = form.watch("haulierContactName") || []
  const jobContactNames = form.watch("jobContactName") || []
  const jobContactEmails = form.watch("jobContactEmail") || []
  const additionalCommodityCodes = form.watch("additionalCommodityCodes")

  // Clear Import Customs Clearance Charge Out when R.S to Clear is unticked
  useEffect(() => {
    if (!rsToClear) {
      form.setValue("clearanceCharge", "")
    }
  }, [rsToClear, form])

  // Auto-populate Job Contact Name and Email when customer is selected (only for new shipments)
  useEffect(() => {
    if (selectedCustomer && (!defaultValues?.jobContactName || defaultValues.jobContactName.length === 0) && (!defaultValues?.jobContactEmail || defaultValues.jobContactEmail.length === 0)) {
      // Prioritize agent contact name if available, otherwise use contact name
      if (selectedCustomer.agentContactName && selectedCustomer.agentContactName.length > 0) {
        form.setValue("jobContactName", [selectedCustomer.agentContactName[0]])
      } else if (selectedCustomer.contactName && selectedCustomer.contactName.length > 0) {
        form.setValue("jobContactName", [selectedCustomer.contactName[0]])
      }

      // Prioritize agent email if agent name is present, otherwise use contact email
      if (selectedCustomer.agentName && selectedCustomer.agentEmail && selectedCustomer.agentEmail.length > 0) {
        form.setValue("jobContactEmail", [selectedCustomer.agentEmail[0]])
      } else if (selectedCustomer.email && selectedCustomer.email.length > 0) {
        form.setValue("jobContactEmail", [selectedCustomer.email[0]])
      }
    }
  }, [selectedCustomer, defaultValues?.jobContactName, defaultValues?.jobContactEmail, form])

  const addJobContactName = () => {
    if (!newJobContactName.trim()) return
    const currentNames = form.getValues("jobContactName") || []
    if (!currentNames.includes(newJobContactName.trim())) {
      form.setValue("jobContactName", [...currentNames, newJobContactName.trim()])
      setNewJobContactName("")
    }
  }

  const removeJobContactName = (name: string) => {
    const currentNames = form.getValues("jobContactName") || []
    form.setValue("jobContactName", currentNames.filter(n => n !== name))
  }

  const addJobContactEmail = () => {
    if (!newJobContactEmail.trim()) return
    const currentEmails = form.getValues("jobContactEmail") || []
    if (!currentEmails.includes(newJobContactEmail.trim())) {
      form.setValue("jobContactEmail", [...currentEmails, newJobContactEmail.trim()])
      setNewJobContactEmail("")
    }
  }

  const removeJobContactEmail = (email: string) => {
    const currentEmails = form.getValues("jobContactEmail") || []
    form.setValue("jobContactEmail", currentEmails.filter(e => e !== email))
  }

  const addHaulierContactName = () => {
    if (!newHaulierContactName.trim()) return
    const currentNames = form.getValues("haulierContactName") || []
    if (!currentNames.includes(newHaulierContactName.trim())) {
      form.setValue("haulierContactName", [...currentNames, newHaulierContactName.trim()])
      setNewHaulierContactName("")
    }
  }

  const removeHaulierContactName = (name: string) => {
    const currentNames = form.getValues("haulierContactName") || []
    form.setValue("haulierContactName", currentNames.filter(n => n !== name))
  }

  const addHaulierEmail = () => {
    if (!newHaulierEmail.trim()) return
    const currentEmails = form.getValues("haulierEmail") || []
    if (!currentEmails.includes(newHaulierEmail.trim())) {
      form.setValue("haulierEmail", [...currentEmails, newHaulierEmail.trim()])
      setNewHaulierEmail("")
    }
  }

  const removeHaulierEmail = (email: string) => {
    const currentEmails = form.getValues("haulierEmail") || []
    form.setValue("haulierEmail", currentEmails.filter(e => e !== email))
  }

  useEffect(() => {
    if (selectedCustomer) {
      // Only set rsToClear from customer preference when creating a new shipment, not when editing
      if (defaultValues?.rsToClear === undefined) {
        form.setValue("rsToClear", selectedCustomer.rsProcessCustomsClearance ?? false)
      }
      form.setValue("customsClearanceAgent", selectedCustomer.agentInDover || "")
      form.setValue("deliveryAddress", selectedCustomer.defaultDeliveryAddress || "")
      form.setValue("supplierName", selectedCustomer.defaultSuppliersName || "")
    }
  }, [selectedCustomer, form, defaultValues?.rsToClear])

  useEffect(() => {
    if (additionalCommodityCodes && additionalCommodityCodes > 1) {
      const currentCharge = form.getValues("additionalCommodityCodeCharge")
      if (!currentCharge || currentCharge === "") {
        form.setValue("additionalCommodityCodeCharge", "5")
      }
    }
  }, [additionalCommodityCodes, form])

  useEffect(() => {
    const currentExpenses = (form.getValues("expensesToChargeOut") || []) as Array<{ description: string; amount: string }>
    const handoverFeeExists = currentExpenses.some((exp) => exp.description === "Handover Fee")
    
    if (handoverContainerAtPort && !handoverFeeExists) {
      form.setValue("expensesToChargeOut", [
        ...currentExpenses,
        { description: "Handover Fee", amount: "30" }
      ])
    } else if (!handoverContainerAtPort && handoverFeeExists) {
      form.setValue("expensesToChargeOut", 
        currentExpenses.filter((exp) => exp.description !== "Handover Fee")
      )
    }
  }, [handoverContainerAtPort, form])

  const hasUnsavedFields = () => {
    return newHaulierContactName.trim() !== "" || newHaulierEmail.trim() !== ""
  }

  const handleContinueWithoutSaving = async () => {
    setShowUnsavedFieldsWarning(false)
    const data = form.getValues()
    await submitForm(data)
  }

  const handleFormSubmit = async (data: InsertImportShipment) => {
    if (hasUnsavedFields()) {
      setShowUnsavedFieldsWarning(true)
      return
    }
    await submitForm(data)
  }

  const submitForm = async (data: InsertImportShipment) => {
    const normalizedProofOfDelivery: string[] = [...(data.proofOfDelivery || [])];
    const normalizedAttachments: string[] = [...(data.attachments || [])];

    if (pendingProofOfDelivery.length > 0) {
      try {
        const normalizeResponse = await fetch("/api/objects/normalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: pendingProofOfDelivery }),
        });
        const normalizeData = await normalizeResponse.json();
        normalizedProofOfDelivery.push(...normalizeData.paths);
        setPendingProofOfDelivery([]);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process proof of delivery files",
          variant: "destructive",
        });
        return;
      }
    }

    if (pendingAttachments.length > 0) {
      try {
        const normalizeResponse = await fetch("/api/objects/normalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: pendingAttachments }),
        });
        const normalizeData = await normalizeResponse.json();
        normalizedAttachments.push(...normalizeData.paths);
        setPendingAttachments([]);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process attachment files",
          variant: "destructive",
        });
        return;
      }
    }

    const finalData = {
      ...data,
      proofOfDelivery: normalizedProofOfDelivery,
      attachments: normalizedAttachments,
    };

    onSubmit(finalData);
  };

  const handleValidationError = (errors: typeof form.formState.errors) => {
    const firstErrorField = Object.keys(errors)[0];
    const firstError = firstErrorField ? (errors as any)[firstErrorField] : null;
    const firstErrorMessage = firstError?.message;

    toast({
      title: "Form Validation Error",
      description: firstErrorMessage || "Please check the form for errors",
      variant: "destructive",
    });

    if (firstErrorField) {
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit, handleValidationError)} className="space-y-6">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer &amp; Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="importCustomerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Import Customer</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <ContactCombobox
                          type="import-customer"
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select import customer"
                          className="flex-1"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsCustomerDialogOpen(true)}
                        data-testid="button-create-customer"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="jobContactName"
                  render={() => (
                    <FormItem>
                      <FormLabel>Job Contact Name(s)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              value={newJobContactName}
                              onChange={(e) => setNewJobContactName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addJobContactName()
                                }
                              }}
                              placeholder="Add job contact name"
                              data-testid="input-new-job-contact-name"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={addJobContactName}
                              data-testid="button-add-job-contact-name"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {jobContactNames.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {jobContactNames.map((name) => (
                                <Badge key={name} variant="secondary" className="gap-1">
                                  {name}
                                  <button
                                    type="button"
                                    onClick={() => removeJobContactName(name)}
                                    className="hover-elevate active-elevate-2 rounded-full"
                                    data-testid={`button-remove-job-contact-name-${name}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobContactEmail"
                  render={() => (
                    <FormItem>
                      <FormLabel>Job Contact Email(s)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              value={newJobContactEmail}
                              onChange={(e) => setNewJobContactEmail(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addJobContactEmail()
                                }
                              }}
                              placeholder="Add job contact email"
                              data-testid="input-new-job-contact-email"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={addJobContactEmail}
                              data-testid="button-add-job-contact-email"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {jobContactEmails.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {jobContactEmails.map((email) => (
                                <Badge key={email} variant="secondary" className="gap-1">
                                  {email}
                                  <button
                                    type="button"
                                    onClick={() => removeJobContactEmail(email)}
                                    className="hover-elevate active-elevate-2 rounded-full"
                                    data-testid={`button-remove-job-contact-email-${email}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="customerReferenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Reference Number</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-customer-reference" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-job-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Awaiting Collection">Awaiting Collection</SelectItem>
                          <SelectItem value="Dispatched">Dispatched</SelectItem>
                          <SelectItem value="Delivered">Delivered</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="containerShipment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipment Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-shipment-type">
                            <SelectValue placeholder="Select shipment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Road Shipment">Road Shipment</SelectItem>
                          <SelectItem value="Container Shipment">Container Shipment</SelectItem>
                          <SelectItem value="Air Freight">Air Freight</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {containerShipment === "Container Shipment" && (
                  <FormField
                    control={form.control}
                    name="handoverContainerAtPort"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox 
                            checked={field.value || false} 
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-handover-container"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Handover Container to Customer at Port</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                {(status === "Delivered" || status === "Completed") && (
                  <FormField
                    control={form.control}
                    name="proofOfDelivery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proof Of Delivery</FormLabel>
                        <FormControl>
                          <ObjectStorageUploader
                            value={field.value || []}
                            onChange={field.onChange}
                            pendingFiles={pendingProofOfDelivery}
                            onPendingFilesChange={setPendingProofOfDelivery}
                            maxFiles={10}
                            testId="pod-uploader"
                            label="Proof Of Delivery Files:"
                            dragDropLabel="Drop POD files here or click to browse"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="portOfArrival"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port of Arrival</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-port-arrival" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trailerOrContainerNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {containerShipment === "Air Freight" 
                          ? "Flight Number" 
                          : containerShipment === "Container Shipment" 
                            ? "Container Number" 
                            : "Trailer Number"}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-trailer-container" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departureCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Country</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-departure-country">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Albania">Albania</SelectItem>
                          <SelectItem value="Argentina">Argentina</SelectItem>
                          <SelectItem value="Australia">Australia</SelectItem>
                          <SelectItem value="Austria">Austria</SelectItem>
                          <SelectItem value="Belgium">Belgium</SelectItem>
                          <SelectItem value="Bosnia and Herzegovina">Bosnia and Herzegovina</SelectItem>
                          <SelectItem value="Brazil">Brazil</SelectItem>
                          <SelectItem value="Bulgaria">Bulgaria</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="Chile">Chile</SelectItem>
                          <SelectItem value="China">China</SelectItem>
                          <SelectItem value="Croatia">Croatia</SelectItem>
                          <SelectItem value="Cyprus">Cyprus</SelectItem>
                          <SelectItem value="Czech Republic">Czech Republic</SelectItem>
                          <SelectItem value="Denmark">Denmark</SelectItem>
                          <SelectItem value="Egypt">Egypt</SelectItem>
                          <SelectItem value="Estonia">Estonia</SelectItem>
                          <SelectItem value="Finland">Finland</SelectItem>
                          <SelectItem value="France">France</SelectItem>
                          <SelectItem value="Germany">Germany</SelectItem>
                          <SelectItem value="Greece">Greece</SelectItem>
                          <SelectItem value="Hong Kong">Hong Kong</SelectItem>
                          <SelectItem value="Hungary">Hungary</SelectItem>
                          <SelectItem value="Iceland">Iceland</SelectItem>
                          <SelectItem value="India">India</SelectItem>
                          <SelectItem value="Indonesia">Indonesia</SelectItem>
                          <SelectItem value="Ireland">Ireland</SelectItem>
                          <SelectItem value="Israel">Israel</SelectItem>
                          <SelectItem value="Italy">Italy</SelectItem>
                          <SelectItem value="Japan">Japan</SelectItem>
                          <SelectItem value="Kosovo">Kosovo</SelectItem>
                          <SelectItem value="Latvia">Latvia</SelectItem>
                          <SelectItem value="Lithuania">Lithuania</SelectItem>
                          <SelectItem value="Luxembourg">Luxembourg</SelectItem>
                          <SelectItem value="Malaysia">Malaysia</SelectItem>
                          <SelectItem value="Malta">Malta</SelectItem>
                          <SelectItem value="Mexico">Mexico</SelectItem>
                          <SelectItem value="Moldova">Moldova</SelectItem>
                          <SelectItem value="Montenegro">Montenegro</SelectItem>
                          <SelectItem value="Morocco">Morocco</SelectItem>
                          <SelectItem value="Netherlands">Netherlands</SelectItem>
                          <SelectItem value="New Zealand">New Zealand</SelectItem>
                          <SelectItem value="North Macedonia">North Macedonia</SelectItem>
                          <SelectItem value="Norway">Norway</SelectItem>
                          <SelectItem value="Philippines">Philippines</SelectItem>
                          <SelectItem value="Poland">Poland</SelectItem>
                          <SelectItem value="Portugal">Portugal</SelectItem>
                          <SelectItem value="Romania">Romania</SelectItem>
                          <SelectItem value="Russia">Russia</SelectItem>
                          <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                          <SelectItem value="Serbia">Serbia</SelectItem>
                          <SelectItem value="Singapore">Singapore</SelectItem>
                          <SelectItem value="Slovakia">Slovakia</SelectItem>
                          <SelectItem value="Slovenia">Slovenia</SelectItem>
                          <SelectItem value="South Africa">South Africa</SelectItem>
                          <SelectItem value="South Korea">South Korea</SelectItem>
                          <SelectItem value="Spain">Spain</SelectItem>
                          <SelectItem value="Sweden">Sweden</SelectItem>
                          <SelectItem value="Switzerland">Switzerland</SelectItem>
                          <SelectItem value="Taiwan">Taiwan</SelectItem>
                          <SelectItem value="Thailand">Thailand</SelectItem>
                          <SelectItem value="Turkey">Turkey</SelectItem>
                          <SelectItem value="Ukraine">Ukraine</SelectItem>
                          <SelectItem value="United Arab Emirates">United Arab Emirates</SelectItem>
                          <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Vietnam">Vietnam</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incoterms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incoterms</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-incoterms">
                            <SelectValue placeholder="Select incoterms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EXW">EXW - Ex Works</SelectItem>
                          <SelectItem value="FCA">FCA - Free Carrier</SelectItem>
                          <SelectItem value="CPT">CPT - Carriage Paid To</SelectItem>
                          <SelectItem value="CIP">CIP - Carriage and Insurance Paid To</SelectItem>
                          <SelectItem value="DAP">DAP - Delivered At Place</SelectItem>
                          <SelectItem value="DPU">DPU - Delivered at Place Unloaded</SelectItem>
                          <SelectItem value="DDP">DDP - Delivered Duty Paid</SelectItem>
                          <SelectItem value="FAS">FAS - Free Alongside Ship</SelectItem>
                          <SelectItem value="FOB">FOB - Free On Board</SelectItem>
                          <SelectItem value="CFR">CFR - Cost and Freight</SelectItem>
                          <SelectItem value="CIF">CIF - Cost, Insurance and Freight</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {containerShipment === "Container Shipment" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="vesselName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vessel Name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-vessel-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shippingLine"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipping Line</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-shipping-line">
                                <SelectValue placeholder="Select shipping line" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {shippingLines && shippingLines.length > 0 ? (
                                shippingLines.map((line) => (
                                  <SelectItem key={line.id} value={line.shippingLineName}>
                                    {line.shippingLineName}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>No shipping lines available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {(containerShipment === "Container Shipment" || containerShipment === "Air Freight") && (
                  <FormField
                    control={form.control}
                    name="deliveryRelease"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {handoverContainerAtPort ? "Handover Notes" : "Delivery Release"}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-delivery-release" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collection Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="collectionAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-collection-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="collectionContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-collection-contact-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="collectionContactTelephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Contact Telephone</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-collection-contact-telephone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="collectionContactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Contact Email</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-collection-contact-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="collectionReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Reference</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-collection-reference" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="collectionNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-collection-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scheduling & Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="bookingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-booking-date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value && field.value !== "" ? format(new Date(field.value), "dd/MM/yy") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value && field.value !== "" ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="collectionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Date</FormLabel>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-approx-load-date"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value && field.value !== "" ? format(new Date(field.value), "dd/MM/yy") : <span>Pick a date</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value && field.value !== "" ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {field.value && field.value !== "" && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => field.onChange("")}
                            data-testid="button-clear-approx-load-date"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dispatchDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dispatch Date</FormLabel>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-dispatch-date"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value && field.value !== "" ? format(new Date(field.value), "dd/MM/yy") : <span>Pick a date</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value && field.value !== "" ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {field.value && field.value !== "" && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => field.onChange("")}
                            data-testid="button-clear-dispatch-date"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="importDateEtaPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {containerShipment === "Air Freight" 
                          ? "ETA Airport" 
                          : containerShipment === "Road Shipment"
                          ? "ETA Customs"
                          : "ETA Port"}
                      </FormLabel>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-import-date"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(parseISO(field.value), "dd/MM/yy")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value ? parseISO(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {field.value && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => field.onChange("")}
                            data-testid="button-clear-eta-port"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              {!handoverContainerAtPort && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Date</FormLabel>
                        <div className="flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-delivery-date"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value && field.value !== "" ? format(new Date(field.value), "dd/MM/yy") : <span>Pick a date</span>}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value && field.value !== "" ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          {field.value && field.value !== "" && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => field.onChange("")}
                              data-testid="button-clear-delivery-date"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Time</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              value={field.value || ""}
                              className="w-full"
                              data-testid="input-delivery-time"
                            />
                          </FormControl>
                          {field.value && field.value !== "" && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => field.onChange("")}
                              data-testid="button-clear-delivery-time"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryReference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Reference</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-delivery-reference" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryTimeNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Notes</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-delivery-time-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} data-testid="input-delivery-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cargo Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="numberOfPieces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Pieces</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-number-pieces" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="packaging"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Packaging</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-packaging" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-weight" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cube"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cube</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-cube" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="goodsDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goods Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-goods-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-supplier-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Value & Additional Declaired Values</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="EUR">Euro (€)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="TL">TL</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoiceValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Value</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-invoice-value" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="freightCharge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transport Costs</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-freight-charge" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customs Clearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="rsToClear"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-rs-to-clear"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">R.S To Clear</FormLabel>
                    </FormItem>
                  )}
                />

                {rsToClear && (
                  <FormField
                    control={form.control}
                    name="vatZeroRated"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-vat-zero-rated"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">VAT Zero Rated</FormLabel>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {!rsToClear && (
                <FormField
                  control={form.control}
                  name="customsClearanceAgent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customs Clearance Agent</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-customs-agent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {rsToClear && (
                <>
                  <FormField
                    control={form.control}
                    name="clearanceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clearance Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-clearance-type">
                              <SelectValue placeholder="Select clearance type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="GVMS">GVMS</SelectItem>
                            <SelectItem value="Inventory Linked">Inventory Linked</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clearanceAgent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clearance Agent</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-clearance-agent">
                              <SelectValue placeholder="Select clearance agent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clearanceAgents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.companyName}>
                                {agent.companyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quotation / Rate Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>R.S Quotation Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "GBP"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="TL">TL (₺)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="freightRateOut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Freight Rate Out</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-freight-rate-out" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exportCustomsClearanceCharge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Export Customs Clearance Charge Out</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-export-customs-clearance-charge" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {rsToClear && (
                  <FormField
                    control={form.control}
                    name="clearanceCharge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Import Customs Clearance Charge Out</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-clearance-charge" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {rsToClear && (
                  <FormField
                    control={form.control}
                    name="additionalCommodityCodes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Commodity Codes</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-commodity-codes">
                              <SelectValue placeholder="Select number" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {rsToClear && additionalCommodityCodes && additionalCommodityCodes > 1 && (
                  <FormField
                    control={form.control}
                    name="additionalCommodityCodeCharge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Charge Per HS Code</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-additional-commodity-code-charge" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="expensesToChargeOut"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Expenses To Charge Out</FormLabel>
                      <div className="space-y-2">
                        {((field.value || []) as Array<{ description: string; amount: string }>).map((expense, index) => (
                          <div key={index} className="flex gap-2 items-start">
                            <Input
                              value={expense.description}
                              onChange={(e) => {
                                const newExpenses = [...(field.value || [])] as Array<{ description: string; amount: string }>;
                                newExpenses[index].description = e.target.value;
                                field.onChange(newExpenses);
                              }}
                              placeholder="Description"
                              className="flex-1"
                            />
                            <Input
                              value={expense.amount}
                              onChange={(e) => {
                                const newExpenses = [...(field.value || [])] as Array<{ description: string; amount: string }>;
                                newExpenses[index].amount = e.target.value;
                                field.onChange(newExpenses);
                              }}
                              placeholder="Amount"
                              className="w-32"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newExpenses = (field.value || []).filter((_, i) => i !== index);
                                field.onChange(newExpenses);
                              }}
                              data-testid={`button-remove-expense-out-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            field.onChange([...(field.value || []), { description: "", amount: "" }]);
                          }}
                          data-testid="button-add-expense-out"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Expense
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="currencyIn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Haulier Rate Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "GBP"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-currency-in">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="TL">TL (₺)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="haulierFreightRateIn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Haulier Freight Rate In</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-haulier-freight-rate-in" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exportClearanceChargeIn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Export Customs Clearance Charge In</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-export-clearance-charge-in" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {rsToClear && (
                    <FormField
                      control={form.control}
                      name="destinationClearanceCostIn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Import Customs Clearance Charge In</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-destination-clearance-cost-in" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="additionalExpensesIn"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Additional Expenses In</FormLabel>
                        <div className="space-y-2">
                          {((field.value || []) as Array<{ description: string; amount: string }>).map((expense, index) => (
                            <div key={index} className="flex gap-2 items-start">
                              <Input
                                value={expense.description}
                                onChange={(e) => {
                                  const newExpenses = [...(field.value || [])] as Array<{ description: string; amount: string }>;
                                  newExpenses[index].description = e.target.value;
                                  field.onChange(newExpenses);
                                }}
                                placeholder="Description"
                                className="flex-1"
                              />
                              <Input
                                value={expense.amount}
                                onChange={(e) => {
                                  const newExpenses = [...(field.value || [])] as Array<{ description: string; amount: string }>;
                                  newExpenses[index].amount = e.target.value;
                                  field.onChange(newExpenses);
                                }}
                                placeholder="Amount"
                                className="w-32"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newExpenses = (field.value || []).filter((_, i) => i !== index);
                                  field.onChange(newExpenses);
                                }}
                                data-testid={`button-remove-expense-in-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              field.onChange([...(field.value || []), { description: "", amount: "" }]);
                            }}
                            data-testid="button-add-expense-in"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Expense
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Haulier Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="haulierName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Haulier</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        const selectedHaulier = hauliers?.find(h => h.haulierName === value);
                        if (selectedHaulier) {
                          const contactNames = selectedHaulier.contacts?.map(c => c.contactName) || [];
                          const contactEmails = selectedHaulier.contacts?.map(c => c.contactEmail) || [];
                          form.setValue("haulierContactName", contactNames);
                          form.setValue("haulierEmail", contactEmails);
                          form.setValue("haulierTelephone", selectedHaulier.telephone || "");
                        }
                      }} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-haulier-name">
                          <SelectValue placeholder="Select haulier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {hauliers?.map((haulier) => (
                          <SelectItem key={haulier.id} value={haulier.haulierName}>
                            {haulier.haulierName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="haulierContactName"
                render={() => (
                  <FormItem>
                    <FormLabel>Haulier Contact Name</FormLabel>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter contact name"
                          value={newHaulierContactName}
                          onChange={(e) => setNewHaulierContactName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addHaulierContactName()
                            }
                          }}
                          data-testid="input-new-haulier-contact-name"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={addHaulierContactName}
                          data-testid="button-add-haulier-contact-name"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {haulierContactNames.length > 0 && (
                        <div className="flex flex-wrap gap-2" data-testid="list-haulier-contact-names">
                          {haulierContactNames.map((name) => (
                            <Badge
                              key={name}
                              variant="secondary"
                              className="gap-1"
                              data-testid={`badge-haulier-contact-name-${name}`}
                            >
                              {name}
                              <button
                                type="button"
                                onClick={() => removeHaulierContactName(name)}
                                className="hover:bg-destructive/20 rounded-sm"
                                data-testid={`button-remove-haulier-contact-name-${name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="haulierEmail"
                render={() => (
                  <FormItem>
                    <FormLabel>Haulier Contact Email For This Shipment</FormLabel>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter email address"
                          value={newHaulierEmail}
                          onChange={(e) => setNewHaulierEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addHaulierEmail()
                            }
                          }}
                          type="email"
                          data-testid="input-new-haulier-email"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={addHaulierEmail}
                          data-testid="button-add-haulier-email"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {haulierEmails.length > 0 && (
                        <div className="flex flex-wrap gap-2" data-testid="list-haulier-emails">
                          {haulierEmails.map((email) => (
                            <Badge
                              key={email}
                              variant="secondary"
                              className="gap-1"
                              data-testid={`badge-haulier-email-${email}`}
                            >
                              {email}
                              <button
                                type="button"
                                onClick={() => removeHaulierEmail(email)}
                                className="hover:bg-destructive/20 rounded-sm"
                                data-testid={`button-remove-haulier-email-${email}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">

                <FormField
                  control={form.control}
                  name="haulierTelephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telephone</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} value={field.value || ""} data-testid="input-haulier-telephone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="haulierReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Haulier Reference</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-haulier-reference" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} rows={5} data-testid="textarea-additional-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobTags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Tags</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value?.join(", ") || ""} 
                        onChange={(e) => {
                          const tags = e.target.value.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
                          field.onChange(tags);
                        }}
                        placeholder="Enter tags separated by commas"
                        data-testid="input-job-tags"
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
              <CardTitle>Transport Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ObjectStorageUploader
                        value={field.value || []}
                        onChange={field.onChange}
                        pendingFiles={pendingAttachments}
                        onPendingFilesChange={setPendingAttachments}
                        maxFiles={10}
                        testId="attachments-uploader"
                        label="Transport Documents:"
                        dragDropLabel="Drop files here or click to browse"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancel
          </Button>
          <Button type="submit" data-testid="button-submit">
            Save
          </Button>
        </div>
      </form>

      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="create-customer-description">
          <DialogHeader>
            <DialogTitle>Create New Import Customer</DialogTitle>
            <DialogDescription id="create-customer-description">
              Add a new import customer to the system. The customer will be automatically selected after creation.
            </DialogDescription>
          </DialogHeader>
          <ImportCustomerForm
            onSubmit={(data) => createCustomerMutation.mutate(data)}
            onCancel={() => setIsCustomerDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedFieldsWarning} onOpenChange={setShowUnsavedFieldsWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Field Information</AlertDialogTitle>
            <AlertDialogDescription>
              You have entered information in one or more fields but haven't added it using the + button. 
              Do you want to continue without saving these entries?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-go-back">Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleContinueWithoutSaving} data-testid="button-continue">
              Continue Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  )
}
