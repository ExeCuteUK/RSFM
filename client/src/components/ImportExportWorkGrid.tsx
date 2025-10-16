import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery, useMutation } from "@tanstack/react-query"
import { type ImportShipment, type ExportShipment, type ImportCustomer, type ExportCustomer, type ExportReceiver, type User, type Haulier } from "@shared/schema"
import { Search, X, Plus } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useLocation } from "wouter"

const STORAGE_KEY = 'importExportWorkGrid_preferences'

export function ImportExportWorkGrid() {
  // Load preferences
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

  const [searchText, setSearchText] = useState(prefs.searchText || "")
  const [excludeInputValue, setExcludeInputValue] = useState("")
  const [excludedCustomers, setExcludedCustomers] = useState<string[]>(() => {
    const saved = localStorage.getItem('excludedCustomers')
    return saved ? JSON.parse(saved) : []
  })
  const [jobStatusFilter, setJobStatusFilter] = useState<("active" | "completed")[]>(prefs.jobStatusFilter || ["active", "completed"])
  const [jobTypeFilter, setJobTypeFilter] = useState<("import" | "export")[]>(prefs.jobTypeFilter || ["import", "export"])
  const [editingCell, setEditingCell] = useState<{ shipmentId: string; fieldName: string; jobType: 'import' | 'export' } | null>(null)
  const [tempValue, setTempValue] = useState("")
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(prefs.recordsPerPage || 30)
  const tableRef = useRef<HTMLTableElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  const [, setLocation] = useLocation()

  // Save excluded customers to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('excludedCustomers', JSON.stringify(excludedCustomers))
  }, [excludedCustomers])

  // Save other preferences to localStorage
  useEffect(() => {
    const preferences = {
      searchText,
      jobStatusFilter,
      jobTypeFilter,
      recordsPerPage
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }, [searchText, jobStatusFilter, jobTypeFilter, recordsPerPage])

  const addExcludedCustomer = () => {
    const name = excludeInputValue.trim()
    if (name && !excludedCustomers.includes(name)) {
      setExcludedCustomers([...excludedCustomers, name])
      setExcludeInputValue("")
    }
  }

  const removeExcludedCustomer = (name: string) => {
    setExcludedCustomers(excludedCustomers.filter(n => n !== name))
  }

  useEffect(() => {
    if (!editingCell) {
      setColumnWidths([])
    }
  }, [editingCell])

  useEffect(() => {
    if (editingCell) {
      if (inputRef.current) {
        inputRef.current.focus()
      } else if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }, [editingCell])

  const { data: importShipments = [] } = useQuery<ImportShipment[]>({
    queryKey: ["/api/import-shipments"],
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  })

  const { data: exportShipments = [] } = useQuery<ExportShipment[]>({
    queryKey: ["/api/export-shipments"],
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  })

  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })

  const { data: exportCustomers = [] } = useQuery<ExportCustomer[]>({
    queryKey: ["/api/export-customers"],
  })

  const { data: exportReceivers = [] } = useQuery<ExportReceiver[]>({
    queryKey: ["/api/export-receivers"],
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  })

  const { data: hauliers = [] } = useQuery<Haulier[]>({
    queryKey: ["/api/hauliers"],
  })

  // Filter jobs: Exclude Container Shipments and manually excluded customers
  const filteredJobs = [
    ...importShipments
      .filter(job => {
        const customer = importCustomers.find(c => c.id === job.importCustomerId)
        const customerName = (customer?.companyName || '').toLowerCase().trim().replace(/\s+/g, ' ')
        
        // Check if customer matches any excluded name (case-insensitive substring match)
        const isExcluded = excludedCustomers.some(excludedName => {
          const normalizedExcludedName = excludedName.toLowerCase().trim().replace(/\s+/g, ' ')
          return customerName.includes(normalizedExcludedName)
        })
        
        return job.containerShipment !== "Container Shipment" && !isExcluded
      })
      .map(job => ({ ...job, _jobType: 'import' as const })),
    ...exportShipments
      .filter(job => {
        const customer = exportCustomers.find(c => c.id === job.destinationCustomerId)
        const customerName = (customer?.companyName || '').toLowerCase().trim().replace(/\s+/g, ' ')
        
        // Check if customer matches any excluded name (case-insensitive substring match)
        const isExcluded = excludedCustomers.some(excludedName => {
          const normalizedExcludedName = excludedName.toLowerCase().trim().replace(/\s+/g, ' ')
          return customerName.includes(normalizedExcludedName)
        })
        
        return job.containerShipment !== "Container Shipment" && !isExcluded
      })
      .map(job => ({ ...job, _jobType: 'export' as const }))
  ]

  // Apply search filter
  const searchedJobs = filteredJobs.filter(job => {
    if (!searchText) return true
    const searchLower = searchText.toLowerCase()
    
    const jobRefMatch = job.jobRef?.toString().includes(searchLower)
    
    if (job._jobType === 'import') {
      const importJob = job as ImportShipment & { _jobType: 'import' }
      const customer = importCustomers.find(c => c.id === importJob.importCustomerId)
      return jobRefMatch || 
             customer?.companyName?.toLowerCase().includes(searchLower) ||
             importJob.supplierName?.toLowerCase().includes(searchLower) ||
             importJob.trailerOrContainerNumber?.toLowerCase().includes(searchLower)
    } else {
      const exportJob = job as ExportShipment & { _jobType: 'export' }
      const customer = exportCustomers.find(c => c.id === exportJob.destinationCustomerId)
      const receiver = exportReceivers.find(r => r.id === exportJob.receiverId)
      return jobRefMatch ||
             customer?.companyName?.toLowerCase().includes(searchLower) ||
             receiver?.companyName?.toLowerCase().includes(searchLower) ||
             exportJob.trailerNo?.toLowerCase().includes(searchLower)
    }
  })

  // Apply status filter and job type filter
  const displayedJobs = searchedJobs.filter(job => {
    if (jobStatusFilter.length === 0) return false
    
    // Filter by status
    const statusMatch = (jobStatusFilter.includes("active") && job.status !== "Completed") ||
                       (jobStatusFilter.includes("completed") && job.status === "Completed")
    
    // Filter by job type
    const typeMatch = jobTypeFilter.includes(job._jobType)
    
    return statusMatch && typeMatch
  }).sort((a, b) => b.jobRef - a.jobRef)

  // Pagination
  const totalRecords = displayedJobs.length
  const totalPages = Math.ceil(totalRecords / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  const paginatedJobs = displayedJobs.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchText, jobStatusFilter, jobTypeFilter, excludedCustomers])

  // Clamp currentPage to valid bounds when totalPages changes
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(Number(value))
    setCurrentPage(1)
  }

  const toggleJobStatusFilter = (status: "active" | "completed") => {
    setJobStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  const toggleJobTypeFilter = (type: "import" | "export") => {
    setJobTypeFilter(prev => {
      // If trying to deselect and it's the only one selected, don't allow it
      if (prev.includes(type) && prev.length === 1) {
        return prev
      }
      
      return prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    })
  }

  // Update mutations
  const updateImportMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImportShipment> }) => {
      return await apiRequest("PATCH", `/api/import-shipments/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      toast({ title: "Job Updated", description: "Import shipment updated successfully" })
    },
  })

  const updateExportMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExportShipment> }) => {
      return await apiRequest("PATCH", `/api/export-shipments/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      toast({ title: "Job Updated", description: "Export shipment updated successfully" })
    },
  })

  const handleSave = async (shipmentId: string, fieldName: string, value: string, jobType: 'import' | 'export') => {
    try {
      const updateData: any = {}
      
      // Handle date fields
      if (['collectionDate', 'dispatchDate', 'importDateEtaPort', 'etaPortDate', 'deliveryDate', 'sendPodToCustomerStatusIndicatorTimestamp'].includes(fieldName)) {
        const ddmmyyPattern = /^(\d{2})\/(\d{2})\/(\d{2})$/
        const match = value.match(ddmmyyPattern)
        if (match) {
          const [, day, month, year] = match
          updateData[fieldName] = `20${year}-${month}-${day}`
        } else {
          updateData[fieldName] = value.trim() || null
        }
      } else {
        updateData[fieldName] = value.trim() || null
      }

      if (jobType === 'import') {
        await updateImportMutation.mutateAsync({ id: shipmentId, data: updateData })
      } else {
        await updateExportMutation.mutateAsync({ id: shipmentId, data: updateData })
      }

      setEditingCell(null)
      setTempValue("")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update",
        variant: "destructive",
      })
    }
  }

  const handleCellClick = (shipmentId: string, fieldName: string, currentValue: any, jobType: 'import' | 'export') => {
    // Capture column widths before entering edit mode
    if (tableRef.current && !editingCell) {
      const headers = tableRef.current.querySelectorAll('thead th')
      const widths = Array.from(headers).map(th => th.getBoundingClientRect().width)
      setColumnWidths(widths)
    }
    
    setEditingCell({ shipmentId, fieldName, jobType })
    
    // Format date fields to DD/MM/YY when editing
    const dateFields = ['collectionDate', 'dispatchDate', 'importDateEtaPort', 'etaPortDate', 'deliveryDate', 'sendPodToCustomerStatusIndicatorTimestamp']
    if (dateFields.includes(fieldName) && currentValue) {
      setTempValue(formatDate(currentValue))
    } else {
      setTempValue(currentValue || "")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, shipmentId: string, fieldName: string, jobType: 'import' | 'export') => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSave(shipmentId, fieldName, tempValue, jobType)
    } else if (e.key === "Escape") {
      setEditingCell(null)
      setTempValue("")
    }
  }

  const handleBlur = (shipmentId: string, fieldName: string, jobType: 'import' | 'export') => {
    handleSave(shipmentId, fieldName, tempValue, jobType)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${day}/${month}/${year}`
  }

  const formatAddress = (address: string | null | undefined) => {
    if (!address) return ""
    return address.split(',').map((line, i) => (
      <div key={i}>{line.trim()}</div>
    ))
  }

  const getQuoteDisplay = (job: (ImportShipment | ExportShipment) & { _jobType: 'import' | 'export' }) => {
    const parts: string[] = []
    
    if (job._jobType === 'import') {
      const importJob = job as ImportShipment & { _jobType: 'import' }
      if (importJob.freightRateOut) parts.push(`Frt £${importJob.freightRateOut}`)
      if (importJob.exportCustomsClearanceCharge) parts.push(`Exp CC £${importJob.exportCustomsClearanceCharge}`)
      if (importJob.clearanceCharge) parts.push(`Dest CC £${importJob.clearanceCharge}`)
    } else {
      const exportJob = job as ExportShipment & { _jobType: 'export' }
      if (exportJob.freightRateOut) parts.push(`Frt £${exportJob.freightRateOut}`)
      if (exportJob.clearanceCharge) parts.push(`Exp CC £${exportJob.clearanceCharge}`)
      if (exportJob.arrivalClearanceCost) parts.push(`Imp CC £${exportJob.arrivalClearanceCost}`)
    }
    
    return parts.join(' / ')
  }

  const getNetDisplay = (job: (ImportShipment | ExportShipment) & { _jobType: 'import' | 'export' }) => {
    const parts: string[] = []
    
    if (job._jobType === 'import') {
      const importJob = job as ImportShipment & { _jobType: 'import' }
      if (importJob.haulierFreightRateIn) parts.push(`Frt £${importJob.haulierFreightRateIn}`)
      if (importJob.exportClearanceChargeIn) parts.push(`Exp CC £${importJob.exportClearanceChargeIn}`)
      if (importJob.destinationClearanceCostIn) parts.push(`Imp CC £${importJob.destinationClearanceCostIn}`)
    } else {
      const exportJob = job as ExportShipment & { _jobType: 'export' }
      if (exportJob.haulierFreightRateIn) parts.push(`Frt £${exportJob.haulierFreightRateIn}`)
      if (exportJob.exportClearanceChargeIn) parts.push(`Exp CC £${exportJob.exportClearanceChargeIn}`)
      if (exportJob.destinationClearanceCostIn) parts.push(`Dest CC £${exportJob.destinationClearanceCostIn}`)
    }
    
    return parts.join(' / ')
  }

  // Get row color based on status indicator (clearanceStatusIndicator for imports, adviseClearanceToAgentStatusIndicator for exports)
  const getRowColor = (job: (ImportShipment | ExportShipment) & { _jobType: 'import' | 'export' }) => {
    const status = job._jobType === 'import' 
      ? (job as ImportShipment).clearanceStatusIndicator
      : (job as ExportShipment).adviseClearanceToAgentStatusIndicator
    
    if (status === 3) {
      return 'bg-green-100 dark:bg-green-900'
    }
    
    return 'bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900'
  }

  // Get cell color based on value (green if has data, yellow if empty)
  const getDataColor = (value: any) => {
    if (value) {
      return 'bg-green-100 dark:bg-green-900'
    }
    return 'bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900'
  }

  // Get delivery date color - yellow if empty, green if has value for both imports and exports
  const getDeliveryDateColor = (job: (ImportShipment | ExportShipment) & { _jobType: 'import' | 'export' }) => {
    const deliveryDate = job._jobType === 'import' 
      ? (job as ImportShipment).deliveryDate
      : (job as ExportShipment).deliveryDate
    
    return getDataColor(deliveryDate)
  }

  // Get quote color based on invoice status
  const getQuoteColor = (job: ImportShipment | ExportShipment) => {
    if (job.invoiceCustomerStatusIndicator === 3) {
      return 'bg-green-100 dark:bg-green-900'
    }
    return 'bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900'
  }

  // Get POD sent color based on status
  const getPodSentColor = (job: ImportShipment | ExportShipment) => {
    if (job.sendPodToCustomerStatusIndicator === 3) {
      return 'bg-green-100 dark:bg-green-900'
    }
    return 'bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900'
  }

  // Handle Job Ref click to navigate to shipment page
  const handleJobRefClick = (jobRef: number, jobType: 'import' | 'export') => {
    const page = jobType === 'import' ? '/import-shipments' : '/export-shipments'
    setLocation(`${page}?search=${jobRef}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import / Export Work</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by job ref, customer, supplier, or container number..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
            data-testid="input-search-import-export"
          />
        </div>

        {/* Exclude Filter and Job Status Buttons */}
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Add customer name to exclude..."
                value={excludeInputValue}
                onChange={(e) => setExcludeInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addExcludedCustomer()
                  }
                }}
                data-testid="input-exclude-customer"
              />
              <Button
                onClick={addExcludedCustomer}
                variant="outline"
                size="icon"
                data-testid="button-add-exclude"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {excludedCustomers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {excludedCustomers.map((name) => (
                  <Badge key={name} variant="secondary" className="gap-1">
                    {name}
                    <button
                      type="button"
                      onClick={() => removeExcludedCustomer(name)}
                      className="hover-elevate active-elevate-2 rounded-full"
                      data-testid={`button-remove-${name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center">
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
            <div className="h-8 w-px bg-border mx-1" />
            <Button
              variant={jobTypeFilter.includes("import") ? "default" : "outline"}
              onClick={() => toggleJobTypeFilter("import")}
              data-testid="button-filter-imports"
            >
              Imports
            </Button>
            <Button
              variant={jobTypeFilter.includes("export") ? "default" : "outline"}
              onClick={() => toggleJobTypeFilter("export")}
              data-testid="button-filter-exports"
            >
              Exports
            </Button>
          </div>
        </div>

        <div className="overflow-auto">
          <table ref={tableRef} className={`w-full border-collapse text-xs ${editingCell ? 'table-fixed' : ''}`}>
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b-2">
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[0] ? { width: `${columnWidths[0]}px` } : undefined}>Job Ref</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[1] ? { width: `${columnWidths[1]}px` } : undefined}>Job Date</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[2] ? { width: `${columnWidths[2]}px` } : undefined}>Shipper Ref</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[3] ? { width: `${columnWidths[3]}px` } : undefined}>Customer Name</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[4] ? { width: `${columnWidths[4]}px` } : undefined}>Departure Date</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[5] ? { width: `${columnWidths[5]}px` } : undefined}>Destination / Port of Arrival</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[6] ? { width: `${columnWidths[6]}px` } : undefined}>Identifier</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[7] ? { width: `${columnWidths[7]}px` } : undefined}>Qty</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[8] ? { width: `${columnWidths[8]}px` } : undefined}>Weight</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[9] ? { width: `${columnWidths[9]}px` } : undefined}>CBM</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[10] ? { width: `${columnWidths[10]}px` } : undefined}>ETA Port</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[11] ? { width: `${columnWidths[11]}px` } : undefined}>Delivery Date</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[12] ? { width: `${columnWidths[12]}px` } : undefined}>Delivery Address</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[13] ? { width: `${columnWidths[13]}px` } : undefined}>Quote Out / Net In</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[14] ? { width: `${columnWidths[14]}px` } : undefined}>Haulier</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[15] ? { width: `${columnWidths[15]}px` } : undefined}>POD Sent</th>
                <th className="p-1 text-center font-semibold bg-background" style={editingCell && columnWidths[16] ? { width: `${columnWidths[16]}px` } : undefined}>Booker</th>
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.map((job) => {
                const isImport = job._jobType === 'import'
                const importJob = isImport ? job as ImportShipment & { _jobType: 'import' } : null
                const exportJob = !isImport ? job as ExportShipment & { _jobType: 'export' } : null
                
                const customer = isImport 
                  ? importCustomers.find(c => c.id === importJob?.importCustomerId)
                  : exportCustomers.find(c => c.id === exportJob?.destinationCustomerId)
                
                const customerName = customer?.companyName || ''
                
                const booker = users.find(u => u.id === job.createdBy)
                const bookerName = booker?.fullName?.split(' ')[0] || ''
                
                const podTimestamp = isImport 
                  ? importJob?.sendPodToCustomerStatusIndicatorTimestamp
                  : exportJob?.sendPodToCustomerStatusIndicatorTimestamp

                const rowColor = getRowColor(job)
                const isEditing = editingCell?.shipmentId === job.id

                // Get field values for both import and export
                const portOfArrival = isImport ? importJob?.portOfArrival : exportJob?.portOfArrival
                const identifier = isImport ? importJob?.trailerOrContainerNumber : exportJob?.trailerNo
                const qty = isImport ? importJob?.numberOfPieces : exportJob?.numberOfPieces
                const weight = isImport ? importJob?.weight : exportJob?.weight
                const cbm = isImport ? importJob?.cube : exportJob?.cube
                const etaPort = isImport ? importJob?.importDateEtaPort : exportJob?.etaPortDate
                const deliveryDate = isImport ? importJob?.deliveryDate : exportJob?.deliveryDate
                const deliveryAddress = isImport ? importJob?.deliveryAddress : exportJob?.deliveryAddress
                const haulierName = isImport ? importJob?.haulierName : exportJob?.haulierName

                return (
                  <tr key={job.id} className="border-b hover:bg-muted/50">
                    {/* Job Ref - Clickable to navigate to shipment page */}
                    <td 
                      className={`p-1 text-center border-r border-border cursor-pointer hover:underline ${rowColor}`}
                      onClick={() => handleJobRefClick(job.jobRef, job._jobType)}
                      data-testid={`link-job-ref-${job.jobRef}`}
                    >
                      {job.jobRef}
                    </td>
                    
                    {/* Job Date - Read only */}
                    <td className={`p-1 text-center border-r border-border ${rowColor}`}>
                      {formatDate(job.bookingDate || null)}
                    </td>
                    
                    {/* Shipper Ref - Editable */}
                    <td 
                      className={`px-1 text-center border-r border-border cursor-pointer ${rowColor}`}
                      onClick={() => handleCellClick(job.id, 'customerReferenceNumber', isImport ? importJob?.customerReferenceNumber : exportJob?.customerReferenceNumber, job._jobType)}
                    >
                      {isEditing && editingCell?.fieldName === 'customerReferenceNumber' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleBlur(job.id, 'customerReferenceNumber', job._jobType)}
                          onKeyDown={(e) => handleKeyDown(e, job.id, 'customerReferenceNumber', job._jobType)}
                          className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center leading-[inherit] focus:outline-none"
                        />
                      ) : (
                        isImport ? importJob?.customerReferenceNumber : exportJob?.customerReferenceNumber
                      )}
                    </td>
                    
                    {/* Customer Name - Not editable */}
                    <td className={`p-1 text-center border-r border-border ${rowColor}`}>{customerName}</td>
                    
                    {/* Departure Date - Editable */}
                    <td 
                      className={`px-1 text-center border-r border-border cursor-pointer ${rowColor}`}
                      onClick={() => handleCellClick(job.id, 'dispatchDate', isImport ? importJob?.dispatchDate : exportJob?.dispatchDate, job._jobType)}
                    >
                      {isEditing && editingCell?.fieldName === 'dispatchDate' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleBlur(job.id, 'dispatchDate', job._jobType)}
                          onKeyDown={(e) => handleKeyDown(e, job.id, 'dispatchDate', job._jobType)}
                          placeholder="DD/MM/YY"
                          className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center leading-[inherit] focus:outline-none"
                        />
                      ) : (
                        formatDate(isImport ? importJob?.dispatchDate || null : exportJob?.dispatchDate || null)
                      )}
                    </td>
                    
                    {/* Destination / Port of Arrival - Editable */}
                    <td 
                      className={`px-1 text-center border-r border-border cursor-pointer ${rowColor}`}
                      onClick={() => handleCellClick(job.id, 'portOfArrival', portOfArrival, job._jobType)}
                    >
                      {isEditing && editingCell?.fieldName === 'portOfArrival' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleBlur(job.id, 'portOfArrival', job._jobType)}
                          onKeyDown={(e) => handleKeyDown(e, job.id, 'portOfArrival', job._jobType)}
                          className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center leading-[inherit] focus:outline-none"
                        />
                      ) : (
                        portOfArrival
                      )}
                    </td>
                    
                    {/* Identifier - Editable */}
                    <td 
                      className={`px-1 text-center border-r border-border cursor-pointer ${rowColor}`}
                      onClick={() => handleCellClick(job.id, isImport ? 'trailerOrContainerNumber' : 'trailerNo', identifier, job._jobType)}
                    >
                      {isEditing && editingCell?.fieldName === (isImport ? 'trailerOrContainerNumber' : 'trailerNo') ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleBlur(job.id, isImport ? 'trailerOrContainerNumber' : 'trailerNo', job._jobType)}
                          onKeyDown={(e) => handleKeyDown(e, job.id, isImport ? 'trailerOrContainerNumber' : 'trailerNo', job._jobType)}
                          className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center leading-[inherit] focus:outline-none"
                        />
                      ) : (
                        identifier
                      )}
                    </td>
                    
                    {/* Qty - Editable */}
                    <td 
                      className={`px-1 text-center border-r border-border cursor-pointer ${rowColor}`}
                      onClick={() => handleCellClick(job.id, 'numberOfPieces', qty, job._jobType)}
                    >
                      {isEditing && editingCell?.fieldName === 'numberOfPieces' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleBlur(job.id, 'numberOfPieces', job._jobType)}
                          onKeyDown={(e) => handleKeyDown(e, job.id, 'numberOfPieces', job._jobType)}
                          className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center leading-[inherit] focus:outline-none"
                        />
                      ) : (
                        qty
                      )}
                    </td>
                    
                    {/* Weight - Editable */}
                    <td 
                      className={`px-1 text-center border-r border-border cursor-pointer ${rowColor}`}
                      onClick={() => handleCellClick(job.id, 'weight', weight, job._jobType)}
                    >
                      {isEditing && editingCell?.fieldName === 'weight' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleBlur(job.id, 'weight', job._jobType)}
                          onKeyDown={(e) => handleKeyDown(e, job.id, 'weight', job._jobType)}
                          className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center leading-[inherit] focus:outline-none"
                        />
                      ) : (
                        weight
                      )}
                    </td>
                    
                    {/* CBM - Editable */}
                    <td 
                      className={`px-1 text-center border-r border-border cursor-pointer ${rowColor}`}
                      onClick={() => handleCellClick(job.id, 'cube', cbm, job._jobType)}
                    >
                      {isEditing && editingCell?.fieldName === 'cube' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleBlur(job.id, 'cube', job._jobType)}
                          onKeyDown={(e) => handleKeyDown(e, job.id, 'cube', job._jobType)}
                          className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center leading-[inherit] focus:outline-none"
                        />
                      ) : (
                        cbm
                      )}
                    </td>
                    
                    {/* ETA Port - Editable with data color */}
                    <td 
                      className={`px-1 text-center border-r border-border cursor-pointer ${getDataColor(etaPort)}`}
                      onClick={() => handleCellClick(job.id, isImport ? 'importDateEtaPort' : 'etaPortDate', etaPort, job._jobType)}
                    >
                      {isEditing && editingCell?.fieldName === (isImport ? 'importDateEtaPort' : 'etaPortDate') ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleBlur(job.id, isImport ? 'importDateEtaPort' : 'etaPortDate', job._jobType)}
                          onKeyDown={(e) => handleKeyDown(e, job.id, isImport ? 'importDateEtaPort' : 'etaPortDate', job._jobType)}
                          placeholder="DD/MM/YY"
                          className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center leading-[inherit] focus:outline-none"
                        />
                      ) : (
                        formatDate(etaPort || null)
                      )}
                    </td>
                    
                    {/* Delivery Date - Editable with status color for imports, data color for exports */}
                    <td 
                      className={`px-1 text-center border-r border-border cursor-pointer ${getDeliveryDateColor(job)}`}
                      onClick={() => handleCellClick(job.id, 'deliveryDate', deliveryDate, job._jobType)}
                    >
                      {isEditing && editingCell?.fieldName === 'deliveryDate' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleBlur(job.id, 'deliveryDate', job._jobType)}
                          onKeyDown={(e) => handleKeyDown(e, job.id, 'deliveryDate', job._jobType)}
                          placeholder="DD/MM/YY"
                          className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center leading-[inherit] focus:outline-none"
                        />
                      ) : (
                        formatDate(deliveryDate || null)
                      )}
                    </td>
                    
                    {/* Delivery Address - Editable textarea with data color */}
                    <td 
                      className={`px-1 text-center border-r border-border cursor-pointer ${getDataColor(deliveryAddress)}`}
                      onClick={() => handleCellClick(job.id, 'deliveryAddress', deliveryAddress, job._jobType)}
                    >
                      {isEditing && editingCell?.fieldName === 'deliveryAddress' ? (
                        <textarea
                          ref={textareaRef}
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleBlur(job.id, 'deliveryAddress', job._jobType)}
                          onKeyDown={(e) => handleKeyDown(e, job.id, 'deliveryAddress', job._jobType)}
                          className="w-full min-h-[40px] bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center leading-tight focus:outline-none resize-none"
                          rows={2}
                        />
                      ) : (
                        <div className="text-xs leading-tight">{formatAddress(deliveryAddress)}</div>
                      )}
                    </td>
                    
                    {/* Quote Out / Net In - Not editable, status color */}
                    <td className={`p-1 text-center border-r border-border ${getQuoteColor(job)}`}>
                      <div className="space-y-0.5">
                        <div className="pb-0.5 border-b border-border">Quote: {getQuoteDisplay(job)}</div>
                        <div className="pt-0.5">Net: {getNetDisplay(job)}</div>
                      </div>
                    </td>
                    
                    {/* Haulier - Editable dropdown with data color */}
                    <td 
                      className={`px-1 text-center border-r border-border cursor-pointer ${getDataColor(haulierName)}`}
                      onClick={() => handleCellClick(job.id, 'haulierName', haulierName, job._jobType)}
                    >
                      {isEditing && editingCell?.fieldName === 'haulierName' ? (
                        <Select
                          value={tempValue}
                          onValueChange={(val) => {
                            setTempValue(val)
                            handleSave(job.id, 'haulierName', val, job._jobType)
                          }}
                        >
                          <SelectTrigger className="h-auto min-h-6 text-xs text-center border-none focus:ring-0 bg-transparent shadow-none px-0 py-0">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {hauliers.sort((a, b) => (a.haulierName || '').localeCompare(b.haulierName || '')).map((h) => (
                              <SelectItem key={h.id} value={h.haulierName || ''}>
                                {h.haulierName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        haulierName
                      )}
                    </td>
                    
                    {/* POD Sent - Editable timestamp with status color */}
                    <td 
                      className={`px-1 text-center border-r border-border cursor-pointer ${getPodSentColor(job)}`}
                      onClick={() => handleCellClick(job.id, 'sendPodToCustomerStatusIndicatorTimestamp', podTimestamp, job._jobType)}
                    >
                      {isEditing && editingCell?.fieldName === 'sendPodToCustomerStatusIndicatorTimestamp' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleBlur(job.id, 'sendPodToCustomerStatusIndicatorTimestamp', job._jobType)}
                          onKeyDown={(e) => handleKeyDown(e, job.id, 'sendPodToCustomerStatusIndicatorTimestamp', job._jobType)}
                          placeholder="DD/MM/YY"
                          className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center leading-[inherit] focus:outline-none"
                        />
                      ) : (
                        formatDate(podTimestamp || null)
                      )}
                    </td>
                    
                    {/* Booker - Not editable, data color */}
                    <td className={`p-1 text-center ${getDataColor(bookerName)}`}>{bookerName}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {displayedJobs.length > 0 && (
          <div className="flex items-center justify-between gap-4 pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Records per page:</span>
              <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                <SelectTrigger className="w-20" data-testid="select-records-per-page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, totalRecords)} of {totalRecords}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                Previous
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
