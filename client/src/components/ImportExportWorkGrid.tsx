import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useQuery, useMutation } from "@tanstack/react-query"
import { type ImportShipment, type ExportShipment, type ImportCustomer, type ExportCustomer, type ExportReceiver, type User } from "@shared/schema"
import { Search } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"

export function ImportExportWorkGrid() {
  const [searchText, setSearchText] = useState("")
  const [jobStatusFilter, setJobStatusFilter] = useState<("active" | "completed")[]>(["active", "completed"])
  const [editingCell, setEditingCell] = useState<{ shipmentId: string; fieldName: string; jobType: 'import' | 'export' } | null>(null)
  const [tempValue, setTempValue] = useState("")
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  const tableRef = useRef<HTMLTableElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!editingCell) {
      setColumnWidths([])
    }
  }, [editingCell])

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingCell])

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

  // Filter jobs: Exclude Container Shipments and Nisbets customers
  const filteredJobs = [
    ...importShipments
      .filter(job => {
        const customer = importCustomers.find(c => c.id === job.importCustomerId)
        return job.containerShipment !== "Container Shipment" && 
               customer?.companyName !== "Nisbets PLC"
      })
      .map(job => ({ ...job, _jobType: 'import' as const })),
    ...exportShipments
      .filter(job => {
        const customer = exportCustomers.find(c => c.id === job.destinationCustomerId)
        return job.containerShipment !== "Container Shipment" && 
               customer?.companyName !== "Nisbets PLC"
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

  // Apply status filter
  const displayedJobs = searchedJobs.filter(job => {
    if (jobStatusFilter.length === 0) return false
    if (jobStatusFilter.includes("active") && job.status !== "Completed") return true
    if (jobStatusFilter.includes("completed") && job.status === "Completed") return true
    return false
  }).sort((a, b) => b.jobRef - a.jobRef)

  const toggleJobStatusFilter = (status: "active" | "completed") => {
    setJobStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
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
      if (['collectionDate', 'dispatchDate', 'importDateEtaPort', 'etaPortDate', 'deliveryDate'].includes(fieldName)) {
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
    setTempValue(currentValue || "")
  }

  const handleKeyDown = (e: React.KeyboardEvent, shipmentId: string, fieldName: string, jobType: 'import' | 'export') => {
    if (e.key === "Enter") {
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

  // Get row color based on haulier status
  const getRowColor = (job: ImportShipment | ExportShipment) => {
    const ead = job.sendHaulierEadStatusIndicator
    
    // Green if status is 3 (completed)
    if (ead === 3) {
      return 'bg-green-100 dark:bg-green-900'
    }
    
    // Yellow if status is pending (2 or 1)
    if (ead === 2 || ead === 1) {
      return 'bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900'
    }
    
    return ''
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import / Export Work</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by job ref, customer, supplier, or container number..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
              data-testid="input-search-import-export"
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
          <table ref={tableRef} className={`w-full border-collapse text-xs ${editingCell ? 'table-fixed' : ''}`}>
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b-2">
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[0] ? { width: `${columnWidths[0]}px` } : undefined}>Job Ref</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[1] ? { width: `${columnWidths[1]}px` } : undefined}>Shipper Ref</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[2] ? { width: `${columnWidths[2]}px` } : undefined}>Customer Name</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[3] ? { width: `${columnWidths[3]}px` } : undefined}>Departure Date</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[4] ? { width: `${columnWidths[4]}px` } : undefined}>Destination / Port of Arrival</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[5] ? { width: `${columnWidths[5]}px` } : undefined}>Identifier</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[6] ? { width: `${columnWidths[6]}px` } : undefined}>Qty</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[7] ? { width: `${columnWidths[7]}px` } : undefined}>Weight</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[8] ? { width: `${columnWidths[8]}px` } : undefined}>CBM</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[9] ? { width: `${columnWidths[9]}px` } : undefined}>ETA Port</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[10] ? { width: `${columnWidths[10]}px` } : undefined}>Delivery Date</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[11] ? { width: `${columnWidths[11]}px` } : undefined}>Delivery Address</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[12] ? { width: `${columnWidths[12]}px` } : undefined}>Quote In/out</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[13] ? { width: `${columnWidths[13]}px` } : undefined}>Haulier</th>
                <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[14] ? { width: `${columnWidths[14]}px` } : undefined}>POD Sent</th>
                <th className="p-1 text-center font-semibold bg-background" style={editingCell && columnWidths[15] ? { width: `${columnWidths[15]}px` } : undefined}>Booker</th>
              </tr>
            </thead>
            <tbody>
              {displayedJobs.map((job) => {
                const isImport = job._jobType === 'import'
                const importJob = isImport ? job as ImportShipment & { _jobType: 'import' } : null
                const exportJob = !isImport ? job as ExportShipment & { _jobType: 'export' } : null
                
                const customer = isImport 
                  ? importCustomers.find(c => c.id === importJob?.importCustomerId)
                  : exportCustomers.find(c => c.id === exportJob?.destinationCustomerId)
                
                const receiver = exportJob ? exportReceivers.find(r => r.id === exportJob.receiverId) : null
                
                const customerName = customer?.companyName || ''
                
                const booker = users.find(u => u.id === job.createdBy)
                const bookerName = booker?.fullName?.split(' ')[0] || ''
                
                const podTimestamp = isImport 
                  ? importJob?.sendPodToCustomerStatusIndicatorTimestamp
                  : exportJob?.sendPodToCustomerStatusIndicatorTimestamp

                const rowColor = getRowColor(job)
                const isEditing = editingCell?.shipmentId === job.id

                return (
                  <tr key={job.id} className="border-b hover:bg-muted/50">
                    {/* Job Ref - first 9 columns get conditional coloring */}
                    <td className={`p-1 text-center border-r border-border ${rowColor}`}>{job.jobRef}</td>
                    
                    {/* Shipper Ref - editable */}
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
                    
                    {/* Customer Name */}
                    <td className={`p-1 text-center border-r border-border ${rowColor}`}>{customerName}</td>
                    
                    {/* Departure Date - editable */}
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
                    
                    {/* Destination / Port of Arrival */}
                    <td className={`p-1 text-center border-r border-border ${rowColor}`}>{isImport ? importJob?.portOfArrival : exportJob?.portOfArrival}</td>
                    
                    {/* Identifier */}
                    <td className={`p-1 text-center border-r border-border ${rowColor}`}>{isImport ? importJob?.trailerOrContainerNumber : exportJob?.trailerNo}</td>
                    
                    {/* Qty */}
                    <td className={`p-1 text-center border-r border-border ${rowColor}`}>{isImport ? importJob?.numberOfPieces : exportJob?.numberOfPieces}</td>
                    
                    {/* Weight */}
                    <td className={`p-1 text-center border-r border-border ${rowColor}`}>{isImport ? importJob?.weight : exportJob?.weight}</td>
                    
                    {/* CBM */}
                    <td className={`p-1 text-center border-r border-border ${rowColor}`}>{isImport ? importJob?.cube : exportJob?.cube}</td>
                    
                    {/* ETA Port - remaining columns don't get colored */}
                    <td className="p-1 text-center border-r border-border">
                      {formatDate(isImport ? importJob?.importDateEtaPort || null : exportJob?.etaPortDate || null)}
                    </td>
                    
                    {/* Delivery Date */}
                    <td className="p-1 text-center border-r border-border">
                      {formatDate(isImport ? importJob?.deliveryDate || null : exportJob?.deliveryDate || null)}
                    </td>
                    
                    {/* Delivery Address - multiline */}
                    <td className="p-1 text-center border-r border-border text-xs leading-tight">
                      {formatAddress(isImport ? importJob?.deliveryAddress : exportJob?.deliveryAddress)}
                    </td>
                    
                    {/* Quote In/out */}
                    <td className="p-1 text-center border-r border-border text-xs">
                      <div className="space-y-0.5">
                        <div>Quote: {getQuoteDisplay(job)}</div>
                        <div>Net: {getNetDisplay(job)}</div>
                      </div>
                    </td>
                    
                    {/* Haulier */}
                    <td className="p-1 text-center border-r border-border">{isImport ? importJob?.haulierName : exportJob?.haulierName}</td>
                    
                    {/* POD Sent */}
                    <td className="p-1 text-center border-r border-border">{podTimestamp ? formatDate(podTimestamp) : ''}</td>
                    
                    {/* Booker */}
                    <td className="p-1 text-center">{bookerName}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
