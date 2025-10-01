import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertExportShipmentSchema, type InsertExportShipment, type ExportReceiver, type ExportCustomer } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { FileUpload, type FileMetadata } from "@/components/ui/file-upload"

interface ExportShipmentFormProps {
  onSubmit: (data: InsertExportShipment) => void
  onCancel: () => void
  defaultValues?: Partial<InsertExportShipment>
}

export function ExportShipmentForm({ onSubmit, onCancel, defaultValues }: ExportShipmentFormProps) {
  const form = useForm<InsertExportShipment>({
    resolver: zodResolver(insertExportShipmentSchema),
    defaultValues: {
      jobType: "export",
      status: "Pending",
      receiverId: "",
      destinationCustomerId: "",
      loadDate: "",
      trailerNo: "",
      jobReference: "",
      destination: "",
      incoterms: "",
      exportClearanceAgent: "",
      arrivalClearanceAgent: "",
      supplier: "",
      consignee: "",
      value: "",
      numPackages: "",
      packing: "",
      description: "",
      grossWeightKg: "",
      cbm: "",
      cargoWeight: "",
      freightRateOut: "",
      exportClearanceCost: "",
      arrivalClearanceCost: "",
      currency: "GBP",
      additionalCommodityCodes: undefined,
      haulierName: "",
      haulierContactName: "",
      attachments: "",
      ...defaultValues
    },
  })

  const { data: exportReceivers } = useQuery<ExportReceiver[]>({
    queryKey: ["/api/export-receivers"],
  })

  const { data: exportCustomers } = useQuery<ExportCustomer[]>({
    queryKey: ["/api/export-customers"],
  })

  const exportClearanceAgent = form.watch("exportClearanceAgent")
  const arrivalClearanceAgent = form.watch("arrivalClearanceAgent")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-destination-customer">
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receiver</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-receiver">
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
                  name="loadDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Load Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-load-date"
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
                  name="trailerNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trailer No</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-trailer-no" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Reference</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-job-reference" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-destination" />
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
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-incoterms" />
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
              <CardTitle>Cargo Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-supplier" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="consignee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consignee</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-consignee" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-value" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numPackages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel># Pkgs</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-num-packages" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="packing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Packing</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-packing" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="grossWeightKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GW Kg</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-gross-weight" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cbm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CBM</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-cbm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cargoWeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Crg Wt</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-cargo-weight" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-description" />
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
                    name="exportClearanceCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Export Clearance Cost</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-export-clearance-cost" />
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

                <FormField
                  control={form.control}
                  name="additionalCommodityCodes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Commodity Codes</FormLabel>
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
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-haulier-name" />
                      </FormControl>
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
              <CardTitle>File Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FileUpload
                        value={field.value ? JSON.parse(field.value) : []}
                        onChange={(files: FileMetadata[]) => {
                          field.onChange(JSON.stringify(files));
                        }}
                        testId="file-upload-attachments"
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
    </Form>
  )
}
