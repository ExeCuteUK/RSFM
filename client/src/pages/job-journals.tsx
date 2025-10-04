import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
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
  jobExpensesReserve?: number
  rsChargesReserve?: number
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
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>(["Import", "Export", "Customs"])
  const [searchText, setSearchText] = useState("")

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

  const calculateJobExpensesReserve = (shipment: ImportShipment): number => {
    const total = [
      shipment.haulierFreightRateIn,
      shipment.exportClearanceChargeIn,
      shipment.destinationClearanceCostIn,
      ...(shipment.additionalExpensesIn || []).map((e: { amount: string }) => e.amount)
    ]
      .filter(Boolean)
      .reduce((sum, val) => sum + (parseFloat(val as string) || 0), 0)
    
    return total
  }

  const calculateRSChargesReserve = (shipment: ImportShipment): number => {
    const total = [
      shipment.freightRateOut,
      shipment.clearanceCharge,
      shipment.exportCustomsClearanceCharge,
      shipment.additionalCommodityCodeCharge,
      ...(shipment.expensesToChargeOut || []).map((e: { amount: string }) => e.amount)
    ]
      .filter(Boolean)
      .reduce((sum, val) => sum + (parseFloat(val as string) || 0), 0)
    
    return total
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
      jobExpensesReserve: calculateJobExpensesReserve(shipment),
      rsChargesReserve: calculateRSChargesReserve(shipment),
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

  const filteredByMonth = allJournalEntries.filter(entry => matchesMonthYear(entry.date))
  
  const journalEntries = filteredByMonth.filter(entry => {
    const matchesJobType = selectedJobTypes.length === 0 || selectedJobTypes.includes(entry.jobType)
    
    if (!searchText.trim()) return matchesJobType
    
    const searchLower = searchText.toLowerCase()
    const matchesSearch = 
      entry.jobRef.toString().includes(searchLower) ||
      entry.customerName.toLowerCase().includes(searchLower) ||
      entry.destination.toLowerCase().includes(searchLower) ||
      entry.regContainerFlight.toLowerCase().includes(searchLower)
    
    return matchesJobType && matchesSearch
  })

  const handleJobTypeToggle = (jobType: string) => {
    setSelectedJobTypes(prev => 
      prev.includes(jobType)
        ? prev.filter(t => t !== jobType)
        : [...prev, jobType]
    )
  }

  const handleAllClick = () => {
    setSelectedJobTypes([])
  }

  const getMonthLabel = () => {
    const month = MONTHS.find(m => m.value === selectedMonth)
    return month ? month.label : ""
  }

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

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by job ref, customer, destination, or identifier..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedJobTypes.length === 0 ? "default" : "outline"}
            size="sm"
            onClick={handleAllClick}
            data-testid="filter-all"
          >
            All
          </Button>
          <Button
            variant={selectedJobTypes.includes("Import") ? "default" : "outline"}
            size="sm"
            onClick={() => handleJobTypeToggle("Import")}
            data-testid="filter-import"
          >
            Import Jobs
          </Button>
          <Button
            variant={selectedJobTypes.includes("Export") ? "default" : "outline"}
            size="sm"
            onClick={() => handleJobTypeToggle("Export")}
            data-testid="filter-export"
          >
            Export Jobs
          </Button>
          <Button
            variant={selectedJobTypes.includes("Customs") ? "default" : "outline"}
            size="sm"
            onClick={() => handleJobTypeToggle("Customs")}
            data-testid="filter-customs"
          >
            Clearance Only Jobs
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>
            Showing All Jobs - {getMonthLabel()}, {selectedYear} - {journalEntries.length} Records
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="text-xs">
                <tr className="border-b">
                  <th className="text-center p-2 font-semibold underline border-r border-border">#</th>
                  <th className="text-center p-2 font-semibold underline border-r border-border">Job Ref</th>
                  <th className="text-center p-2 font-semibold underline border-r border-border">Client Name</th>
                  <th className="text-center p-2 font-semibold underline border-r border-border">Destination</th>
                  <th className="text-center p-2 font-semibold underline border-r border-border">Date</th>
                  <th className="text-center p-2 font-semibold underline border-r border-border">Identifier</th>
                  <th className="text-center p-2 font-semibold underline border-l-2 border-r border-border">Invoice From</th>
                  <th className="text-center p-2 font-semibold underline border-r border-border">Invoice No</th>
                  <th className="text-center p-2 font-semibold underline border-r border-border">Date</th>
                  <th className="text-center p-2 font-semibold underline border-r border-border">Amount</th>
                  <th className="text-center p-2 font-semibold underline border-r-2 border-border">Reserve</th>
                  <th className="text-center p-2 font-semibold underline border-l-2 border-r border-border">Invoice To</th>
                  <th className="text-center p-2 font-semibold underline border-r border-border">Invoice No</th>
                  <th className="text-center p-2 font-semibold underline border-r border-border">Date</th>
                  <th className="text-center p-2 font-semibold underline border-r border-border">Amount</th>
                  <th className="text-center p-2 font-semibold underline border-r-2 border-border">Reserve</th>
                  <th className="text-center p-2 font-semibold underline border-l-2">P/L</th>
                </tr>
              </thead>
              <tbody className="text-xs">
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
                    <td className="p-2 text-center bg-red-100 dark:bg-red-900 border-l-2 border-r border-border" data-testid={`text-purchase-supplier-${entry.jobRef}`}>
                      
                    </td>
                    <td className="p-2 text-center bg-red-100 dark:bg-red-900 border-r border-border" data-testid={`text-purchase-invoice-${entry.jobRef}`}>
                      {entry.purchaseInvoiceNumber || ""}
                    </td>
                    <td className="p-2 text-center bg-red-100 dark:bg-red-900 border-r border-border" data-testid={`text-purchase-date-${entry.jobRef}`}>
                      {entry.purchaseInvoiceDate || ""}
                    </td>
                    <td className="p-2 text-center bg-red-100 dark:bg-red-900 border-r border-border" data-testid={`text-purchase-amount-${entry.jobRef}`}>
                      {entry.purchaseInvoiceAmount || ""}
                    </td>
                    <td className="p-2 text-center bg-red-100 dark:bg-red-900 border-r-2 border-border font-semibold" data-testid={`text-job-expenses-reserve-${entry.jobRef}`}>
                      {entry.jobExpensesReserve && entry.jobExpensesReserve > 0 ? `£${entry.jobExpensesReserve.toFixed(2)}` : ""}
                    </td>
                    <td className="p-2 text-center bg-green-100 dark:bg-green-900 border-l-2 border-r border-border" data-testid={`text-sales-customer-${entry.jobRef}`}>
                      
                    </td>
                    <td className="p-2 text-center bg-green-100 dark:bg-green-900 border-r border-border" data-testid={`text-sales-invoice-${entry.jobRef}`}>
                      {entry.salesInvoiceNumber || ""}
                    </td>
                    <td className="p-2 text-center bg-green-100 dark:bg-green-900 border-r border-border" data-testid={`text-sales-date-${entry.jobRef}`}>
                      {entry.salesInvoiceDate || ""}
                    </td>
                    <td className="p-2 text-center bg-green-100 dark:bg-green-900 border-r border-border" data-testid={`text-sales-amount-${entry.jobRef}`}>
                      {entry.salesInvoiceAmount || ""}
                    </td>
                    <td className="p-2 text-center bg-green-100 dark:bg-green-900 border-r-2 border-border font-semibold" data-testid={`text-rs-charges-reserve-${entry.jobRef}`}>
                      {entry.rsChargesReserve && entry.rsChargesReserve > 0 ? `£${entry.rsChargesReserve.toFixed(2)}` : ""}
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
