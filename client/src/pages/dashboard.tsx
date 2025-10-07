import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQuery } from "@tanstack/react-query"
import { type ImportShipment, type ExportShipment, type CustomClearance, type ImportCustomer } from "@shared/schema"
import { Container, Package, Clipboard, FileText } from "lucide-react"
import { useState } from "react"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("container-management")

  const { data: importShipments = [] } = useQuery<ImportShipment[]>({
    queryKey: ["/api/import-shipments"],
  })

  const { data: exportShipments = [] } = useQuery<ExportShipment[]>({
    queryKey: ["/api/export-shipments"],
  })

  const { data: customClearances = [] } = useQuery<CustomClearance[]>({
    queryKey: ["/api/custom-clearances"],
  })

  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })

  // Filter container shipments
  const containerShipments = importShipments.filter(
    (s) => s.containerShipment === "Container Shipment"
  )

  // Helper to get customer name
  const getCustomerName = (customerId: string | null): string => {
    if (!customerId) return ""
    const customer = importCustomers.find((c) => c.id === customerId)
    return customer?.companyName || ""
  }

  // Helper to get linked clearance for a job
  const getLinkedClearance = (jobRef: number): CustomClearance | undefined => {
    return customClearances.find((c) => c.jobRef === jobRef)
  }

  // Helper to determine cell background color based on clearance status
  const getClearanceStatusColor = (jobRef: number): string => {
    const clearance = getLinkedClearance(jobRef)
    if (!clearance) return "bg-yellow-100 dark:bg-yellow-900"
    
    const status = clearance.status
    if (["Waiting Arrival", "P.H Hold", "Customs Issue", "Fully Cleared"].includes(status)) {
      return "bg-green-100 dark:bg-green-900"
    }
    if (status === "Request CC") {
      return "bg-yellow-100 dark:bg-yellow-900"
    }
    return "bg-yellow-100 dark:bg-yellow-900"
  }

  // Helper to get delivery booked color
  const getDeliveryBookedColor = (indicator: number | null): string => {
    if (indicator === 2) return "bg-green-100 dark:bg-green-900"
    if (indicator === 3) return "bg-orange-100 dark:bg-orange-900"
    return "bg-yellow-100 dark:bg-yellow-900"
  }

  // Helper to get container release color
  const getContainerReleaseColor = (indicator: number | null): string => {
    if (indicator === 2) return "bg-green-100 dark:bg-green-900"
    if (indicator === 3) return "bg-orange-100 dark:bg-orange-900"
    return "bg-yellow-100 dark:bg-yellow-900"
  }

  // Helper to get delivery address color
  const getDeliveryAddressColor = (address: string | null): string => {
    if (address && address.trim().length > 0) {
      return "bg-green-100 dark:bg-green-900"
    }
    return "bg-yellow-100 dark:bg-yellow-900"
  }

  // Helper to get invoice status color
  const getInvoiceStatusColor = (indicator: number | null): string => {
    if (indicator === 2) return "bg-green-100 dark:bg-green-900"
    return "bg-yellow-100 dark:bg-yellow-900"
  }

  // Helper to format date
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return ""
    try {
      const date = new Date(dateStr)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = String(date.getFullYear()).slice(-2)
      return `${day}/${month}/${year}`
    } catch {
      return ""
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your freight operations.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="container-management" data-testid="tab-container-management">
            <Container className="h-4 w-4 mr-2" />
            Container Management
          </TabsTrigger>
          <TabsTrigger value="nisbets" data-testid="tab-nisbets">
            <Package className="h-4 w-4 mr-2" />
            Nisbets
          </TabsTrigger>
          <TabsTrigger value="import-export-work" data-testid="tab-import-export">
            <FileText className="h-4 w-4 mr-2" />
            Import/Export Work
          </TabsTrigger>
          <TabsTrigger value="clearance-work" data-testid="tab-clearance">
            <Clipboard className="h-4 w-4 mr-2" />
            Clearance Work
          </TabsTrigger>
        </TabsList>

        <TabsContent value="container-management" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Container Management</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b-2">
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">RS REF</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">CONSIGNEE</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Container no.</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Ship Line</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">POA</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">VESSEL</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">ETA PORT</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">REFERENCES</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Delivery Date</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">RLS</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Delivery Address</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Rate In</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Rate Out</th>
                      <th className="p-1 text-center font-semibold bg-background">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {containerShipments.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="p-4 text-center text-muted-foreground">
                          No container shipments found
                        </td>
                      </tr>
                    ) : (
                      containerShipments.map((shipment) => {
                        const clearanceColor = getClearanceStatusColor(shipment.jobRef)
                        const deliveryBookedColor = getDeliveryBookedColor(shipment.deliveryBookedStatusIndicator)
                        const releaseColor = getContainerReleaseColor(shipment.containerReleaseStatusIndicator)
                        const addressColor = getDeliveryAddressColor(shipment.deliveryAddress)
                        const invoiceColor = getInvoiceStatusColor(shipment.invoiceCustomerStatusIndicator)

                        return (
                          <tr key={shipment.id} className="border-b-2 hover-elevate" data-testid={`row-container-${shipment.jobRef}`}>
                            <td className={`p-1 text-center border-r border-border ${clearanceColor}`} data-testid={`cell-ref-${shipment.jobRef}`}>
                              {shipment.jobRef}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${clearanceColor}`} data-testid={`cell-consignee-${shipment.jobRef}`}>
                              {getCustomerName(shipment.importCustomerId)}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${clearanceColor}`} data-testid={`cell-container-${shipment.jobRef}`}>
                              {shipment.trailerOrContainerNumber || ""}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${clearanceColor}`} data-testid={`cell-shipline-${shipment.jobRef}`}>
                              {shipment.shippingLine || ""}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${clearanceColor}`} data-testid={`cell-poa-${shipment.jobRef}`}>
                              {shipment.portOfArrival || ""}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${clearanceColor}`} data-testid={`cell-vessel-${shipment.jobRef}`}>
                              {shipment.vesselName || ""}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${clearanceColor}`} data-testid={`cell-eta-${shipment.jobRef}`}>
                              {formatDate(shipment.importDateEtaPort)}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${clearanceColor}`} data-testid={`cell-ref-${shipment.jobRef}`}>
                              {shipment.customerReferenceNumber || ""}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${deliveryBookedColor}`} data-testid={`cell-delivery-${shipment.jobRef}`}>
                              {formatDate(shipment.deliveryDate)}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${releaseColor}`} data-testid={`cell-rls-${shipment.jobRef}`}>
                              {shipment.deliveryRelease || ""}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${addressColor}`} data-testid={`cell-address-${shipment.jobRef}`}>
                              {shipment.deliveryAddress || ""}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${invoiceColor}`} data-testid={`cell-rate-in-${shipment.jobRef}`}>
                              {/* Rate In - blank for now */}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${invoiceColor}`} data-testid={`cell-rate-out-${shipment.jobRef}`}>
                              {/* Rate Out - blank for now */}
                            </td>
                            <td className={`p-1 text-center ${clearanceColor}`} data-testid={`cell-notes-${shipment.jobRef}`}>
                              {shipment.additionalNotes || ""}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nisbets" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Nisbets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Nisbets work view - coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import-export-work" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Import/Export Work</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Import/Export work view - coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clearance-work" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Clearance Work</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Clearance work view - coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
