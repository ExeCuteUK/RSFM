import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertCustomClearanceSchema, type InsertCustomClearance, type ImportCustomer, type ExportCustomer, type ExportReceiver, type ClearanceAgent } from "@shared/schema"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { ObjectStorageUploader } from "@/components/ui/object-storage-uploader"
import { useJobFileGroup } from "@/hooks/use-job-file-group"
import { FileText, Download, X } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { ContactCombobox } from "@/components/ContactCombobox"
import { MRNConfirmationDialog } from "@/components/mrn-confirmation-dialog"

interface CustomClearanceFormProps {
  onSubmit: (data: InsertCustomClearance) => void
  onCancel: () => void
  defaultValues?: Partial<InsertCustomClearance> & { jobRef?: number }
}

// Validation helpers
const numericWithDecimalsRegex = /^(\d+\.?\d*|\.\d+)?$/;

const customClearanceFormSchema = insertCustomClearanceSchema.superRefine((data: any, ctx: z.RefinementCtx) => {
  // Numeric field validations
  const numericFields = [
    { field: 'weight', label: 'Weight' },
    { field: 'numberOfPieces', label: 'Number of pieces' },
    { field: 'cube', label: 'Cube' },
    { field: 'invoiceValue', label: 'Invoice value' },
    { field: 'transportCosts', label: 'Transport costs' },
    { field: 'clearanceCharge', label: 'Clearance charge' },
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

export function CustomClearanceForm({ onSubmit, onCancel, defaultValues }: CustomClearanceFormProps) {
  const { toast } = useToast()
  const [pendingTransportDocuments, setPendingTransportDocuments] = useState<string[]>([])
  const [pendingClearanceDocuments, setPendingClearanceDocuments] = useState<string[]>([])
  const [mrnDialogOpen, setMrnDialogOpen] = useState(false)
  const [extractedMRN, setExtractedMRN] = useState("")
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  
  const form = useForm<InsertCustomClearance>({
    resolver: zodResolver(customClearanceFormSchema),
    defaultValues: {
      jobType: "import",
      status: "Request CC",
      importCustomerId: "",
      exportCustomerId: "",
      receiverId: "",
      etaPort: "",
      portOfArrival: "",
      trailerOrContainerNumber: "",
      departureFrom: "",
      containerShipment: "",
      vesselName: "",
      numberOfPieces: "",
      packaging: "",
      weight: "",
      cube: "",
      goodsDescription: "",
      invoiceValue: "",
      transportCosts: "",
      clearanceCharge: "",
      currency: "",
      additionalCommodityCodes: 1,
      vatZeroRated: false,
      clearanceType: "",
      customerReferenceNumber: "",
      supplierName: "",
      createdFromType: "",
      createdFromId: "",
      additionalNotes: "",
      transportDocuments: [],
      clearanceDocuments: [],
      ...defaultValues
    },
  })

  const { data: importCustomers } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })

  const { data: exportCustomers } = useQuery<ExportCustomer[]>({
    queryKey: ["/api/export-customers"],
  })

  const { data: exportReceivers } = useQuery<ExportReceiver[]>({
    queryKey: ["/api/export-receivers"],
  })

  const { data: clearanceAgents = [] } = useQuery<ClearanceAgent[]>({
    queryKey: ["/api/clearance-agents"],
  })

  // Fetch shared documents from job_file_groups if this is an existing clearance
  const jobRef = defaultValues?.jobRef
  const { documents: sharedDocuments, isLoading: isLoadingSharedDocs } = useJobFileGroup({ 
    jobRef,
    enabled: !!jobRef 
  })

  const jobType = form.watch("jobType")
  const containerShipment = form.watch("containerShipment")

  const handleFormSubmit = (data: InsertCustomClearance) => {
    const normalizedTransportDocuments: string[] = [...(data.transportDocuments || [])];
    const normalizedClearanceDocuments: string[] = [...(data.clearanceDocuments || [])];

    if (pendingTransportDocuments.length > 0) {
      const cleanUrls = pendingTransportDocuments.map((url) => url.split("?")[0]);
      normalizedTransportDocuments.push(...cleanUrls);
    }

    if (pendingClearanceDocuments.length > 0) {
      const cleanUrls = pendingClearanceDocuments.map((url) => url.split("?")[0]);
      normalizedClearanceDocuments.push(...cleanUrls);
    }

    const finalData = {
      ...data,
      transportDocuments: normalizedTransportDocuments,
      clearanceDocuments: normalizedClearanceDocuments,
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

  const handleClearanceDocumentOCR = async (filePath: string) => {
    // Only process PDFs or images
    const fileExtension = filePath.toLowerCase().split('.').pop();
    const supportedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'];
    
    if (!supportedTypes.includes(fileExtension || '')) {
      return;
    }

    setIsProcessingOCR(true);
    
    // Show scanning notification
    toast({
      title: "Scanning Document",
      description: "Analyzing clearance document for MRN number...",
    });
    
    try {
      const response = await fetch('/api/objects/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectPath: filePath }),
      });

      if (!response.ok) {
        throw new Error('OCR failed');
      }

      const data = await response.json();
      
      if (data.mrnNumber) {
        // Show what was found
        toast({
          title: "MRN Number Detected",
          description: `Found MRN: ${data.mrnNumber}`,
        });
        setExtractedMRN(data.mrnNumber);
        setMrnDialogOpen(true);
      } else {
        // Show that scanning completed but no MRN found
        const textPreview = data.text ? data.text.substring(0, 100) + (data.text.length > 100 ? '...' : '') : 'No text found';
        toast({
          title: "Document Scanned",
          description: `No MRN number detected. Preview: ${textPreview}`,
        });
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast({
        title: "Scan Failed",
        description: "Could not scan document for MRN number",
        variant: "destructive",
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleConfirmMRN = () => {
    form.setValue('mrn', extractedMRN);
    setMrnDialogOpen(false);
    toast({
      title: "MRN Number Added",
      description: `MRN ${extractedMRN} has been added to the clearance`,
    });
  };

  const handleCancelMRN = () => {
    setMrnDialogOpen(false);
    setExtractedMRN("");
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
                name="jobType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-job-type">
                          <SelectValue placeholder="Select job type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="import">Import</SelectItem>
                        <SelectItem value="export">Export</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Request CC">Request CC</SelectItem>
                        <SelectItem value="Awaiting Entry">Awaiting Entry</SelectItem>
                        <SelectItem value="Awaiting Arrival">Awaiting Arrival</SelectItem>
                        <SelectItem value="P.H Hold">P.H Hold</SelectItem>
                        <SelectItem value="Customs Issue">Customs Issue</SelectItem>
                        <SelectItem value="Fully Cleared">Fully Cleared</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {jobType === "import" && (
                <FormField
                  control={form.control}
                  name="importCustomerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Import Customer</FormLabel>
                      <FormControl>
                        <ContactCombobox
                          type="import-customer"
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select import customer"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {jobType === "export" && (
                <>
                  <FormField
                    control={form.control}
                    name="exportCustomerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Export Customer</FormLabel>
                        <FormControl>
                          <ContactCombobox
                            type="export-customer"
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            placeholder="Select export customer"
                          />
                        </FormControl>
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
                        <FormControl>
                          <ContactCombobox
                            type="export-receiver"
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            placeholder="Select export receiver"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {jobType === "import" && (
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
              )}

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
                  name="etaPort"
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
                              data-testid="button-eta-port"
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

                {jobType === "export" ? (
                  <>
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
                      name="trailerOrContainerNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trailer / Container Number</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-trailer-container" />
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
                            <Input {...field} value={field.value || ""} data-testid="input-port-arrival" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
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
                          <FormLabel>Trailer / Container Number</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-trailer-container" />
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
                  </>
                )}

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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial Details</CardTitle>
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

                {jobType === "import" && (
                  <FormField
                    control={form.control}
                    name="transportCosts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transport Costs</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-transport-costs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="clearanceCharge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clearance Charge</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-clearance-charge" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
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
                            <SelectItem key={agent.id} value={agent.agentName}>
                              {agent.agentName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {jobType === "import" && (
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
                )}

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
              </div>

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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="Enter any additional notes or comments..."
                        className="min-h-[120px]"
                        data-testid="textarea-additional-notes" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Transport Documents {jobRef && <span className="text-sm font-normal text-muted-foreground">(Shared with Job #{jobRef})</span>}</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="transportDocuments"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="space-y-3">
                          <ObjectStorageUploader
                            value={field.value || []}
                            onChange={field.onChange}
                            pendingFiles={pendingTransportDocuments}
                            onPendingFilesChange={setPendingTransportDocuments}
                            maxFiles={10}
                            testId="transport-docs-uploader"
                            label="Transport Documents:"
                            dragDropLabel="Drop transport documents here or click to browse"
                          />
                          
                          {/* Display shared documents from job_file_groups */}
                          {jobRef && sharedDocuments && sharedDocuments.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">Shared Transport Documents:</p>
                              {sharedDocuments.map((path: string, index: number) => {
                                const downloadPath = path.startsWith('/') ? path : `/objects/${path}`;
                                return (
                                  <div key={`shared-${index}`} className="flex items-center justify-between p-2 border rounded-md bg-blue-50 dark:bg-blue-950">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                      <span className="text-sm">{path.split('/').pop() || 'File'}</span>
                                    </div>
                                    <a href={downloadPath} target="_blank" rel="noopener noreferrer">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        data-testid={`button-download-shared-transport-${index}`}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {isLoadingSharedDocs && jobRef && (
                            <p className="text-sm text-muted-foreground">Loading shared documents...</p>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clearance Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="clearanceDocuments"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ObjectStorageUploader
                          value={field.value || []}
                          onChange={field.onChange}
                          pendingFiles={pendingClearanceDocuments}
                          onPendingFilesChange={(newPendingFiles) => {
                            // Trigger OCR on newly uploaded files
                            if (newPendingFiles.length > pendingClearanceDocuments.length) {
                              const newFile = newPendingFiles[newPendingFiles.length - 1]
                              handleClearanceDocumentOCR(newFile)
                            }
                            setPendingClearanceDocuments(newPendingFiles)
                          }}
                          maxFiles={10}
                          testId="clearance-docs-uploader"
                          label="Clearance Documents:"
                          dragDropLabel="Drop clearance documents here or click to browse"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
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

      <MRNConfirmationDialog
        open={mrnDialogOpen}
        onOpenChange={setMrnDialogOpen}
        mrnNumber={extractedMRN}
        onConfirm={handleConfirmMRN}
        onCancel={handleCancelMRN}
      />
    </Form>
  )
}
