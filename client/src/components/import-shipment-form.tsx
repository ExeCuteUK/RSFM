import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertImportShipmentSchema, type InsertImportShipment, type ImportCustomer, type InsertImportCustomer, type Haulier } from "@shared/schema"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { FileUpload, type FileMetadata } from "@/components/ui/file-upload"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, parseISO } from "date-fns"
import { CalendarIcon, Plus, FileText, X, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImportCustomerForm } from "./import-customer-form"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { InlineUploader } from "./InlineUploader"
import type { UploadResult } from "@uppy/core"

interface ImportShipmentFormProps {
  onSubmit: (data: InsertImportShipment) => void
  onCancel: () => void
  defaultValues?: Partial<InsertImportShipment>
}

export function ImportShipmentForm({ onSubmit, onCancel, defaultValues }: ImportShipmentFormProps) {
  const { toast } = useToast()
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [pendingProofOfDelivery, setPendingProofOfDelivery] = useState<string[]>([])
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([])

  const form = useForm<InsertImportShipment>({
    resolver: zodResolver(insertImportShipmentSchema),
    defaultValues: {
      jobType: "import",
      status: "Pending",
      importCustomerId: "",
      bookingDate: defaultValues?.bookingDate || format(new Date(), "yyyy-MM-dd"),
      approxLoadDate: "",
      dispatchDate: "",
      deliveryDate: "",
      deliveryReference: "",
      deliveryTimeNotes: "",
      proofOfDelivery: [],
      importDateEtaPort: "",
      portOfArrival: "",
      trailerOrContainerNumber: "",
      departureCountry: "",
      containerShipment: "",
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
      clearanceCharge: "",
      currency: "",
      additionalCommodityCodes: 1,
      haulierName: "",
      haulierContactName: "",
      vatZeroRated: false,
      clearanceType: "",
      customsClearanceAgent: "",
      rsToClear: false,
      customerReferenceNumber: "",
      deliveryAddress: "",
      supplierName: "",
      additionalNotes: "",
      jobTags: [],
      attachments: [],
      ...defaultValues
    },
  })

  const { data: importCustomers } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })

  const { data: hauliers } = useQuery<Haulier[]>({
    queryKey: ["/api/hauliers"],
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

  const selectedCustomerId = form.watch("importCustomerId")
  const rsToClear = form.watch("rsToClear")
  const containerShipment = form.watch("containerShipment")
  const status = form.watch("status")

  useEffect(() => {
    if (selectedCustomerId && importCustomers) {
      const customer = importCustomers.find(c => c.id === selectedCustomerId)
      if (customer) {
        form.setValue("rsToClear", customer.rsProcessCustomsClearance ?? false)
        form.setValue("customsClearanceAgent", customer.agentInDover || "")
        form.setValue("deliveryAddress", customer.defaultDeliveryAddress || "")
        form.setValue("supplierName", customer.defaultSuppliersName || "")
      }
    }
  }, [selectedCustomerId, importCustomers, form])

  const handleFormSubmit = async (data: InsertImportShipment) => {
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-import-customer" className="flex-1">
                            <SelectValue placeholder="Select import customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {importCustomers?.map((customer) => (
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
                        data-testid="button-create-customer"
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

                {status === "Delivered" && (
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
                              <SelectItem value="Corbion">Corbion</SelectItem>
                              <SelectItem value="Cosco">Cosco</SelectItem>
                              <SelectItem value="Hapag Lloyd">Hapag Lloyd</SelectItem>
                              <SelectItem value="Maersk">Maersk</SelectItem>
                              <SelectItem value="MSC">MSC</SelectItem>
                              <SelectItem value="Newport">Newport</SelectItem>
                              <SelectItem value="ONE Line">ONE Line</SelectItem>
                              <SelectItem value="OOCL">OOCL</SelectItem>
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
                        <FormLabel>Delivery Release</FormLabel>
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

              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="importDateEtaPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ETA Port</FormLabel>
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
              </div>
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
              <CardTitle>Customs &amp; Clearance</CardTitle>
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

                  {rsToClear && (
                    <FormField
                      control={form.control}
                      name="exportClearanceChargeIn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departure Export Clearance Charge In</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-export-clearance-charge-in" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

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
                </div>
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
                        maxNumberOfFiles={10}
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
                        note="Drag and drop files here (up to 10 files, 20MB each)"
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
            <DialogTitle>Create New Import Customer</DialogTitle>
            <DialogDescription>
              Add a new import customer to the system. The customer will be automatically selected after creation.
            </DialogDescription>
          </DialogHeader>
          <ImportCustomerForm
            onSubmit={(data) => createCustomerMutation.mutate(data)}
            onCancel={() => setIsCustomerDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Form>
  )
}
