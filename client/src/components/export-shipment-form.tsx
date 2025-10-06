import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertExportShipmentSchema, type InsertExportShipment, type ExportReceiver, type ExportCustomer, type InsertExportCustomer, type InsertExportReceiver, type Haulier, type ShippingLine } from "@shared/schema"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Plus, Download, X, FileText } from "lucide-react"
import { ObjectStorageUploader } from "@/components/ui/object-storage-uploader"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ExportCustomerForm } from "./export-customer-form"
import { ExportReceiverForm } from "./export-receiver-form"
import { ContactCombobox } from "./ContactCombobox"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

interface ExportShipmentFormProps {
  onSubmit: (data: InsertExportShipment) => void
  onCancel: () => void
  defaultValues?: Partial<InsertExportShipment>
}

// Validation helpers
const numericWithDecimalsRegex = /^(\d+\.?\d*|\.\d+)?$/;

const exportShipmentFormSchema = insertExportShipmentSchema.superRefine((data: any, ctx: z.RefinementCtx) => {
  // Numeric field validations
  const numericFields = [
    { field: 'weight', label: 'Weight' },
    { field: 'numberOfPieces', label: 'Number of pieces' },
    { field: 'cube', label: 'Cube' },
    { field: 'value', label: 'Invoice value' },
    { field: 'freightRateOut', label: 'Freight rate out' },
    { field: 'clearanceCharge', label: 'Clearance charge' },
    { field: 'arrivalClearanceCost', label: 'Arrival clearance cost' },
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
  if (data.containerShipment === "Container Shipment" && data.trailerNo) {
    const containerNo = data.trailerNo.replace(/\s/g, "");
    if (containerNo.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Container number must be exactly 11 characters with no spaces",
        path: ["trailerNo"],
      });
    }
  }
});

