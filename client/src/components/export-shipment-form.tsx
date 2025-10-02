import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertExportShipmentSchema, type InsertExportShipment, type ExportReceiver, type ExportCustomer, type InsertExportCustomer, type InsertExportReceiver, type Haulier } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Plus, Download, X, FileText } from "lucide-react"
import { InlineUploader } from "@/components/InlineUploader"
import type { UploadResult } from "@uppy/core"
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
import { useQuery, useMutation } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ExportCustomerForm } from "./export-customer-form"
import { ExportReceiverForm } from "./export-receiver-form"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

interface ExportShipmentFormProps {
  onSubmit: (data: InsertExportShipment) => void
  onCancel: () => void
  defaultValues?: Partial<InsertExportShipment>
}

export function ExportShipmentForm({ onSubmit, onCancel, defaultValues }: ExportShipmentFormProps) {
  const { toast } = useToast()
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [isReceiverDialogOpen, setIsReceiverDialogOpen] = useState(false)
  const [pendingProofOfDelivery, setPendingProofOfDelivery] = useState<string[]>([])
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([])

  const form = useForm<InsertExportShipment>({
    resolver: zodResolver(insertExportShipmentSchema),
    defaultValues: {
      jobType: "export",
      status: "Pending",
      receiverId: "",
      destinationCustomerId: "",
      customerReferenceNumber: "",
      bookingDate: format(new Date(), "yyyy-MM-dd"),
      approxLoadDate: "",
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
      haulierContactName: "",
      deliveryAddress: "",
      additionalNotes: "",
      jobTags: [],
      attachments: [],
      ...defaultValues
    },
  })

  const { data: exportReceivers } = useQuery<ExportReceiver[]>({
    queryKey: ["/api/export-receivers"],
  })

  const { data: exportCustomers } = useQuery<ExportCustomer[]>({
    queryKey: ["/api/export-customers"],
  })

  const { data: hauliers } = useQuery<Haulier[]>({
    queryKey: ["/api/hauliers"],
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
  const receiverId = form.watch("receiverId")

  useEffect(() => {
    if (dispatchDate && status === "Pending") {
      const today = format(new Date(), "yyyy-MM-dd")
      if (today > dispatchDate) {
        form.setValue("status", "In Transit")
      }
    }
  }, [dispatchDate, status, form])

  useEffect(() => {
    if (receiverId && exportReceivers) {
      const selectedReceiver = exportReceivers.find(r => r.id === receiverId)
      if (selectedReceiver) {
        const addressParts = [
          selectedReceiver.addressLine1,
          selectedReceiver.addressLine2,
          selectedReceiver.town,
          selectedReceiver.county,
          selectedReceiver.postcode,
          selectedReceiver.country
        ].filter(part => part && part.trim() !== "")
        
        const fullAddress = addressParts.join(", ")
        form.setValue("deliveryAddress", fullAddress)
      }
    }
  }, [receiverId, exportReceivers, form])

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-destination-customer" className="flex-1">
                            <SelectValue placeholder="Select export customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {exportCustomers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

              <FormField
                control={form.control}
                name="receiverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Export Receiver</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-receiver" className="flex-1">
                            <SelectValue placeholder="Select receiver" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {exportReceivers?.map((receiver) => (
                            <SelectItem key={receiver.id} value={receiver.id}>
                              {receiver.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Transit">In Transit</SelectItem>
                          <SelectItem value="Delivered">Delivered</SelectItem>
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
                      <FormLabel>Port of Arrival</FormLabel>
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
                  name="approxLoadDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approx Load Date</FormLabel>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Date</FormLabel>
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

              {status === "Delivered" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="proofOfDelivery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proof Of Delivery</FormLabel>
                        <div className="space-y-3">
                          <InlineUploader
                            maxNumberOfFiles={5}
                            maxFileSize={20 * 1024 * 1024}
                            height={100}
                            onGetUploadParameters={async () => {
                              const response = await fetch("/api/objects/upload", { method: "POST" });
                              const data = await response.json();
                              return { method: "PUT" as const, url: data.uploadURL };
                            }}
                            onComplete={(result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                              const uploadedUrls = result.successful?.map((file: any) => file.uploadURL) || [];
                              setPendingProofOfDelivery((prev) => [...prev, ...uploadedUrls]);
                            }}
                            note="Drag and drop proof of delivery files here (up to 5 files, 20MB each)"
                          />
                          
                          {(pendingProofOfDelivery.length > 0 || (field.value && field.value.length > 0)) && (
                            <div className="space-y-2">
                              {pendingProofOfDelivery.map((url, index) => (
                                <div key={`pending-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    <span className="text-sm">{url.split('/').pop()?.split('?')[0] || 'File'}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPendingProofOfDelivery((prev) => prev.filter((_, i) => i !== index))}
                                    data-testid={`button-remove-pending-pod-${index}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              {field.value && field.value.map((path: string, index: number) => (
                                <div key={`saved-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    <span className="text-sm">{path.split('/').pop() || 'File'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <a href={path} target="_blank" rel="noopener noreferrer">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        data-testid={`button-download-pod-${index}`}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </a>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const newFiles = field.value?.filter((_, i) => i !== index) || [];
                                        form.setValue('proofOfDelivery', newFiles);
                                      }}
                                      data-testid={`button-delete-pod-${index}`}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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
              <CardTitle>Rate Information</CardTitle>
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
                        <FormLabel>Clearance Charge Out</FormLabel>
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

                {exportClearanceAgent && arrivalClearanceAgent && !((exportClearanceAgent === "N/A" || exportClearanceAgent === "Customer") && arrivalClearanceAgent === "Customer") && (
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
              <CardTitle>Haulier Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="haulierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Haulier Name</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Haulier Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-haulier-contact-name" />
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
              <CardTitle>File Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-3">
                      <InlineUploader
                        maxNumberOfFiles={5}
                        maxFileSize={20 * 1024 * 1024}
                        onGetUploadParameters={async () => {
                          const response = await fetch("/api/objects/upload", { method: "POST" });
                          const data = await response.json();
                          return { method: "PUT" as const, url: data.uploadURL };
                        }}
                        onComplete={(result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                          const uploadedUrls = result.successful?.map((file: any) => file.uploadURL) || [];
                          setPendingAttachments((prev) => [...prev, ...uploadedUrls]);
                        }}
                        note="Drag and drop attachment files here (up to 5 files, 20MB each)"
                      />
                      
                      {(pendingAttachments.length > 0 || (field.value && field.value.length > 0)) && (
                        <div className="space-y-2">
                          {pendingAttachments.map((url, index) => (
                            <div key={`pending-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm">{url.split('/').pop()?.split('?')[0] || 'File'}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== index))}
                                data-testid={`button-remove-pending-attachment-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {field.value && field.value.map((path: string, index: number) => (
                            <div key={`saved-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm">{path.split('/').pop() || 'File'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <a href={path} target="_blank" rel="noopener noreferrer">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    data-testid={`button-download-attachment-${index}`}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </a>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newFiles = field.value?.filter((_, i) => i !== index) || [];
                                    form.setValue('attachments', newFiles);
                                  }}
                                  data-testid={`button-delete-attachment-${index}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Export Customer</DialogTitle>
            <DialogDescription>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Export Receiver</DialogTitle>
            <DialogDescription>
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
