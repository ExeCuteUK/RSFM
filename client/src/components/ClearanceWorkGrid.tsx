import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery, useMutation } from "@tanstack/react-query"
import { type CustomClearance, type ImportCustomer, type ExportCustomer } from "@shared/schema"
import { Search, X, ExternalLink } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useLocation } from "wouter"
import { format } from "date-fns"

export function ClearanceWorkGrid() {
  const [searchText, setSearchText] = useState("")
  const [jobStatusFilter, setJobStatusFilter] = useState<("active" | "completed")[]>(["active"])
  const [jobTypeFilter, setJobTypeFilter] = useState<("import" | "export")[]>(["import", "export"])
  const [linkedFilter, setLinkedFilter] = useState<("linked" | "dedicated")[]>(["linked", "dedicated"])
  const [editingCell, setEditingCell] = useState<{ clearanceId: string; fieldName: string } | null>(null)
  const [tempValue, setTempValue] = useState("")
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  const tableRef = useRef<HTMLTableElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  const [, setLocation] = useLocation()

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
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })

  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })

  const { data: exportCustomers = [] } = useQuery<ExportCustomer[]>({
    queryKey: ["/api/export-customers"],
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
    if (fieldName === "jobRef" || fieldName === "customerName") {
      return
    }

    if (tableRef.current && !editingCell) {
      const cells = Array.from(tableRef.current.querySelectorAll('td'))
      const widths = cells.map(cell => cell.offsetWidth)
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

  const getCellColor = (clearance: CustomClearance, fieldName: string, value: any) => {
    // Link column and Job Ref always green
    if (fieldName === "link" || fieldName === "jobRef") {
      return "bg-green-100 dark:bg-green-950"
    }

    // Agent Advised column: green if BOTH adviseAgent and sendHaulierEad are 3, otherwise yellow
    if (fieldName === "agentAdvised") {
      if (clearance.adviseAgentStatusIndicator === 3 && clearance.sendHaulierEadStatusIndicator === 3) {
        return "bg-green-100 dark:bg-green-950"
      }
      return "bg-yellow-100 dark:bg-yellow-950"
    }

    // Other cells green if has value
    if (value && value.toString().trim()) {
      return "bg-green-100 dark:bg-green-950"
    }

    return ""
  }

  const renderCell = (clearance: CustomClearance, fieldName: string, value: any, width?: number) => {
    const isEditing = editingCell?.clearanceId === clearance.id && editingCell?.fieldName === fieldName
    const cellColor = getCellColor(clearance, fieldName, value)

    if (fieldName === "link") {
      return (
        <td 
          key={fieldName} 
          className={`border px-2 py-1 text-center ${cellColor}`}
          style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
        >
          <ExternalLink className="w-4 h-4 mx-auto text-green-600 dark:text-green-400" />
        </td>
      )
    }

    if (fieldName === "jobRef") {
      const handleJobRefClick = () => {
        const jobRefStr = `#${value}`
        
        // If it's a linked job (created from import/export shipment)
        if (clearance.createdFromId) {
          if (clearance.jobType === "import") {
            setLocation(`/import-shipments?search=${jobRefStr}`)
          } else {
            setLocation(`/export-shipments?search=${jobRefStr}`)
          }
        } else {
          // Dedicated clearance job
          setLocation(`/custom-clearances?search=${jobRefStr}`)
        }
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
      if (fieldName === "notes") {
        return (
          <td 
            key={fieldName} 
            className="border px-0 py-0"
            style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
          >
            <textarea
              ref={textareaRef}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="w-full h-full px-2 py-1 text-center border-2 border-blue-500 focus:outline-none resize-none"
              rows={2}
              data-testid={`input-${fieldName}-${clearance.id}`}
            />
          </td>
        )
      }

      return (
        <td 
          key={fieldName} 
          className="border px-0 py-0"
          style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
        >
          <input
            ref={inputRef}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full h-full px-2 py-1 text-center border-2 border-blue-500 focus:outline-none"
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
          <CardTitle>Clearance Work Grid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
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
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
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
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
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
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
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
          </div>

          {/* Grid */}
          <div className="overflow-auto max-h-[600px]">
            <table ref={tableRef} className="w-full border-collapse text-sm">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="border px-2 py-1 text-center font-medium">Link</th>
                  <th className="border px-2 py-1 text-center font-medium">REF</th>
                  <th className="border px-2 py-1 text-center font-medium">IMP/EXP</th>
                  <th className="border px-2 py-1 text-center font-medium">Clearance Type</th>
                  <th className="border px-2 py-1 text-center font-medium">Customer</th>
                  <th className="border px-2 py-1 text-center font-medium">ETA Port</th>
                  <th className="border px-2 py-1 text-center font-medium">Trailer/Container</th>
                  <th className="border px-2 py-1 text-center font-medium">MRN Number</th>
                  <th className="border px-2 py-1 text-center font-medium">Clearance Agent</th>
                  <th className="border px-2 py-1 text-center font-medium">Agent Advised</th>
                  <th className="border px-2 py-1 text-center font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredClearances.map((clearance, index) => {
                  const customerName = getCustomerName(clearance)
                  
                  return (
                    <tr key={clearance.id}>
                      {renderCell(clearance, "link", null, columnWidths[0])}
                      {renderCell(clearance, "jobRef", clearance.jobRef, columnWidths[1])}
                      {renderCell(clearance, "jobType", clearance.jobType === "import" ? "Import" : "Export", columnWidths[2])}
                      {renderCell(clearance, "clearanceType", clearance.clearanceType, columnWidths[3])}
                      {renderCell(clearance, "customerName", customerName, columnWidths[4])}
                      {renderCell(clearance, "etaPort", formatDate(clearance.etaPort), columnWidths[5])}
                      {renderCell(clearance, "trailerOrContainerNumber", clearance.trailerOrContainerNumber, columnWidths[6])}
                      {renderCell(clearance, "mrn", clearance.mrn, columnWidths[7])}
                      {renderCell(clearance, "clearanceAgent", clearance.clearanceAgent, columnWidths[8])}
                      {renderCell(clearance, "agentAdvised", formatDateTime(clearance.adviseAgentStatusIndicatorTimestamp), columnWidths[9])}
                      {renderCell(clearance, "notes", clearance.additionalNotes, columnWidths[10])}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

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