export function ExportShipmentForm({ onSubmit, onCancel, defaultValues }: ExportShipmentFormProps) {
  const { toast } = useToast()
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [isReceiverDialogOpen, setIsReceiverDialogOpen] = useState(false)
  const [pendingProofOfDelivery, setPendingProofOfDelivery] = useState<string[]>([])
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([])
  const [newHaulierEmail, setNewHaulierEmail] = useState("")
  const [newHaulierContactName, setNewHaulierContactName] = useState("")

  const form = useForm<InsertExportShipment>({
    resolver: zodResolver(exportShipmentFormSchema),
    defaultValues: {
      jobType: "export",
      status: "Awaiting Collection",
      receiverId: "",
      destinationCustomerId: "",
      jobContactName: "",
      jobContactEmail: "",
      customerReferenceNumber: "",
      bookingDate: format(new Date(), "yyyy-MM-dd"),
      collectionDate: "",
      dispatchDate: "",
      deliveryDate: "",
      deliveryReference: "",
      deliveryTimeNotes: "",
      proofOfDelivery: [],
      trailerNo: "",
      departureFrom: "",
      portOfArrival: "",
      incoterms: "",
      containerShipment: "",
      vesselName: "",
      exportClearanceAgent: "",
      arrivalClearanceAgent: "",
      supplier: "",
      consignee: "",
      value: "",
      numberOfPieces: "",
      packaging: "",
      goodsDescription: "",
      weight: "",
      cube: "",
      freightRateOut: "",
      clearanceCharge: "",
      arrivalClearanceCost: "",
      currency: "GBP",
      additionalCommodityCodes: 1,
      haulierName: "",
      haulierContactName: [],
      haulierEmail: [],
      haulierTelephone: "",
      haulierReference: "",
      deliveryAddress: "",
      clearanceType: "",
      collectionAddress: "",
      collectionContactName: "",
      collectionContactTelephone: "",
      collectionContactEmail: "",
      collectionReference: "",
      collectionNotes: "",
      additionalNotes: "",
      jobTags: [],
      attachments: [],
      expensesToChargeOut: [],
      additionalExpensesIn: [],
      ...defaultValues
    },
  })

  const receiverId = form.watch("receiverId")
  const destinationCustomerId = form.watch("destinationCustomerId")

  const { data: selectedReceiver } = useQuery<ExportReceiver>({
    queryKey: ["/api/export-receivers", receiverId],
    enabled: !!receiverId,
  })

  const { data: selectedCustomer } = useQuery<ExportCustomer>({
    queryKey: ["/api/export-customers", destinationCustomerId],
    enabled: !!destinationCustomerId,
  })

  const { data: hauliers } = useQuery<Haulier[]>({
    queryKey: ["/api/hauliers"],
  })

  const { data: shippingLines } = useQuery<ShippingLine[]>({
    queryKey: ["/api/shipping-lines"],
  })

  const createCustomerMutation = useMutation({
    mutationFn: async (data: InsertExportCustomer) => {
      const response = await apiRequest("POST", "/api/export-customers", data);
      return response.json() as Promise<ExportCustomer>;
    },
    onSuccess: async (newCustomer: ExportCustomer) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/export-customers"] })
      form.setValue("destinationCustomerId", newCustomer.id)
      setIsCustomerDialogOpen(false)
      toast({
        title: "Success",
        description: "Export customer created successfully",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create export customer",
        variant: "destructive",
      })
    },
  })

  const createReceiverMutation = useMutation({
    mutationFn: async (data: InsertExportReceiver) => {
      const response = await apiRequest("POST", "/api/export-receivers", data);
      return response.json() as Promise<ExportReceiver>;
    },
    onSuccess: async (newReceiver: ExportReceiver) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/export-receivers"] })
      form.setValue("receiverId", newReceiver.id)
      setIsReceiverDialogOpen(false)
      toast({
        title: "Success",
        description: "Export receiver created successfully",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create export receiver",
        variant: "destructive",
      })
    },
  })

  const exportClearanceAgent = form.watch("exportClearanceAgent")
  const arrivalClearanceAgent = form.watch("arrivalClearanceAgent")
  const containerShipment = form.watch("containerShipment")
  const dispatchDate = form.watch("dispatchDate")
  const status = form.watch("status")
  const additionalCommodityCodes = form.watch("additionalCommodityCodes")
  const haulierEmails = form.watch("haulierEmail") || []
  const haulierContactNames = form.watch("haulierContactName") || []

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

  // Auto-populate Job Contact Name and Email when customer is selected (only for new shipments)
  useEffect(() => {
    if (selectedCustomer && !defaultValues?.jobContactName && !defaultValues?.jobContactEmail) {
      // Prioritize agent contact name if available, otherwise use contact name
      if (selectedCustomer.agentContactName && selectedCustomer.agentContactName.length > 0) {
        form.setValue("jobContactName", selectedCustomer.agentContactName[0])
      } else if (selectedCustomer.contactName && selectedCustomer.contactName.length > 0) {
        form.setValue("jobContactName", selectedCustomer.contactName[0])
      }

      // Prioritize agent email if agent name is present, otherwise use contact email
      if (selectedCustomer.agentName && selectedCustomer.agentEmail && selectedCustomer.agentEmail.length > 0) {
        form.setValue("jobContactEmail", selectedCustomer.agentEmail[0])
      } else if (selectedCustomer.email && selectedCustomer.email.length > 0) {
        form.setValue("jobContactEmail", selectedCustomer.email[0])
      }
    }
  }, [selectedCustomer, defaultValues?.jobContactName, defaultValues?.jobContactEmail, form])

  useEffect(() => {
    if (dispatchDate && status === "Awaiting Collection") {
      const today = format(new Date(), "yyyy-MM-dd")
      if (today > dispatchDate) {
        form.setValue("status", "Dispatched")
      }
    }
  }, [dispatchDate, status, form])

  useEffect(() => {
    if (selectedReceiver) {
      const addressParts = [
        selectedReceiver.address,
        selectedReceiver.country
      ].filter(part => part && part.trim() !== "")
      
      const fullAddress = addressParts.join(", ")
      form.setValue("deliveryAddress", fullAddress)
    }
  }, [selectedReceiver, form])

  useEffect(() => {
    if (additionalCommodityCodes && additionalCommodityCodes > 1) {
      const currentCharge = form.getValues("additionalCommodityCodeCharge")
      if (!currentCharge || currentCharge === "") {
        form.setValue("additionalCommodityCodeCharge", "5")
      }
    }
  }, [additionalCommodityCodes, form])

  const handleFormSubmit = async (data: InsertExportShipment) => {
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
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to normalize proof of delivery files",
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
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to normalize attachment files",
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
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="destinationCustomerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Export Customer</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <ContactCombobox
                          type="export-customer"
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select export customer"
                          className="flex-1"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsCustomerDialogOpen(true)}
                        data-testid="button-create-export-customer"
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-job-contact-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobContactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Contact Email</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-job-contact-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="receiverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Export Receiver</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <ContactCombobox
                          type="export-receiver"
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select export receiver"
                          className="flex-1"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsReceiverDialogOpen(true)}
                        data-testid="button-create-export-receiver"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

                <FormField
                  control={form.control}
                  name="trailerNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {containerShipment === "Air Freight" 
                          ? "Flight Number" 
                          : containerShipment === "Container Shipment" 
                            ? "Container Number" 
                            : "Trailer No"}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-trailer-no" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departureFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure From</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-departure-from" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="portOfArrival"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {containerShipment === "Road Shipment" 
                          ? "Destination" 
                          : containerShipment === "Air Freight" 
                            ? "Airport Name" 
                            : "Port of Arrival"}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-port-of-arrival" />
                      </FormControl>
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
                              {field.value ? format(new Date(field.value), "dd/MM/yy") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
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
                                {field.value ? format(new Date(field.value), "dd/MM/yy") : <span>Pick a date</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
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
                                {field.value ? format(new Date(field.value), "dd/MM/yy") : <span>Pick a date</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
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
                  name="etaPortDate"
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
                                data-testid="button-eta-port-date"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(new Date(field.value), "dd/MM/yy") : <span>Pick a date</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
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
                            data-testid="button-clear-eta-port-date"
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
                  name="deliveryTimeNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Time/Notes</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-delivery-time-notes" />
                      </FormControl>
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

              {status === "Completed" && (
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cargo Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="numberOfPieces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Pieces</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-number-of-pieces" />
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
                      <FormLabel>Invoice Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "GBP"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-invoice-currency">
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
                  name="value"
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clearance Agents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="exportClearanceAgent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Export Clearance Agent</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-export-clearance-agent">
                            <SelectValue placeholder="Select agent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Customer">Customer</SelectItem>
                          <SelectItem value="R.S">R.S</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="arrivalClearanceAgent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Clearance Agent</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-arrival-clearance-agent">
                            <SelectValue placeholder="Select agent" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Haulier">Haulier</SelectItem>
                          <SelectItem value="Customer">Customer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                      <FormLabel>Currency</FormLabel>
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

                {exportClearanceAgent === "R.S" && (
                  <FormField
                    control={form.control}
                    name="clearanceCharge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Export Clearance Charge</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-clearance-charge" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {arrivalClearanceAgent === "Haulier" && (
                  <FormField
                    control={form.control}
                    name="arrivalClearanceCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arrival Clearance Cost</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-arrival-clearance-cost" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {exportClearanceAgent === "R.S" && (
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
                            <SelectItem value="T1">T1</SelectItem>
                            <SelectItem value="Import">Import</SelectItem>
                            <SelectItem value="Export">Export</SelectItem>
                            <SelectItem value="Export Accompanied">Export Accompanied</SelectItem>
                            <SelectItem value="Simplified Frontier / T1">Simplified Frontier / T1</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(exportClearanceAgent === "R.S" || (exportClearanceAgent && arrivalClearanceAgent && !((exportClearanceAgent === "N/A" || exportClearanceAgent === "Customer") && arrivalClearanceAgent === "Customer"))) && (
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

                {(exportClearanceAgent === "R.S" || (exportClearanceAgent && arrivalClearanceAgent && !((exportClearanceAgent === "N/A" || exportClearanceAgent === "Customer") && arrivalClearanceAgent === "Customer"))) && additionalCommodityCodes && additionalCommodityCodes > 1 && (
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
                                newExpenses[index] = { ...newExpenses[index], description: e.target.value };
                                field.onChange(newExpenses);
                              }}
                              placeholder="Description"
                              data-testid={`input-expense-out-description-${index}`}
                              className="flex-1"
                            />
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                              <Input
                                value={expense.amount}
                                onChange={(e) => {
                                  const newExpenses = [...(field.value || [])] as Array<{ description: string; amount: string }>;
                                  newExpenses[index] = { ...newExpenses[index], amount: e.target.value };
                                  field.onChange(newExpenses);
                                }}
                                placeholder="Amount"
                                data-testid={`input-expense-out-amount-${index}`}
                                className="pl-7"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const newExpenses = ((field.value || []) as Array<{ description: string; amount: string }>).filter((_, i) => i !== index);
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
                            const newExpenses = [...((field.value || []) as Array<{ description: string; amount: string }>), { description: "", amount: "" }];
                            field.onChange(newExpenses);
                          }}
                          data-testid="button-add-expense-out"
                          className="w-full"
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
                        <FormLabel>Currency</FormLabel>
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

                  {exportClearanceAgent === "R.S" && (
                    <FormField
                      control={form.control}
                      name="exportClearanceChargeIn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Export Clearance Charge In</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-export-clearance-charge-in" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {arrivalClearanceAgent === "Haulier" && (
                    <FormField
                      control={form.control}
                      name="destinationClearanceCostIn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destination Clearance Cost In</FormLabel>
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
                                  newExpenses[index] = { ...newExpenses[index], description: e.target.value };
                                  field.onChange(newExpenses);
                                }}
                                placeholder="Description"
                                data-testid={`input-expense-in-description-${index}`}
                                className="flex-1"
                              />
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                                <Input
                                  value={expense.amount}
                                  onChange={(e) => {
                                    const newExpenses = [...(field.value || [])] as Array<{ description: string; amount: string }>;
                                    newExpenses[index] = { ...newExpenses[index], amount: e.target.value };
                                    field.onChange(newExpenses);
                                  }}
                                  placeholder="Amount"
                                  data-testid={`input-expense-in-amount-${index}`}
                                  className="pl-7"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  const newExpenses = ((field.value || []) as Array<{ description: string; amount: string }>).filter((_, i) => i !== index);
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
                              const newExpenses = [...((field.value || []) as Array<{ description: string; amount: string }>), { description: "", amount: "" }];
                              field.onChange(newExpenses);
                            }}
                            data-testid="button-add-expense-in"
                            className="w-full"
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
                      <FormLabel>Reference</FormLabel>
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
                        dragDropLabel="Drop transport documents here or click to browse"
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="create-export-customer-description">
          <DialogHeader>
            <DialogTitle>Create Export Customer</DialogTitle>
            <DialogDescription id="create-export-customer-description">
              Add a new export customer to the system
            </DialogDescription>
          </DialogHeader>
          <ExportCustomerForm
            onSubmit={(data) => createCustomerMutation.mutate(data)}
            onCancel={() => setIsCustomerDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isReceiverDialogOpen} onOpenChange={setIsReceiverDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="create-receiver-description">
          <DialogHeader>
            <DialogTitle>Create Export Receiver</DialogTitle>
            <DialogDescription id="create-receiver-description">
              Add a new export receiver to the system
            </DialogDescription>
          </DialogHeader>
          <ExportReceiverForm
            onSubmit={(data) => createReceiverMutation.mutate(data)}
            onCancel={() => setIsReceiverDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Form>
  )
}
