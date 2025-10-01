import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ImportShipment, ExportShipment, CustomClearance, ImportCustomer, ExportCustomer } from "@shared/schema"

interface JobJournalEntry {
  jobRef: number
  jobType: string
  customerName: string
  destination: string
  date: string
  regContainerFlight: string
  purchaseInvoiceNumber?: string
  purchaseInvoiceDate?: string
  purchaseInvoiceAmount?: string
  salesInvoiceNumber?: string
  salesInvoiceDate?: string
  salesInvoiceAmount?: string
  profitLoss?: number
}

export default function JobJournals() {
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

  const { data: exportCustomers = [] } = useQuery<ExportCustomer[]>({
    queryKey: ["/api/export-customers"],
  })

  const extractCountry = (address: string | null | undefined): string => {
    if (!address) return ""
    const parts = address.split(",").map(p => p.trim())
    return parts[parts.length - 1] || ""
  }

  const getCustomerName = (
    customerId: string | null | undefined,
    customerType: "import" | "export"
  ): string => {
    if (!customerId) return "Unassigned"
    
    if (customerType === "import") {
      const customer = importCustomers.find(c => c.id === customerId)
      return customer?.companyName || "Unassigned"
    } else {
      const customer = exportCustomers.find(c => c.id === customerId)
      return customer?.companyName || "Unassigned"
    }
  }

  const getDestinationForClearance = (clearance: CustomClearance): string => {
    if (clearance.deliveryAddress) {
      return extractCountry(clearance.deliveryAddress)
    }
    
    if (clearance.createdFromType === "import" && clearance.createdFromId) {
      const linkedShipment = importShipments.find(s => s.id === clearance.createdFromId)
      return extractCountry(linkedShipment?.deliveryAddress)
    } else if (clearance.createdFromType === "export" && clearance.createdFromId) {
      const linkedShipment = exportShipments.find(s => s.id === clearance.createdFromId)
      return extractCountry(linkedShipment?.deliveryAddress)
    }
    
    return extractCountry(clearance.portOfArrival || clearance.departureFrom)
  }

  const journalEntries: JobJournalEntry[] = [
    ...importShipments.map(shipment => ({
      jobRef: shipment.jobRef,
      jobType: "Import",
      customerName: getCustomerName(shipment.importCustomerId, "import"),
      destination: extractCountry(shipment.deliveryAddress),
      date: shipment.bookingDate || shipment.importDateEtaPort || "",
      regContainerFlight: shipment.trailerOrContainerNumber || "",
    })),
    ...exportShipments.map(shipment => ({
      jobRef: shipment.jobRef,
      jobType: "Export",
      customerName: getCustomerName(shipment.destinationCustomerId, "export"),
      destination: extractCountry(shipment.deliveryAddress),
      date: shipment.bookingDate || shipment.dispatchDate || "",
      regContainerFlight: shipment.trailerNo || "",
    })),
    ...customClearances.map(clearance => ({
      jobRef: clearance.jobRef,
      jobType: "Customs",
      customerName: getCustomerName(
        clearance.importCustomerId || clearance.exportCustomerId,
        clearance.importCustomerId ? "import" : "export"
      ),
      destination: getDestinationForClearance(clearance),
      date: clearance.etaPort || clearance.createdAt || "",
      regContainerFlight: clearance.trailerOrContainerNumber || "",
    })),
  ].sort((a, b) => b.jobRef - a.jobRef)

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Job Journals</h1>
        <p className="text-muted-foreground mt-1">Financial tracking for all jobs</p>
      </div>

      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold bg-muted/50">Job Reference</th>
                  <th className="text-left p-3 font-semibold bg-muted/50">Customer Name</th>
                  <th className="text-left p-3 font-semibold bg-muted/50">Destination</th>
                  <th className="text-left p-3 font-semibold bg-muted/50">Date</th>
                  <th className="text-left p-3 font-semibold bg-muted/50">Reg/Container/Flight</th>
                  <th className="text-left p-3 font-semibold bg-muted/50 border-l-2 border-border" colSpan={3}>
                    Purchase Invoice
                  </th>
                  <th className="text-left p-3 font-semibold bg-muted/50 border-l-2 border-border" colSpan={3}>
                    Sales Invoice
                  </th>
                  <th className="text-left p-3 font-semibold bg-muted/50 border-l-2 border-border">Profit/Loss</th>
                </tr>
                <tr className="border-b">
                  <th className="p-3"></th>
                  <th className="p-3"></th>
                  <th className="p-3"></th>
                  <th className="p-3"></th>
                  <th className="p-3"></th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground border-l-2 border-border">Invoice Number</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground border-l-2 border-border">Invoice Number</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 border-l-2 border-border"></th>
                </tr>
              </thead>
              <tbody>
                {journalEntries.map((entry, index) => (
                  <tr 
                    key={`${entry.jobType}-${entry.jobRef}-${index}`}
                    className="border-b hover-elevate"
                    data-testid={`row-job-${entry.jobRef}`}
                  >
                    <td className="p-3" data-testid={`text-jobref-${entry.jobRef}`}>
                      #{entry.jobRef}
                    </td>
                    <td className="p-3" data-testid={`text-customer-${entry.jobRef}`}>
                      {entry.customerName}
                    </td>
                    <td className="p-3" data-testid={`text-destination-${entry.jobRef}`}>
                      {entry.destination}
                    </td>
                    <td className="p-3" data-testid={`text-date-${entry.jobRef}`}>
                      {entry.date}
                    </td>
                    <td className="p-3" data-testid={`text-reg-${entry.jobRef}`}>
                      {entry.regContainerFlight}
                    </td>
                    <td className="p-3 border-l-2 border-border" data-testid={`text-purchase-invoice-${entry.jobRef}`}>
                      {entry.purchaseInvoiceNumber || ""}
                    </td>
                    <td className="p-3" data-testid={`text-purchase-date-${entry.jobRef}`}>
                      {entry.purchaseInvoiceDate || ""}
                    </td>
                    <td className="p-3" data-testid={`text-purchase-amount-${entry.jobRef}`}>
                      {entry.purchaseInvoiceAmount || ""}
                    </td>
                    <td className="p-3 border-l-2 border-border" data-testid={`text-sales-invoice-${entry.jobRef}`}>
                      {entry.salesInvoiceNumber || ""}
                    </td>
                    <td className="p-3" data-testid={`text-sales-date-${entry.jobRef}`}>
                      {entry.salesInvoiceDate || ""}
                    </td>
                    <td className="p-3" data-testid={`text-sales-amount-${entry.jobRef}`}>
                      {entry.salesInvoiceAmount || ""}
                    </td>
                    <td className="p-3 border-l-2 border-border" data-testid={`text-profit-loss-${entry.jobRef}`}>
                      {entry.profitLoss !== undefined ? `£${entry.profitLoss.toFixed(2)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
