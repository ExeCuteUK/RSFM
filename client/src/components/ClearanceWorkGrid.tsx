import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useQuery, useMutation } from "@tanstack/react-query"
import { type CustomClearance, type ImportCustomer, type ExportCustomer, type ImportShipment, type ExportShipment, type ClearanceAgent } from "@shared/schema"
import { Search, X, Link2, AlertCircle } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useLocation } from "wouter"
import { format } from "date-fns"

const STORAGE_KEY = 'clearanceWorkGrid_preferences'

export function ClearanceWorkGrid() {
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

  const [searchText, setSearchText] = useState(prefs.searchText || "")
  const [jobStatusFilter, setJobStatusFilter] = useState<("active" | "completed")[]>(prefs.jobStatusFilter || ["active"])
  const [jobTypeFilter, setJobTypeFilter] = useState<("import" | "export")[]>(prefs.jobTypeFilter || ["import", "export"])
  const [linkedFilter, setLinkedFilter] = useState<("linked" | "dedicated")[]>(prefs.linkedFilter || ["linked", "dedicated"])
  const [editingCell, setEditingCell] = useState<{ clearanceId: string; fieldName: string } | null>(null)
  const [tempValue, setTempValue] = useState("")
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage, setRecordsPerPage] = useState(prefs.recordsPerPage || 30)
  const tableRef = useRef<HTMLTableElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  const [, setLocation] = useLocation()

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    const preferences = {
      searchText,
      jobStatusFilter,
      jobTypeFilter,
      linkedFilter,
      recordsPerPage
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }, [searchText, jobStatusFilter, jobTypeFilter, linkedFilter, recordsPerPage])

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

  const { data: customClearances = [] } = useQuery<CustomClearance[]>({
    queryKey: ["/api/custom-clearances"],
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  })

  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })

  const { data: exportCustomers = [] } = useQuery<ExportCustomer[]>({
    queryKey: ["/api/export-customers"],
  })

  const { data: importShipments = [] } = useQuery<ImportShipment[]>({
    queryKey: ["/api/import-shipments"],
  })

  const { data: exportShipments = [] } = useQuery<ExportShipment[]>({
    queryKey: ["/api/export-shipments"],
  })

  const { data: clearanceAgents = [] } = useQuery<ClearanceAgent[]>({
    queryKey: ["/api/clearance-agents"],
  })

  // Filter clearances
  const filteredClearances = customClearances
    .filter(clearance => {
      // Job Status Filter
      const isActive = clearance.status !== "Fully Cleared"
      const isCompleted = clearance.status === "Fully Cleared"
      
      if (jobStatusFilter.includes("active") && !jobStatusFilter.includes("completed") && !isActive) return false
      if (jobStatusFilter.includes("completed") && !jobStatusFilter.includes("active") && !isCompleted) return false
      if (jobStatusFilter.length === 0) return false

      // Job Type Filter
      if (jobTypeFilter.length > 0 && clearance.jobType) {
        const isImport = clearance.jobType === "import"
        const isExport = clearance.jobType === "export"
        
        if (!jobTypeFilter.includes("import") && isImport) return false
        if (!jobTypeFilter.includes("export") && isExport) return false
      }

      // Linked/Dedicated Filter
      const isLinked = !!clearance.createdFromId
      const isDedicated = !clearance.createdFromId
      
      if (linkedFilter.includes("linked") && !linkedFilter.includes("dedicated") && !isLinked) return false
      if (linkedFilter.includes("dedicated") && !linkedFilter.includes("linked") && !isDedicated) return false
      if (linkedFilter.length === 0) return false

      // Search Filter
      if (searchText) {
        const searchLower = searchText.toLowerCase()
        const customer = clearance.jobType === "import" 
          ? importCustomers.find(c => c.id === clearance.importCustomerId)
          : exportCustomers.find(c => c.id === clearance.exportCustomerId)
        
        const jobRef = clearance.jobRef?.toString().toLowerCase() || ""
        const customerName = customer?.companyName?.toLowerCase() || ""
        const clearanceType = clearance.clearanceType?.toLowerCase() || ""
        const mrn = clearance.mrn?.toLowerCase() || ""
        const truckNumber = clearance.trailerOrContainerNumber?.toLowerCase() || ""
        
        if (!jobRef.includes(searchLower) && 
            !customerName.includes(searchLower) &&
            !clearanceType.includes(searchLower) &&
            !mrn.includes(searchLower) &&
            !truckNumber.includes(searchLower)) {
          return false
        }
      }

      return true
    })
    .sort((a, b) => {
      const refA = a.jobRef || 0
      const refB = b.jobRef || 0
      return refB - refA
    })

  // Pagination
  const totalRecords = filteredClearances.length
  const totalPages = Math.ceil(totalRecords / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  const paginatedClearances = filteredClearances.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchText, jobStatusFilter, jobTypeFilter, linkedFilter])

  // Clamp currentPage to valid bounds when totalPages changes
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  // Reset to page 1 when recordsPerPage changes
  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(Number(value))
    setCurrentPage(1)
  }

  const updateClearanceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomClearance> }) => {
      await apiRequest("PATCH", `/api/custom-clearances/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      setEditingCell(null)
      setTempValue("")
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update clearance",
        variant: "destructive",
      })
    },
  })

  const handleCellClick = (clearanceId: string, fieldName: string, currentValue: any) => {
    if (fieldName === "jobRef" || fieldName === "customerName" || fieldName === "jobType" || fieldName === "clearanceType" || fieldName === "agentAdvised") {
      return
    }

    // Capture column widths before entering edit mode
    if (tableRef.current && !editingCell) {
      const headers = tableRef.current.querySelectorAll('thead th')
      const widths = Array.from(headers).map(th => th.getBoundingClientRect().width)
      setColumnWidths(widths)
    }

    setEditingCell({ clearanceId, fieldName })
    setTempValue(currentValue || "")
  }

  const handleSave = () => {
    if (!editingCell) return

    const clearance = customClearances.find(c => c.id === editingCell.clearanceId)
    if (!clearance) return

    updateClearanceMutation.mutate({
      id: editingCell.clearanceId,
      data: { [editingCell.fieldName]: tempValue || null }
    })
  }

  const handleCancel = () => {
    setEditingCell(null)
    setTempValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  const toggleJobStatusFilter = (value: "active" | "completed") => {
    setJobStatusFilter(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const toggleJobTypeFilter = (value: "import" | "export") => {
    setJobTypeFilter(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const toggleLinkedFilter = (value: "linked" | "dedicated") => {
    setLinkedFilter(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return format(date, "dd/MM/yy")
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return format(date, "dd/MM/yy HH:mm")
    } catch {
      return dateString
    }
  }

  const getCustomerName = (clearance: CustomClearance) => {
    if (clearance.jobType === "import") {
      const customer = importCustomers.find(c => c.id === clearance.importCustomerId)
      return customer?.companyName || ""
    } else {
      const customer = exportCustomers.find(c => c.id === clearance.exportCustomerId)
      return customer?.companyName || ""
    }
  }

  const getAgentAdvisedTimestamp = (clearance: CustomClearance) => {
    // If clearance is linked to an import/export shipment, use parent's timestamp
    if (clearance.createdFromId) {
      if (clearance.jobType === "import") {
        const parentShipment = importShipments.find(s => s.id === clearance.createdFromId)
        return parentShipment?.clearanceStatusIndicatorTimestamp || null
      } else if (clearance.jobType === "export") {
        const parentShipment = exportShipments.find(s => s.id === clearance.createdFromId)
        return parentShipment?.adviseClearanceToAgentStatusIndicatorTimestamp || null
      }
    }
    
    // For non-linked clearances, use the clearance's own timestamp
    return clearance.adviseAgentStatusIndicatorTimestamp
  }

  const getCellColor = (clearance: CustomClearance, fieldName: string, value: any) => {
    const greenBg = "bg-green-100 dark:bg-green-900 dark:text-white"
    const yellowBg = "bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-black"
    
    // Link column, Job Ref, and Notes always green
    if (fieldName === "link" || fieldName === "jobRef" || fieldName === "additionalNotes") {
      return greenBg
    }

    // Agent Advised column: green only if BOTH statuses are 3
    if (fieldName === "agentAdvised") {
      const bothComplete = clearance.adviseAgentStatusIndicator === 3 && clearance.sendHaulierEadStatusIndicator === 3
      return bothComplete ? greenBg : yellowBg
    }

    // MRN Number column: yellow if empty, green if has value
    if (fieldName === "mrn") {
      return (value && value.toString().trim()) ? greenBg : yellowBg
    }

    // Clearance Agent column: yellow if empty, green if has value
    if (fieldName === "clearanceAgent") {
      return (value && value.toString().trim()) ? greenBg : yellowBg
    }

    // ETA Port column: yellow if empty, green if has value
    if (fieldName === "etaPort") {
      return (value && value.toString().trim()) ? greenBg : yellowBg
    }

    // Other cells green if has value
    if (value && value.toString().trim()) {
      return greenBg
    }

    return ""
  }

  const renderCell = (clearance: CustomClearance, fieldName: string, value: any, width?: number) => {
    const isEditing = editingCell?.clearanceId === clearance.id && editingCell?.fieldName === fieldName
    const cellColor = getCellColor(clearance, fieldName, value)

    if (fieldName === "link") {
      const handleLinkClick = () => {
        if (clearance.createdFromId) {
          // Remove # symbol if present and navigate to linked shipment page
          const jobRefStr = `${clearance.jobRef}`.replace('#', '')
          if (clearance.jobType === "import") {
            setLocation(`/import-shipments?search=${jobRefStr}`)
          } else {
            setLocation(`/export-shipments?search=${jobRefStr}`)
          }
        }
      }

      return (
        <td 
          key={fieldName} 
          className={`border px-2 py-1 text-center ${clearance.createdFromId ? 'cursor-pointer hover-elevate' : ''} ${cellColor}`}
          style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
          onClick={handleLinkClick}
        >
          {clearance.createdFromId && (
            <Link2 className="w-4 h-4 mx-auto text-green-600 dark:text-green-400" />
          )}
        </td>
      )
    }

    if (fieldName === "jobRef") {
      const handleJobRefClick = () => {
        // Remove # symbol if present and navigate to custom clearances page
        const jobRefStr = `${value}`.replace('#', '')
        setLocation(`/custom-clearances?search=${jobRefStr}`)
      }

      return (
        <td 
          key={fieldName} 
          className={`border px-2 py-1 text-center cursor-pointer hover-elevate ${cellColor}`}
          style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
          onClick={handleJobRefClick}
          data-testid={`link-clearance-${clearance.jobRef}`}
        >
          <span className="text-blue-600 dark:text-blue-400 underline">{value}</span>
        </td>
      )
    }

    if (fieldName === "customerName") {
      return (
        <td 
          key={fieldName} 
          className={`border px-2 py-1 text-center ${cellColor}`}
          style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
        >
          {value}
        </td>
      )
    }

    if (fieldName === "agentAdvised") {
      const ccAgentText = clearance.adviseAgentStatusIndicator === 3 ? "CC Agent : Yes" : "CC Agent : No"
      const haulierText = clearance.sendHaulierEadStatusIndicator === 3 ? "Haulier : Yes" : "Haulier : No"
      
      return (
        <td 
          key={fieldName} 
          className={`border px-2 py-1 text-center ${cellColor}`}
          style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
        >
          <div className="text-xs leading-tight">
            <div>{ccAgentText}</div>
            <div>{haulierText}</div>
          </div>
        </td>
      )
    }

    if (fieldName === "allComplete") {
      const displayValue = clearance.status === "Fully Cleared" ? "Yes" : ""
      return (
        <td 
          key={fieldName} 
          className={`border px-2 py-1 text-center ${cellColor}`}
          style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
        >
          {displayValue}
        </td>
      )
    }

    if (isEditing) {
      if (fieldName === "clearanceAgent") {
        const sortedAgents = [...clearanceAgents].sort((a, b) => 
          (a.agentName || "").localeCompare(b.agentName || "")
        )
        
        return (
          <td 
            key={fieldName} 
            className={`border px-2 py-1 ${cellColor}`}
            style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
          >
            <Select
              value={tempValue}
              onValueChange={(val) => {
                setTempValue(val)
                updateClearanceMutation.mutate({
                  id: clearance.id,
                  data: { clearanceAgent: val }
                })
                setEditingCell(null)
                setTempValue("")
              }}
            >
              <SelectTrigger className="h-auto min-h-6 text-xs text-center border-none focus:ring-0 bg-transparent shadow-none px-0 py-0">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {sortedAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.agentName || ""}>
                    {agent.agentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>
        )
      }

      if (fieldName === "notes") {
        return (
          <td 
            key={fieldName} 
            className={`border px-2 py-1 ${cellColor}`}
            style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
          >
            <textarea
              ref={textareaRef}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center focus:outline-none resize-none"
              rows={2}
              data-testid={`input-${fieldName}-${clearance.id}`}
            />
          </td>
        )
      }

      return (
        <td 
          key={fieldName} 
          className={`border px-2 py-1 ${cellColor}`}
          style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
        >
          <input
            ref={inputRef}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center focus:outline-none"
            data-testid={`input-${fieldName}-${clearance.id}`}
          />
        </td>
      )
    }

    return (
      <td 
        key={fieldName} 
        className={`border px-2 py-1 text-center cursor-pointer hover-elevate ${cellColor}`}
        style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
        onClick={() => handleCellClick(clearance.id, fieldName, value)}
        data-testid={`cell-${fieldName}-${clearance.id}`}
      >
        {value || ""}
      </td>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Clearance Management Sheet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clearances..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8"
                data-testid="input-search-clearances"
              />
            </div>
            {searchText && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSearchText("")}
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            <div className="h-8 w-px bg-border" />

            <Button
              variant={jobStatusFilter.includes("active") ? "default" : "outline"}
              size="sm"
              onClick={() => toggleJobStatusFilter("active")}
              data-testid="filter-active-jobs"
            >
              Active Jobs
            </Button>
            <Button
              variant={jobStatusFilter.includes("completed") ? "default" : "outline"}
              size="sm"
              onClick={() => toggleJobStatusFilter("completed")}
              data-testid="filter-completed-jobs"
            >
              Completed Jobs
            </Button>

            <div className="h-8 w-px bg-border" />

            <Button
              variant={jobTypeFilter.includes("import") ? "default" : "outline"}
              size="sm"
              onClick={() => toggleJobTypeFilter("import")}
              data-testid="filter-imports"
            >
              Imports
            </Button>
            <Button
              variant={jobTypeFilter.includes("export") ? "default" : "outline"}
              size="sm"
              onClick={() => toggleJobTypeFilter("export")}
              data-testid="filter-exports"
            >
              Exports
            </Button>

            <div className="h-8 w-px bg-border" />

            <Button
              variant={linkedFilter.includes("linked") ? "default" : "outline"}
              size="sm"
              onClick={() => toggleLinkedFilter("linked")}
              data-testid="filter-linked"
            >
              Linked CC Jobs
            </Button>
            <Button
              variant={linkedFilter.includes("dedicated") ? "default" : "outline"}
              size="sm"
              onClick={() => toggleLinkedFilter("dedicated")}
              data-testid="filter-dedicated"
            >
              Dedicated CC Jobs
            </Button>
          </div>

          {/* Grid */}
          <div className="overflow-auto max-h-[600px]">
            <table ref={tableRef} className="w-full border-collapse text-xs table-fixed">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="border px-2 py-1 text-center font-medium w-12">Hold</th>
                  <th className="border px-2 py-1 text-center font-medium w-12">Link</th>
                  <th className="border px-2 py-1 text-center font-medium w-16">REF</th>
                  <th className="border px-2 py-1 text-center font-medium w-20">IMP/EXP</th>
                  <th className="border px-2 py-1 text-center font-medium">Clearance Type</th>
                  <th className="border px-2 py-1 text-center font-medium">Customer</th>
                  <th className="border px-2 py-1 text-center font-medium">ETA Port</th>
                  <th className="border px-2 py-1 text-center font-medium">Trailer/Container</th>
                  <th className="border px-2 py-1 text-center font-medium w-40">MRN Number</th>
                  <th className="border px-2 py-1 text-center font-medium w-44">Clearance Agent</th>
                  <th className="border px-2 py-1 text-center font-medium">Agent & Haulier Advised</th>
                  <th className="border px-2 py-1 text-center font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClearances.map((clearance) => {
                  const customerName = getCustomerName(clearance)
                  
                  const statusHasHold = clearance.status === "P.H Hold" || clearance.status === "Customs Issue"
                  const showHoldIcon = clearance.jobHold || statusHasHold
                  const holdBgColor = showHoldIcon ? "bg-red-100 dark:bg-red-900" : "bg-green-100 dark:bg-green-900 dark:text-white"
                  
                  // Build combined tooltip message
                  let holdTooltip = ""
                  if (clearance.jobHold) {
                    holdTooltip = clearance.holdDescription || "Job on hold"
                  }
                  if (statusHasHold) {
                    const statusMessage = clearance.status === "P.H Hold" ? "Port Health Hold" : "Customs Examination / Query"
                    if (holdTooltip) {
                      holdTooltip = `${holdTooltip}. ${statusMessage}`
                    } else {
                      holdTooltip = statusMessage
                    }
                  }
                  
                  return (
                    <tr key={clearance.id}>
                      <td className={`border px-2 py-1 text-center align-middle ${holdBgColor}`} data-testid={`cell-hold-${clearance.jobRef}`}>
                        {showHoldIcon && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mx-auto" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{holdTooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                      {renderCell(clearance, "link", null, columnWidths[1])}
                      {renderCell(clearance, "jobRef", clearance.jobRef, columnWidths[2])}
                      {renderCell(clearance, "jobType", clearance.jobType === "import" ? "Import" : "Export", columnWidths[3])}
                      {renderCell(clearance, "clearanceType", clearance.clearanceType, columnWidths[4])}
                      {renderCell(clearance, "customerName", customerName, columnWidths[5])}
                      {renderCell(clearance, "etaPort", formatDate(clearance.etaPort), columnWidths[6])}
                      {renderCell(clearance, "trailerOrContainerNumber", clearance.trailerOrContainerNumber, columnWidths[7])}
                      {renderCell(clearance, "mrn", clearance.mrn, columnWidths[8])}
                      {renderCell(clearance, "clearanceAgent", clearance.clearanceAgent, columnWidths[9])}
                      {renderCell(clearance, "agentAdvised", formatDate(getAgentAdvisedTimestamp(clearance)), columnWidths[10])}
                      {renderCell(clearance, "additionalNotes", clearance.additionalNotes, columnWidths[11])}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredClearances.length > 0 && (
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

          {filteredClearances.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No clearances found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
