import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertImportShipmentSchema, type InsertImportShipment, type ImportCustomer } from "@shared/schema"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"

interface ImportShipmentFormProps {
  onSubmit: (data: InsertImportShipment) => void
  onCancel: () => void
  defaultValues?: Partial<InsertImportShipment>
}

export function ImportShipmentForm({ onSubmit, onCancel, defaultValues }: ImportShipmentFormProps) {
  const form = useForm<InsertImportShipment>({
    resolver: zodResolver(insertImportShipmentSchema),
    defaultValues: {
      jobType: "import",
      importCustomerId: "",
      importDateEtaPort: "",
      portOfArrival: "",
      trailerOrContainerNumber: "",
      departureFrom: "",
      containerShipment: false,
      vesselName: "",
      numberOfPieces: "",
      packaging: "",
      weight: "",
      cube: "",
      goodsDescription: "",
      invoiceValue: "",
      freightCharge: "",
      clearanceCharge: "",
      currency: "",
      vatZeroRated: false,
      c21InvLink: false,
      deliveryOrder: "",
      customsClearanceAgent: "",
      rsToClear: false,
      customerReferenceNumber: "",
      deliveryAddress: "",
      supplierName: "",
      ...defaultValues
    },
  })

  const { data: importCustomers } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })

  const selectedCustomerId = form.watch("importCustomerId")

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-import-customer">
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
                  name="importDateEtaPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Import Date / ETA Port</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-import-date" />
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
                  name="containerShipment"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-container-shipment"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Container Shipment</FormLabel>
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

                <FormField
                  control={form.control}
                  name="freightCharge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Freight Charge</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-freight-charge" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customs &amp; Clearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                name="deliveryOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Order</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-delivery-order" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

                <FormField
                  control={form.control}
                  name="c21InvLink"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-c21-inv-link"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">C21 Inv Link</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
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
