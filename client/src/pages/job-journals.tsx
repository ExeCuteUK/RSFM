import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Calendar, Plus, Eye, EyeOff } from "lucide-react"
import { useWindowManager } from "@/contexts/WindowManagerContext"
import { InvoiceEditDialog } from "@/components/InvoiceEditDialog"
import { GeneralReferenceDialog } from "@/components/GeneralReferenceDialog"
import type { ImportShipment, ExportShipment, CustomClearance, ImportCustomer, ExportCustomer, PurchaseInvoice, Invoice, GeneralReference } from "@shared/schema"

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
  const lowerType = jobType.toLowerCase()
  if (lowerType === "import") return "IMP"
  if (lowerType === "export") return "EXP"
  if (lowerType === "customs") return "CC"
  if (lowerType === "general") return "GR"
  return ""
}

const STORAGE_KEY = 'jobJournals_preferences'

export default function JobJournals() {
  const currentDate = new Date()
  const [, setLocation] = useLocation()
  const { openWindow } = useWindowManager()

  // Load preferences from localStorage
  const loadPreferences = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return {}
      }
    }
    return {}
  }

  const prefs = loadPreferences()

  const [filterMode, setFilterMode] = useState<"month" | "range">(prefs.filterMode || "month")
  const [selectedMonth, setSelectedMonth] = useState(prefs.selectedMonth || (currentDate.getMonth() + 1).toString())
  const [selectedYear, setSelectedYear] = useState(prefs.selectedYear || currentDate.getFullYear().toString())
  const [startDate, setStartDate] = useState(prefs.startDate || "")
  const [endDate, setEndDate] = useState(prefs.endDate || "")
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>(prefs.selectedJobTypes || ["General"])
  const [searchText, setSearchText] = useState(prefs.searchText || "")
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [showReserveColumns, setShowReserveColumns] = useState(prefs.showReserveColumns || false)
  const [editingGeneralRef, setEditingGeneralRef] = useState<GeneralReference | null>(null)
  const [generalRefDialogOpen, setGeneralRefDialogOpen] = useState(false)
  
  const handleJobRefClick = (jobRef: number, jobType: string) => {
    const lowerType = jobType.toLowerCase()
    
    if (lowerType === 'general') {
      // Find the general reference and open edit dialog
      const genRef = generalReferences.find(ref => ref.jobRef === jobRef)
      if (genRef) {
        setEditingGeneralRef(genRef)
        setGeneralRefDialogOpen(true)
      }
    } else if (lowerType === 'import') {
      setLocation(`/import-shipments?search=${jobRef}`)
    } else if (lowerType === 'export') {
      setLocation(`/export-shipments?search=${jobRef}`)
    } else if (lowerType === 'customs') {
      setLocation(`/custom-clearances?search=${jobRef}`)
    }
  }
  
  const handleAddExpenseInvoices = () => {
    openWindow({
      id: `expense-invoice-${Date.now()}`,
      type: "expense-invoice",
      title: "Add Expense Invoices",
      payload: {},
    })
  }

  // Save preferences to localStorage
  useEffect(() => {
    const preferences = {
      filterMode,
      selectedMonth,
      selectedYear,
      startDate,
      endDate,
      selectedJobTypes,
      searchText,
      showReserveColumns
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }, [filterMode, selectedMonth, selectedYear, startDate, endDate, selectedJobTypes, searchText, showReserveColumns])

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

  const { data: purchaseInvoices = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ["/api/purchase-invoices"],
  })

  const { data: customerInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  })

  const { data: generalReferences = [] } = useQuery<GeneralReference[]>({
    queryKey: ["/api/general-references"],
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

  const getInvoicesForJob = (jobRef: number): PurchaseInvoice[] => {
    return purchaseInvoices.filter(inv => inv.jobRef === jobRef)
  }

  const getCustomerInvoicesForJob = (jobRef: number): Invoice[] => {
    return customerInvoices.filter(inv => inv.jobRef === jobRef)
  }

  const calculateInvoiceTotals = (jobRef: number): { count: number; total: number; displayText: string } => {
    const invoices = getCustomerInvoicesForJob(jobRef)
    
    if (invoices.length === 0) {
      return { count: 0, total: 0, displayText: "" }
    }
    
    let totalAmount = 0
    let invoiceNumbers: string[] = []
    let dates: string[] = []
    
    invoices.forEach(inv => {
      const chargesTotal = (inv.lineItems || []).reduce((sum: number, charge: any) => {
        const chargeAmount = parseFloat(charge.chargeAmount) || 0
        const vatAmount = parseFloat(charge.vatAmount) || 0
        return sum + chargeAmount + vatAmount
      }, 0)
      
      if (inv.type === "credit_note") {
        totalAmount -= chargesTotal
        invoiceNumbers.push(`CR${inv.invoiceNumber}`)
      } else {
        totalAmount += chargesTotal
        invoiceNumbers.push(inv.invoiceNumber.toString())
      }
      
      dates.push(formatDateToDDMMYY(inv.invoiceDate))
    })
    
    const displayText = invoices.length === 1
      ? `£${totalAmount.toFixed(2)}`
      : `£${totalAmount.toFixed(2)} (${invoices.length})`
    
    return {
      count: invoices.length,
      total: totalAmount,
      displayText,
    }
  }

  const handleInvoiceClick = (invoice: PurchaseInvoice) => {
    setSelectedInvoice(invoice)
    setInvoiceDialogOpen(true)
  }

  const matchesFilter = (date: string): boolean => {
    if (!date) return false
    
    const dateObj = new Date(date)
    
    if (filterMode === "month") {
      return matchesMonthYear(dateObj)
    } else {
      return matchesDateRange(dateObj)
    }
  }

  const matchesMonthYear = (dateObj: Date): boolean => {
    if (isNaN(dateObj.getTime())) return false
    
    const dateMonth = (dateObj.getMonth() + 1).toString()
    const dateYear = dateObj.getFullYear().toString()
    
    return dateMonth === selectedMonth && dateYear === selectedYear
  }

  const matchesDateRange = (dateObj: Date): boolean => {
    if (isNaN(dateObj.getTime())) return false
    
    // If no date range specified, show all
    if (!startDate && !endDate) return true
    
    const dateTime = dateObj.getTime()
    
    if (startDate && endDate) {
      const start = new Date(startDate).getTime()
      const end = new Date(endDate).getTime()
      return dateTime >= start && dateTime <= end
    } else if (startDate) {
      const start = new Date(startDate).getTime()
      return dateTime >= start
    } else if (endDate) {
      const end = new Date(endDate).getTime()
      return dateTime <= end
    }
    
    return true
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

  const calculateExportJobExpensesReserve = (shipment: ExportShipment): number => {
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

  const calculateExportRSChargesReserve = (shipment: ExportShipment): number => {
    const total = [
      shipment.freightRateOut,
      shipment.clearanceCharge,
      shipment.arrivalClearanceCost,
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
      jobExpensesReserve: calculateExportJobExpensesReserve(shipment),
      rsChargesReserve: calculateExportRSChargesReserve(shipment),
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
    ...generalReferences.map(ref => ({
      jobRef: ref.jobRef,
      jobType: "General",
      customerName: ref.referenceName,
      destination: "",
      date: ref.date || "",
      regContainerFlight: "",
      supplier: "",
      customer: ref.referenceName,
    })),
  ].sort((a, b) => a.jobRef - b.jobRef)

  const filteredByDate = allJournalEntries.filter(entry => {
    return matchesFilter(entry.date)
  })
  
  const journalEntries = filteredByDate.filter(entry => {
    const matchesJobType = selectedJobTypes.length === 0 || selectedJobTypes.includes(entry.jobType)
    
    if (!searchText.trim()) return matchesJobType
    
    const searchLower = searchText.toLowerCase()
    
    // Get purchase invoices for this job
    const jobInvoices = getInvoicesForJob(entry.jobRef)
    
    const matchesSearch = 
      entry.jobRef.toString().includes(searchLower) ||
      entry.customerName.toLowerCase().includes(searchLower) ||
      entry.destination.toLowerCase().includes(searchLower) ||
      entry.regContainerFlight.toLowerCase().includes(searchLower) ||
      (entry.supplier && entry.supplier.toLowerCase().includes(searchLower)) ||
      (entry.customer && entry.customer.toLowerCase().includes(searchLower)) ||
      (entry.salesInvoiceNumber && entry.salesInvoiceNumber.toLowerCase().includes(searchLower)) ||
      jobInvoices.some(inv => 
        inv.companyName.toLowerCase().includes(searchLower) ||
        inv.invoiceNumber.toLowerCase().includes(searchLower)
      )
    
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

  const getFilterLabel = () => {
    if (filterMode === "month") {
      return `${getMonthLabel()}, ${selectedYear}`
    } else {
      if (startDate && endDate) {
        return `${format(new Date(startDate), "dd/MM/yyyy")} - ${format(new Date(endDate), "dd/MM/yyyy")}`
      } else if (startDate) {
        return `From ${format(new Date(startDate), "dd/MM/yyyy")}`
      } else if (endDate) {
        return `Until ${format(new Date(endDate), "dd/MM/yyyy")}`
      } else {
        return "All Dates"
      }
    }
  }

  // Calculate totals for Amount columns
  const totalPurchaseAmount = journalEntries.reduce((sum, entry) => {
    const invoices = getInvoicesForJob(entry.jobRef)
    const jobTotal = invoices.reduce((jobSum, inv) => jobSum + Number(inv.invoiceAmount), 0)
    return sum + jobTotal
  }, 0)

  const totalSalesAmount = journalEntries.reduce((sum, entry) => {
    return sum + calculateInvoiceTotals(entry.jobRef).total
  }, 0)

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Job Journals</h1>
          <p className="text-muted-foreground mt-1">Financial tracking for all jobs</p>
        </div>
        <div className="flex gap-2">
          <GeneralReferenceDialog />
          <Button
            onClick={handleAddExpenseInvoices}
            size="default"
            data-testid="button-add-expense-invoices"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense Invoices
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          <Button
            variant={filterMode === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterMode("month")}
            data-testid="filter-mode-month"
          >
            <Calendar className="h-4 w-4 mr-1" />
            Month/Year
          </Button>
          <Button
            variant={filterMode === "range" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterMode("range")}
            data-testid="filter-mode-range"
          >
            <Calendar className="h-4 w-4 mr-1" />
            Date Range
          </Button>
        </div>
        
        {filterMode === "month" ? (
          <>
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
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">From:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
                data-testid="input-start-date"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">To:</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
                data-testid="input-end-date"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by job ref, customer, destination, identifier, supplier, or invoice number..."
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
          <Button
            variant={selectedJobTypes.includes("General") ? "default" : "outline"}
            size="sm"
            onClick={() => handleJobTypeToggle("General")}
            data-testid="filter-general"
          >
            General References
          </Button>
        </div>
        <Button
          variant={showReserveColumns ? "default" : "outline"}
          size="sm"
          onClick={() => setShowReserveColumns(!showReserveColumns)}
          data-testid="toggle-reserve-columns"
        >
          {showReserveColumns ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
          Reserve Columns
        </Button>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="flex-shrink-0">
          <CardTitle>
            {getFilterLabel()} - {journalEntries.length} {journalEntries.length === 1 ? 'Record' : 'Records'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <div className="overflow-auto h-full">
            <table className="w-full border-collapse">
              <thead className="text-xs sticky top-0 bg-background z-10">
                <tr className="border-b-4">
                  <th className="text-center p-1 font-semibold underline border-r border-border bg-background">#</th>
                  <th className="text-center p-1 font-semibold underline border-r border-border bg-background">Job Ref</th>
                  <th className="text-center p-1 font-semibold underline border-r border-border bg-background">Client Name</th>
                  <th className="text-center p-1 font-semibold underline border-r border-border bg-background">Destination</th>
                  <th className="text-center p-1 font-semibold underline border-r border-border bg-background">Date</th>
                  <th className="text-center p-1 font-semibold underline border-r-4 border-border bg-background">Identifier</th>
                  <th className="text-center p-1 font-semibold underline border-l-2 border-r border-border bg-background">Invoice From</th>
                  <th className="text-center p-1 font-semibold underline border-r border-border bg-background">Invoice No</th>
                  <th className="text-center p-1 font-semibold underline border-r border-border bg-background">Date</th>
                  <th className="text-center p-1 font-semibold underline border-r border-border bg-background">Amount</th>
                  {showReserveColumns && (
                    <th className="text-center p-1 font-semibold underline border-l-4 border-r-4 border-border bg-background">Reserve</th>
                  )}
                  <th className="text-center p-1 font-semibold underline border-l-2 border-r border-border bg-background">Invoice To</th>
                  <th className="text-center p-1 font-semibold underline border-r border-border bg-background">Invoice No</th>
                  <th className="text-center p-1 font-semibold underline border-r border-border bg-background">Date</th>
                  <th className="text-center p-1 font-semibold underline border-r border-border bg-background">Amount</th>
                  {showReserveColumns && (
                    <th className="text-center p-1 font-semibold underline border-l-4 border-r-4 border-border bg-background">Reserve</th>
                  )}
                  <th className="text-center p-1 font-semibold underline border-l-2 bg-background">P/L</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {journalEntries.map((entry, index) => (
                  <tr 
                    key={`${entry.jobType}-${entry.jobRef}-${index}`}
                    className="border-b-2 hover-elevate"
                    data-testid={`row-job-${entry.jobRef}`}
                  >
                    <td className="p-1 text-center border-r border-border" data-testid={`text-type-${entry.jobRef}`}>
                      {getJobTypeAbbreviation(entry.jobType)}
                    </td>
                    <td className="p-1 text-center border-r border-border" data-testid={`text-jobref-${entry.jobRef}`}>
                      <button
                        onClick={() => handleJobRefClick(entry.jobRef, entry.jobType)}
                        className="hover:underline cursor-pointer"
                        data-testid={`link-jobref-${entry.jobRef}`}
                      >
                        {entry.jobRef}
                      </button>
                    </td>
                    <td className="p-1 text-center border-r border-border" data-testid={`text-customer-${entry.jobRef}`}>
                      {entry.customerName}
                    </td>
                    <td className="p-1 text-center border-r border-border" data-testid={`text-destination-${entry.jobRef}`}>
                      {entry.destination}
                    </td>
                    <td className="p-1 text-center border-r border-border" data-testid={`text-date-${entry.jobRef}`}>
                      {formatDateToDDMMYY(entry.date)}
                    </td>
                    <td className="p-1 text-center border-r-4 border-border" data-testid={`text-reg-${entry.jobRef}`}>
                      {entry.regContainerFlight}
                    </td>
                    <td className="p-1 text-center bg-red-100 dark:bg-red-900 border-l-2 border-r border-border align-top" data-testid={`text-purchase-supplier-${entry.jobRef}`}>
                      {(() => {
                        const invoices = getInvoicesForJob(entry.jobRef)
                        if (invoices.length === 0) return null
                        return (
                          <div className="text-xs space-y-0.5">
                            {invoices.map((inv) => (
                              <div key={inv.id}>{inv.companyName}</div>
                            ))}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="p-1 text-center bg-red-100 dark:bg-red-900 border-r border-border align-top" data-testid={`text-purchase-invoice-${entry.jobRef}`}>
                      {(() => {
                        const invoices = getInvoicesForJob(entry.jobRef)
                        if (invoices.length === 0) return null
                        return (
                          <div className="text-xs space-y-0.5">
                            {invoices.map((inv) => (
                              <div key={inv.id}>
                                <button
                                  onClick={() => handleInvoiceClick(inv)}
                                  className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                  data-testid={`link-invoice-${inv.id}`}
                                >
                                  {inv.invoiceNumber}
                                </button>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="p-1 text-center bg-red-100 dark:bg-red-900 border-r border-border align-top" data-testid={`text-purchase-date-${entry.jobRef}`}>
                      {(() => {
                        const invoices = getInvoicesForJob(entry.jobRef)
                        if (invoices.length === 0) return null
                        return (
                          <div className="text-xs space-y-0.5">
                            {invoices.map((inv) => (
                              <div key={inv.id}>{formatDateToDDMMYY(inv.invoiceDate)}</div>
                            ))}
                          </div>
                        )
                      })()}
                    </td>
                    <td 
                      className="p-1 text-center bg-red-100 dark:bg-red-900 border-r border-border align-top" 
                      data-testid={`text-purchase-amount-${entry.jobRef}`}
                      title={`Total: £${getInvoicesForJob(entry.jobRef).reduce((sum, inv) => sum + Number(inv.invoiceAmount), 0).toFixed(2)}`}
                    >
                      {(() => {
                        const invoices = getInvoicesForJob(entry.jobRef)
                        if (invoices.length === 0) return null
                        return (
                          <div className="text-xs space-y-0.5">
                            {invoices.map((inv) => (
                              <div key={inv.id}>£{Number(inv.invoiceAmount).toFixed(2)}</div>
                            ))}
                          </div>
                        )
                      })()}
                    </td>
                    {showReserveColumns && (
                      <td className="p-1 text-center bg-red-50 dark:bg-red-950 border-l-4 border-r-4 border-border" data-testid={`text-job-expenses-reserve-${entry.jobRef}`}>
                        {entry.jobExpensesReserve && entry.jobExpensesReserve > 0 ? `£${entry.jobExpensesReserve.toFixed(2)}` : ""}
                      </td>
                    )}
                    <td className="p-1 text-center bg-green-100 dark:bg-green-900 border-l-2 border-r border-border align-top" data-testid={`text-sales-customer-${entry.jobRef}`}>
                      {(() => {
                        const invoices = getCustomerInvoicesForJob(entry.jobRef)
                        if (invoices.length === 0) return null
                        return (
                          <div className="text-xs space-y-0.5">
                            {invoices.map((inv) => (
                              <div key={inv.id}>{inv.customerCompanyName || ""}</div>
                            ))}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="p-1 text-center bg-green-100 dark:bg-green-900 border-r border-border align-top" data-testid={`text-sales-invoice-${entry.jobRef}`}>
                      {(() => {
                        const invoices = getCustomerInvoicesForJob(entry.jobRef)
                        if (invoices.length === 0) return null
                        return (
                          <div className="text-xs space-y-0.5">
                            {invoices.map((inv) => (
                              <div key={inv.id}>
                                {inv.type === "credit_note" ? `CR${inv.invoiceNumber}` : inv.invoiceNumber}
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="p-1 text-center bg-green-100 dark:bg-green-900 border-r border-border align-top" data-testid={`text-sales-date-${entry.jobRef}`}>
                      {(() => {
                        const invoices = getCustomerInvoicesForJob(entry.jobRef)
                        if (invoices.length === 0) return null
                        return (
                          <div className="text-xs space-y-0.5">
                            {invoices.map((inv) => (
                              <div key={inv.id}>{formatDateToDDMMYY(inv.invoiceDate)}</div>
                            ))}
                          </div>
                        )
                      })()}
                    </td>
                    <td 
                      className="p-1 text-center bg-green-100 dark:bg-green-900 border-r border-border align-top" 
                      data-testid={`text-sales-amount-${entry.jobRef}`}
                      title={`Total: ${calculateInvoiceTotals(entry.jobRef).displayText}`}
                    >
                      {(() => {
                        const invoices = getCustomerInvoicesForJob(entry.jobRef)
                        if (invoices.length === 0) return null
                        return (
                          <div className="text-xs space-y-0.5">
                            {invoices.map((inv) => {
                              const chargesTotal = (inv.lineItems || []).reduce((sum: number, charge: any) => {
                                const chargeAmount = parseFloat(charge.chargeAmount) || 0
                                const vatAmount = parseFloat(charge.vatAmount) || 0
                                return sum + chargeAmount + vatAmount
                              }, 0)
                              
                              const displayAmount = inv.type === "credit_note" ? -chargesTotal : chargesTotal
                              return (
                                <div 
                                  key={inv.id}
                                  className={inv.type === "credit_note" ? "text-red-600 dark:text-red-400" : ""}
                                >
                                  £{displayAmount.toFixed(2)}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </td>
                    {showReserveColumns && (
                      <td className="p-1 text-center bg-green-50 dark:bg-green-950 border-l-4 border-r-4 border-border" data-testid={`text-rs-charges-reserve-${entry.jobRef}`}>
                        {entry.rsChargesReserve && entry.rsChargesReserve > 0 ? `£${entry.rsChargesReserve.toFixed(2)}` : ""}
                      </td>
                    )}
                    <td className="p-1 text-center bg-muted border-l-2" data-testid={`text-profit-loss-${entry.jobRef}`}>
                      {(() => {
                        const salesAmount = calculateInvoiceTotals(entry.jobRef).total
                        
                        const invoices = getInvoicesForJob(entry.jobRef)
                        const totalPurchaseAmount = invoices.reduce((sum, inv) => sum + Number(inv.invoiceAmount), 0)
                        
                        const profitLoss = salesAmount - totalPurchaseAmount
                        
                        const formatted = profitLoss.toLocaleString('en-GB', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })
                        
                        let colorClass = ""
                        if (profitLoss > 0) {
                          colorClass = "text-green-600 dark:text-green-400"
                        } else if (profitLoss < 0) {
                          colorClass = "text-red-600 dark:text-red-400"
                        } else {
                          colorClass = "text-orange-400 dark:text-orange-400"
                        }
                        
                        return <span className={colorClass}>£{formatted}</span>
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <InvoiceEditDialog
        invoice={selectedInvoice}
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
      />
      
      <GeneralReferenceDialog
        trigger={<span className="hidden" />}
        reference={editingGeneralRef}
        open={generalRefDialogOpen}
        onOpenChange={(open) => {
          setGeneralRefDialogOpen(open)
          if (!open) {
            setEditingGeneralRef(null)
          }
        }}
      />
    </div>
  )
}
