import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQuery } from "@tanstack/react-query"
import { type ImportShipment, type ExportShipment, type CustomClearance, type ImportCustomer } from "@shared/schema"
import { Container, Package, Clipboard, FileText, Search } from "lucide-react"
import { useState } from "react"
import { useLocation } from "wouter"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("container-management")
  const [searchText, setSearchText] = useState("")
  const [jobStatusFilter, setJobStatusFilter] = useState<("active" | "completed")[]>(["active", "completed"])
  const [, setLocation] = useLocation()

  const { data: importShipments = [] } = useQuery<ImportShipment[]>({
    queryKey: ["/api/import-shipments"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })

  const { data: exportShipments = [] } = useQuery<ExportShipment[]>({
    queryKey: ["/api/export-shipments"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })

  const { data: customClearances = [] } = useQuery<CustomClearance[]>({
    queryKey: ["/api/custom-clearances"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })

  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
    refetchOnWindowFocus: true,
  })

  // Toggle job status filter
  const toggleJobStatusFilter = (status: "active" | "completed") => {
    if (jobStatusFilter.includes(status)) {
      // Don't allow deselecting if it's the only one selected
      if (jobStatusFilter.length > 1) {
        setJobStatusFilter(jobStatusFilter.filter(s => s !== status))
      }
    } else {
      setJobStatusFilter([...jobStatusFilter, status])
    }
  }

  // Filter container shipments
  const containerShipments = importShipments
    .filter((s) => s.containerShipment === "Container Shipment")
    // Apply job status filter
    .filter((s) => {
      const isCompleted = s.status === "Delivered"
      const isActive = s.status !== "Delivered"
      
      if (jobStatusFilter.includes("active") && jobStatusFilter.includes("completed")) return true
      if (jobStatusFilter.includes("active") && isActive) return true
      if (jobStatusFilter.includes("completed") && isCompleted) return true
      return false
    })
    // Apply search filter
    .filter((s) => {
      if (!searchText.trim()) return true
      const search = searchText.toLowerCase()
      const customerName = getCustomerName(s.importCustomerId).toLowerCase()
      return (
        s.jobRef?.toString().includes(search) ||
        customerName.includes(search) ||
        s.vesselName?.toLowerCase().includes(search) ||
        s.trailerOrContainerNumber?.toLowerCase().includes(search) ||
        s.customerReferenceNumber?.toLowerCase().includes(search)
      )
    })

  // Helper to get customer name
  const getCustomerName = (customerId: string | null): string => {
    if (!customerId) return ""
    const customer = importCustomers.find((c) => c.id === customerId)
    return customer?.companyName || ""
  }

  // Format time to 12-hour clock with AM/PM
  const formatTime12Hour = (time: string | null): string => {
    if (!time) return ""
    
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Helper to get linked clearance for a job
  const getLinkedClearance = (jobRef: number): CustomClearance | undefined => {
    return customClearances.find((c) => c.jobRef === jobRef)
  }

  // Helper to determine cell background color based on clearance status
  const getClearanceStatusColor = (shipment: ImportShipment): string => {
    const adviseStatus = (shipment as any).adviseClearanceToAgentStatusIndicator
    
    // Check if Advise Clearance to Agent status is completed (green)
    if (adviseStatus === 3) {
      return "bg-green-100 dark:bg-green-900"
    }
    
    const clearance = getLinkedClearance(shipment.jobRef)
    if (!clearance) return "bg-yellow-200 dark:bg-yellow-800"
    
    const status = clearance.status
    if (["Awaiting Entry", "Awaiting Arrival", "P.H Hold", "Customs Issue", "Fully Cleared"].includes(status)) {
      return "bg-green-100 dark:bg-green-900"
    }
    if (status === "Request CC") {
      return "bg-yellow-200 dark:bg-yellow-800"
    }
    return "bg-yellow-200 dark:bg-yellow-800"
  }

  // Helper to get delivery booked color
  const getDeliveryBookedColor = (indicator: number | null): string => {
    if (indicator === 3) return "bg-green-100 dark:bg-green-900"
    if (indicator === 2) return "bg-orange-300 dark:bg-orange-700"
    return "bg-yellow-200 dark:bg-yellow-800"
  }

  // Helper to get container release color
  const getContainerReleaseColor = (indicator: number | null): string => {
    if (indicator === 3) return "bg-green-100 dark:bg-green-900"
    if (indicator === 2) return "bg-orange-300 dark:bg-orange-700"
    return "bg-yellow-200 dark:bg-yellow-800"
  }

  // Helper to get delivery address color
  const getDeliveryAddressColor = (address: string | null): string => {
    if (address && address.trim().length > 0) {
      return "bg-green-100 dark:bg-green-900"
    }
    return "bg-yellow-200 dark:bg-yellow-800"
  }

  // Helper to get invoice status color
  const getInvoiceStatusColor = (indicator: number | null): string => {
    if (indicator === 3) return "bg-green-100 dark:bg-green-900"
    return "bg-yellow-200 dark:bg-yellow-800"
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
            <CardContent className="space-y-4">
              {/* Search and Filter Bar */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by job ref, customer, vessel, container, or BL number..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-container"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={jobStatusFilter.includes("active") ? "default" : "outline"}
                    onClick={() => toggleJobStatusFilter("active")}
                    data-testid="button-filter-active"
                  >
                    Active Jobs
                  </Button>
                  <Button
                    variant={jobStatusFilter.includes("completed") ? "default" : "outline"}
                    onClick={() => toggleJobStatusFilter("completed")}
                    data-testid="button-filter-completed"
                  >
                    Completed Jobs
                  </Button>
                </div>
              </div>

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
                        const clearanceColor = getClearanceStatusColor(shipment)
                        const deliveryBookedColor = getDeliveryBookedColor(shipment.deliveryBookedStatusIndicator)
                        const releaseColor = getContainerReleaseColor(shipment.containerReleaseStatusIndicator)
                        const addressColor = getDeliveryAddressColor(shipment.deliveryAddress)
                        const invoiceColor = getInvoiceStatusColor(shipment.invoiceCustomerStatusIndicator)

                        return (
                          <tr key={shipment.id} className="border-b-2 hover-elevate" data-testid={`row-container-${shipment.jobRef}`}>
                            <td className={`p-1 text-center border-r border-border ${clearanceColor}`} data-testid={`cell-ref-${shipment.jobRef}`}>
                              <button
                                onClick={() => setLocation(`/import-shipments?search=${shipment.jobRef}`)}
                                className="text-primary hover:underline font-semibold"
                                data-testid={`link-job-${shipment.jobRef}`}
                              >
                                {shipment.jobRef}
                              </button>
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
                            <td className={`p-1 text-center border-r border-border whitespace-nowrap ${deliveryBookedColor}`} data-testid={`cell-delivery-${shipment.jobRef}`}>
                              {shipment.deliveryDate ? `${formatDate(shipment.deliveryDate)}${shipment.deliveryTime ? ` @ ${formatTime12Hour(shipment.deliveryTime)}` : ''}` : ''}
                            </td>
                            <td className={`p-1 text-center border-r border-border font-bold ${releaseColor}`} data-testid={`cell-rls-${shipment.jobRef}`}>
                              {shipment.deliveryRelease || ""}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${addressColor}`} data-testid={`cell-address-${shipment.jobRef}`}>
                              {shipment.deliveryAddress || ""}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${invoiceColor}`} data-testid={`cell-rate-in-${shipment.jobRef}`}>
                              {shipment.haulierFreightRateIn ? `£${shipment.haulierFreightRateIn}` : ""}
                            </td>
                            <td className={`p-1 text-center border-r border-border ${invoiceColor}`} data-testid={`cell-rate-out-${shipment.jobRef}`}>
                              {shipment.freightRateOut ? `£${shipment.freightRateOut}` : ""}
                            </td>
                            <td className="p-1 text-center bg-green-100 dark:bg-green-900" data-testid={`cell-notes-${shipment.jobRef}`}>
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
