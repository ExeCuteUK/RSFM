import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ImportShipment, ExportShipment, CustomClearance, ImportCustomer, ExportCustomer } from "@shared/schema"

interface JobJournalEntry {
  jobRef: number
  jobType: string
  customerName: string
  destination: string
  date: string
  regContainerFlight: string
  supplier?: string
  purchaseInvoiceNumber?: string
  purchaseInvoiceDate?: string
  purchaseInvoiceAmount?: string
  customer?: string
  salesInvoiceNumber?: string
  salesInvoiceDate?: string
  salesInvoiceAmount?: string
  profitLoss?: number
}

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

const generateYears = () => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let year = currentYear; year <= 2080; year++) {
    years.push({ value: year.toString(), label: year.toString() })
  }
  return years
}

const formatDateToDDMMYY = (dateString: string | null | undefined): string => {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ""
  return format(date, "dd/MM/yy")
}

const getJobTypeAbbreviation = (jobType: string): string => {
  if (jobType === "Import") return "IMP"
  if (jobType === "Export") return "EXP"
  if (jobType === "Customs") return "CC"
  return ""
}

export default function JobJournals() {
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString())
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString())

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

  const matchesMonthYear = (date: string): boolean => {
    if (!date) return false
    
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return false
    
    const dateMonth = (dateObj.getMonth() + 1).toString()
    const dateYear = dateObj.getFullYear().toString()
    
    return dateMonth === selectedMonth && dateYear === selectedYear
  }

  const allJournalEntries: JobJournalEntry[] = [
    ...importShipments.map(shipment => ({
      jobRef: shipment.jobRef,
      jobType: "Import",
      customerName: getCustomerName(shipment.importCustomerId, "import"),
      destination: shipment.portOfArrival || "",
      date: shipment.bookingDate || shipment.importDateEtaPort || "",
      regContainerFlight: shipment.trailerOrContainerNumber || "",
      supplier: shipment.supplierName || "",
      customer: getCustomerName(shipment.importCustomerId, "import"),
    })),
    ...exportShipments.map(shipment => ({
      jobRef: shipment.jobRef,
      jobType: "Export",
      customerName: getCustomerName(shipment.destinationCustomerId, "export"),
      destination: shipment.portOfArrival || "",
      date: shipment.bookingDate || shipment.dispatchDate || "",
      regContainerFlight: shipment.trailerNo || "",
      supplier: shipment.supplier || "",
      customer: getCustomerName(shipment.destinationCustomerId, "export"),
    })),
    ...customClearances
      .filter(clearance => !clearance.createdFromType && !clearance.createdFromId)
      .map(clearance => ({
        jobRef: clearance.jobRef,
        jobType: "Customs",
        customerName: getCustomerName(
          clearance.importCustomerId || clearance.exportCustomerId,
          clearance.importCustomerId ? "import" : "export"
        ),
        destination: clearance.portOfArrival || "",
        date: clearance.etaPort || clearance.createdAt || "",
        regContainerFlight: clearance.trailerOrContainerNumber || "",
        supplier: clearance.supplierName || "",
        customer: getCustomerName(
          clearance.importCustomerId || clearance.exportCustomerId,
          clearance.importCustomerId ? "import" : "export"
        ),
      })),
  ].sort((a, b) => b.jobRef - a.jobRef)

  const journalEntries = allJournalEntries.filter(entry => matchesMonthYear(entry.date))

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Job Journals</h1>
        <p className="text-muted-foreground mt-1">Financial tracking for all jobs</p>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Month:</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[150px]" data-testid="select-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Year:</label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {generateYears().map(year => (
                <SelectItem key={year.value} value={year.value}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-center p-2 font-semibold bg-muted/50 border-r border-border">#</th>
                  <th className="text-center p-2 font-semibold bg-muted/50 border-r border-border">Job Ref</th>
                  <th className="text-center p-2 font-semibold bg-muted/50 border-r border-border">Client Name</th>
                  <th className="text-center p-2 font-semibold bg-muted/50 border-r border-border">Destination</th>
                  <th className="text-center p-2 font-semibold bg-muted/50 border-r border-border">Date</th>
                  <th className="text-center p-2 font-semibold bg-muted/50 border-r border-border">Identifier</th>
                  <th className="text-center p-2 font-semibold bg-red-100 dark:bg-red-950 border-l-2 border-r border-border">Invoice From</th>
                  <th className="text-center p-2 font-semibold bg-red-100 dark:bg-red-950 border-r border-border">Invoice No</th>
                  <th className="text-center p-2 font-semibold bg-red-100 dark:bg-red-950 border-r border-border">Date</th>
                  <th className="text-center p-2 font-semibold bg-red-100 dark:bg-red-950 border-r-2 border-border">Amount</th>
                  <th className="text-center p-2 font-semibold bg-blue-100 dark:bg-blue-950 border-l-2 border-r border-border">Invoice To</th>
                  <th className="text-center p-2 font-semibold bg-blue-100 dark:bg-blue-950 border-r border-border">Invoice No</th>
                  <th className="text-center p-2 font-semibold bg-blue-100 dark:bg-blue-950 border-r border-border">Date</th>
                  <th className="text-center p-2 font-semibold bg-blue-100 dark:bg-blue-950 border-r-2 border-border">Amount</th>
                  <th className="text-center p-2 font-semibold bg-muted border-l-2">P/L</th>
                </tr>
              </thead>
              <tbody>
                {journalEntries.map((entry, index) => (
                  <tr 
                    key={`${entry.jobType}-${entry.jobRef}-${index}`}
                    className="border-b hover-elevate"
                    data-testid={`row-job-${entry.jobRef}`}
                  >
                    <td className="p-2 text-center border-r border-border" data-testid={`text-type-${entry.jobRef}`}>
                      {getJobTypeAbbreviation(entry.jobType)}
                    </td>
                    <td className="p-2 text-center border-r border-border" data-testid={`text-jobref-${entry.jobRef}`}>
                      {entry.jobRef}
                    </td>
                    <td className="p-2 text-center border-r border-border" data-testid={`text-customer-${entry.jobRef}`}>
                      {entry.customerName}
                    </td>
                    <td className="p-2 text-center border-r border-border" data-testid={`text-destination-${entry.jobRef}`}>
                      {entry.destination}
                    </td>
                    <td className="p-2 text-center border-r border-border" data-testid={`text-date-${entry.jobRef}`}>
                      {formatDateToDDMMYY(entry.date)}
                    </td>
                    <td className="p-2 text-center border-r border-border" data-testid={`text-reg-${entry.jobRef}`}>
                      {entry.regContainerFlight}
                    </td>
                    <td className="p-2 text-center bg-red-100 dark:bg-red-950 border-l-2 border-r border-border" data-testid={`text-purchase-supplier-${entry.jobRef}`}>
                      
                    </td>
                    <td className="p-2 text-center bg-red-100 dark:bg-red-950 border-r border-border" data-testid={`text-purchase-invoice-${entry.jobRef}`}>
                      {entry.purchaseInvoiceNumber || ""}
                    </td>
                    <td className="p-2 text-center bg-red-100 dark:bg-red-950 border-r border-border" data-testid={`text-purchase-date-${entry.jobRef}`}>
                      {entry.purchaseInvoiceDate || ""}
                    </td>
                    <td className="p-2 text-center bg-red-100 dark:bg-red-950 border-r-2 border-border" data-testid={`text-purchase-amount-${entry.jobRef}`}>
                      {entry.purchaseInvoiceAmount || ""}
                    </td>
                    <td className="p-2 text-center bg-blue-100 dark:bg-blue-950 border-l-2 border-r border-border" data-testid={`text-sales-customer-${entry.jobRef}`}>
                      
                    </td>
                    <td className="p-2 text-center bg-blue-100 dark:bg-blue-950 border-r border-border" data-testid={`text-sales-invoice-${entry.jobRef}`}>
                      {entry.salesInvoiceNumber || ""}
                    </td>
                    <td className="p-2 text-center bg-blue-100 dark:bg-blue-950 border-r border-border" data-testid={`text-sales-date-${entry.jobRef}`}>
                      {entry.salesInvoiceDate || ""}
                    </td>
                    <td className="p-2 text-center bg-blue-100 dark:bg-blue-950 border-r-2 border-border" data-testid={`text-sales-amount-${entry.jobRef}`}>
                      {entry.salesInvoiceAmount || ""}
                    </td>
                    <td className="p-2 text-center bg-muted border-l-2" data-testid={`text-profit-loss-${entry.jobRef}`}>
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
