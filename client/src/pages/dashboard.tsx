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

  // Helper to get linked clearance for a job
  const getLinkedClearance = (jobRef: number): CustomClearance | undefined => {
    return customClearances.find((c) => c.jobRef === jobRef)
  }

  // Helper to check if entire row is green (completed)
  const isRowFullyGreen = (shipment: ImportShipment): boolean => {
    const adviseStatus = (shipment as any).adviseClearanceToAgentStatusIndicator
    
    // Check clearance status (columns A-H)
    let clearanceIsGreen = false
    if (adviseStatus === 3) {
      clearanceIsGreen = true
    } else {
      const clearance = getLinkedClearance(shipment.jobRef)
      if (clearance && ["Awaiting Entry", "Awaiting Arrival", "P.H Hold", "Customs Issue", "Fully Cleared"].includes(clearance.status)) {
        clearanceIsGreen = true
      }
    }
    
    // Check all other status indicators
    const deliveryBookedIsGreen = shipment.deliveryBookedStatusIndicator === 3
    const containerReleaseIsGreen = shipment.containerReleaseStatusIndicator === 3
    const addressIsGreen = !!(shipment.deliveryAddress && shipment.deliveryAddress.trim().length > 0)
    const invoiceIsGreen = shipment.invoiceCustomerStatusIndicator === 3
    
    // All must be green for row to be completed
    return clearanceIsGreen && deliveryBookedIsGreen && containerReleaseIsGreen && addressIsGreen && invoiceIsGreen
  }

  // Filter container shipments
  const containerShipments = importShipments
    .filter((s) => s.containerShipment === "Container Shipment")
    // Apply job status filter
    .filter((s) => {
      const isCompleted = isRowFullyGreen(s)
      const isActive = !isRowFullyGreen(s)
      
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
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Ref</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Consignee</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Container no.</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Ship Line</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Poa</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Vessel</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Eta Port</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">References</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Delivery Date</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Rls</th>
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
                          <tr key={shipment.id} className="border-b-2 hover-elevate h-auto" data-testid={`row-container-${shipment.jobRef}`}>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-ref-${shipment.jobRef}`}>
                              <button
                                onClick={() => setLocation(`/import-shipments?search=${shipment.jobRef}`)}
                                className="text-primary hover:underline font-semibold"
                                data-testid={`link-job-${shipment.jobRef}`}
                              >
                                {shipment.jobRef}
                              </button>
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-consignee-${shipment.jobRef}`}>
                              {getCustomerName(shipment.importCustomerId)}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-container-${shipment.jobRef}`}>
                              {shipment.trailerOrContainerNumber || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-shipline-${shipment.jobRef}`}>
                              {shipment.shippingLine || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-poa-${shipment.jobRef}`}>
                              {shipment.portOfArrival || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-vessel-${shipment.jobRef}`}>
                              {shipment.vesselName || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-eta-${shipment.jobRef}`}>
                              {formatDate(shipment.importDateEtaPort)}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-ref-${shipment.jobRef}`}>
                              {shipment.customerReferenceNumber || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle whitespace-nowrap ${deliveryBookedColor}`} data-testid={`cell-delivery-${shipment.jobRef}`}>
                              {shipment.deliveryDate ? `${formatDate(shipment.deliveryDate)}${shipment.deliveryTime ? ` @ ${formatTime12Hour(shipment.deliveryTime)}` : ''}` : ''}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle font-bold ${releaseColor}`} data-testid={`cell-rls-${shipment.jobRef}`}>
                              {shipment.deliveryRelease || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${addressColor}`} data-testid={`cell-address-${shipment.jobRef}`}>
                              {shipment.deliveryAddress || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${invoiceColor}`} data-testid={`cell-rate-in-${shipment.jobRef}`}>
                              {shipment.haulierFreightRateIn ? `£${shipment.haulierFreightRateIn}` : ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${invoiceColor}`} data-testid={`cell-rate-out-${shipment.jobRef}`}>
                              {shipment.freightRateOut ? `£${shipment.freightRateOut}` : ""}
                            </td>
                            <td className="px-1 text-left align-top whitespace-pre-wrap bg-green-100 dark:bg-green-900" data-testid={`cell-notes-${shipment.jobRef}`}>
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
              <CardTitle>Nisbets Shipment Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by job ref, Ligentia ref, haulier, supplier, truck number..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-nisbets"
                  />
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b-2">
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Ref</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Ligentia Ref</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Haulier</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Supplier</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Country</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Destination</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Date of Collection</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Departure Date</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Truck Number</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Port</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Eta Uk Port</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Total Package</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Weight</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Details Sent to Ligentia</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Entry to Haulier</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Delivery Booked Date</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background w-32">Price Out</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Pod Sent</th>
                      <th className="p-1 text-center font-semibold bg-background w-32">Net Cost</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {(() => {
                      // Find Nisbets PLC customer ID
                      const nisbetsCustomer = importCustomers.find(c => c.companyName === "Nisbets PLC")
                      
                      // Filter for Road Shipment jobs with Nisbets PLC customer
                      const nisbetsShipments = importShipments
                        .filter(s => s.containerShipment === "Road Shipment" && s.importCustomerId === nisbetsCustomer?.id)
                        .filter(s => {
                          if (!searchText.trim()) return true
                          const search = searchText.toLowerCase()
                          return (
                            s.jobRef?.toString().includes(search) ||
                            s.customerReferenceNumber?.toLowerCase().includes(search) ||
                            s.haulierName?.toLowerCase().includes(search) ||
                            s.supplierName?.toLowerCase().includes(search) ||
                            s.trailerOrContainerNumber?.toLowerCase().includes(search)
                          )
                        })
                        .sort((a, b) => (b.jobRef || 0) - (a.jobRef || 0))

                      // Helper to extract city/town from delivery address
                      const getDestination = (address: string | null): string => {
                        if (!address) return ""
                        const lines = address.split('\n').map(l => l.trim()).filter(l => l)
                        // Return second-to-last line (usually city/town) or last line if only one line exists
                        return lines.length > 1 ? lines[lines.length - 2] : lines[0] || ""
                      }

                      // Helper to format Price Out (3 lines max)
                      const formatPriceOut = (shipment: ImportShipment): string => {
                        const lines: string[] = []
                        if (shipment.freightRateOut && parseFloat(shipment.freightRateOut) > 0) {
                          lines.push(`£${shipment.freightRateOut} Freight`)
                        }
                        if (shipment.exportCustomsClearanceCharge && parseFloat(shipment.exportCustomsClearanceCharge) > 0) {
                          lines.push(`£${shipment.exportCustomsClearanceCharge} Exp CC`)
                        }
                        // Note: Import CC Charge Out field doesn't exist in schema, so we skip it
                        return lines.join('\n')
                      }

                      // Helper to format Net Cost (3 lines max)
                      const formatNetCost = (shipment: ImportShipment): string => {
                        const lines: string[] = []
                        if (shipment.haulierFreightRateIn && parseFloat(shipment.haulierFreightRateIn) > 0) {
                          lines.push(`£${shipment.haulierFreightRateIn} Freight`)
                        }
                        if (shipment.exportClearanceChargeIn && parseFloat(shipment.exportClearanceChargeIn) > 0) {
                          lines.push(`£${shipment.exportClearanceChargeIn} Exp CC`)
                        }
                        if (shipment.destinationClearanceCostIn && parseFloat(shipment.destinationClearanceCostIn) > 0) {
                          lines.push(`£${shipment.destinationClearanceCostIn} Imp CC`)
                        }
                        return lines.join('\n')
                      }

                      // Helper to get cell color (green if populated, yellow if empty)
                      const getCellColor = (value: string | null | undefined): string => {
                        return value ? "bg-green-100 dark:bg-green-900" : "bg-yellow-100 dark:bg-yellow-900"
                      }

                      if (nisbetsShipments.length === 0) {
                        return (
                          <tr>
                            <td colSpan={19} className="p-4 text-center text-muted-foreground">
                              No Nisbets Road Shipment jobs found
                            </td>
                          </tr>
                        )
                      }

                      return nisbetsShipments.map((shipment) => {
                        const destination = getDestination(shipment.deliveryAddress)
                        const priceOut = formatPriceOut(shipment)
                        const netCost = formatNetCost(shipment)

                        return (
                          <tr key={shipment.id} className="border-b-2 hover-elevate h-auto" data-testid={`row-nisbets-${shipment.jobRef}`}>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.jobRef?.toString())}`} data-testid={`cell-ref-${shipment.jobRef}`}>
                              <button
                                onClick={() => setLocation(`/import-shipments?search=${shipment.jobRef}`)}
                                className="text-primary hover:underline font-semibold"
                                data-testid={`link-job-${shipment.jobRef}`}
                              >
                                {shipment.jobRef}
                              </button>
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.customerReferenceNumber)}`} data-testid={`cell-ligentia-ref-${shipment.jobRef}`}>
                              {shipment.customerReferenceNumber || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.haulierName)}`} data-testid={`cell-haulier-${shipment.jobRef}`}>
                              {shipment.haulierName || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.supplierName)}`} data-testid={`cell-supplier-${shipment.jobRef}`}>
                              {shipment.supplierName || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.departureCountry)}`} data-testid={`cell-country-${shipment.jobRef}`}>
                              {shipment.departureCountry || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(destination)}`} data-testid={`cell-destination-${shipment.jobRef}`}>
                              {destination}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.collectionDate)}`} data-testid={`cell-collection-date-${shipment.jobRef}`}>
                              {formatDate(shipment.collectionDate)}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.dispatchDate)}`} data-testid={`cell-departure-date-${shipment.jobRef}`}>
                              {formatDate(shipment.dispatchDate)}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.trailerOrContainerNumber)}`} data-testid={`cell-truck-${shipment.jobRef}`}>
                              {shipment.trailerOrContainerNumber || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.portOfArrival)}`} data-testid={`cell-port-${shipment.jobRef}`}>
                              {shipment.portOfArrival || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.importDateEtaPort)}`} data-testid={`cell-eta-${shipment.jobRef}`}>
                              {formatDate(shipment.importDateEtaPort)}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.numberOfPieces)}`} data-testid={`cell-packages-${shipment.jobRef}`}>
                              {shipment.numberOfPieces || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.weight)}`} data-testid={`cell-weight-${shipment.jobRef}`}>
                              {shipment.weight || ""}
                            </td>
                            <td className="px-1 text-center border-r border-border align-middle" data-testid={`cell-details-ligentia-${shipment.jobRef}`}>
                              
                            </td>
                            <td className="px-1 text-center border-r border-border align-middle" data-testid={`cell-entry-haulier-${shipment.jobRef}`}>
                              
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.deliveryDate)}`} data-testid={`cell-delivery-date-${shipment.jobRef}`}>
                              {formatDate(shipment.deliveryDate)}
                            </td>
                            <td className={`px-1 text-center align-top whitespace-pre-wrap border-r border-border w-32 ${getCellColor(priceOut)}`} data-testid={`cell-price-out-${shipment.jobRef}`}>
                              {priceOut}
                            </td>
                            <td className="px-1 text-center border-r border-border align-middle" data-testid={`cell-pod-sent-${shipment.jobRef}`}>
                              
                            </td>
                            <td className={`px-1 text-center align-top whitespace-pre-wrap w-32 ${getCellColor(netCost)}`} data-testid={`cell-net-cost-${shipment.jobRef}`}>
                              {netCost}
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
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
