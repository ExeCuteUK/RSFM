import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { FileText, FileBarChart } from "lucide-react"
import { type GeneralReference, type AnparioCCEntry, type ImportCustomer, type Settings } from "@shared/schema"
import { useWindowManager } from "@/contexts/WindowManagerContext"

export function AnparioCCGrid() {
  const { toast } = useToast()
  const { openWindow } = useWindowManager()
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<{ entryId: string; fieldName: string } | null>(null)
  const [tempValue, setTempValue] = useState("")
  const [localEntries, setLocalEntries] = useState<AnparioCCEntry[]>([])
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const pendingFocusRef = useRef<{ fieldName: string; isNewRow: boolean } | null>(null)

  // Fetch all general references with "Anpario EU CC" name
  const { data: allReferences = [] } = useQuery<GeneralReference[]>({
    queryKey: ["/api/general-references"],
  })

  // Filter to any references containing "Anpario" (case-insensitive) and sort by date descending
  const anparioReferences = allReferences
    .filter(ref => ref.referenceName.toLowerCase().includes("anpario"))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Auto-select the most recent reference if none selected
  useEffect(() => {
    if (!selectedReferenceId && anparioReferences.length > 0) {
      setSelectedReferenceId(anparioReferences[0].id)
    }
  }, [anparioReferences, selectedReferenceId])

  // Get selected reference
  const selectedReference = anparioReferences.find(ref => ref.id === selectedReferenceId)

  // Fetch entries for selected reference
  const { data: serverEntries = [] } = useQuery<AnparioCCEntry[]>({
    queryKey: ["/api/anpario-cc-entries/by-reference", selectedReferenceId],
    queryFn: async () => {
      if (!selectedReferenceId) return []
      const res = await fetch(`/api/anpario-cc-entries/by-reference/${selectedReferenceId}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch entries')
      return res.json()
    },
    enabled: !!selectedReferenceId,
  })

  // Sync server data to local state when it changes
  useEffect(() => {
    setLocalEntries(serverEntries)
  }, [serverEntries])

  // Fetch Anpario PLC customer
  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })
  const anparioCustomer = importCustomers.find(c => c.companyName === "Anpario PLC")

  // Fetch settings for fees
  const { data: settings } = useQuery<Settings | undefined>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings", { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch settings')
      const data = await res.json()
      return Array.isArray(data) ? (data[0] || undefined) : data
    },
  })

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingCell])

  // Clear column widths when exiting edit mode
  useEffect(() => {
    if (!editingCell) {
      setColumnWidths([])
    }
  }, [editingCell])

  // Update entry mutation - save silently without refetching
  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AnparioCCEntry> }) => {
      await apiRequest("PATCH", `/api/anpario-cc-entries/${id}`, data)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update entry",
        variant: "destructive",
      })
      // Revert local changes on error
      setLocalEntries(serverEntries)
    },
  })

  // Create entry mutation - save silently, add to local state
  const createEntryMutation = useMutation({
    mutationFn: async (data: Partial<AnparioCCEntry>) => {
      const response = await apiRequest("POST", "/api/anpario-cc-entries", data)
      return await response.json() as AnparioCCEntry
    },
    onSuccess: (newEntry: AnparioCCEntry) => {
      // Add new entry to local state
      setLocalEntries(prev => [...prev, newEntry])
      
      // If there's a pending focus request, apply it to the newly created row
      if (pendingFocusRef.current?.isNewRow) {
        setEditingCell({ 
          entryId: newEntry.id, 
          fieldName: pendingFocusRef.current.fieldName 
        })
        setTempValue((newEntry as any)[pendingFocusRef.current.fieldName] || "")
        pendingFocusRef.current = null
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create entry",
        variant: "destructive",
      })
    },
  })

  // Delete entry mutation - remove from local state
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/anpario-cc-entries/${id}`)
    },
    onSuccess: (_, deletedId) => {
      // Remove from local state
      setLocalEntries(prev => prev.filter(e => e.id !== deletedId))
      toast({
        title: "Entry Deleted",
        description: "Clearance entry has been removed",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry",
        variant: "destructive",
      })
    },
  })

  // Format month/year for dropdown
  const formatMonthYear = (month: number, year: number): string => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    return `${months[month - 1]}, ${year}`
  }

  // Calculate clearance count (only actual data rows with content)
  const clearanceCount = localEntries.filter(entry => 
    entry.containerNumber || entry.etaPort || entry.entryNumber || entry.poNumber
  ).length

  // Generate display rows - show actual entries plus one editable blank row for new data entry
  const displayRows: (AnparioCCEntry & { isBlank?: boolean })[] = [...localEntries]
  
  // Only add blank row if there are no entries OR if all entries have some data
  const shouldShowBlankRow = localEntries.length === 0 || localEntries.every(e => 
    e.containerNumber || e.etaPort || e.entryNumber || e.poNumber || e.notes
  )
  
  if (shouldShowBlankRow) {
    displayRows.push({
      id: `blank-new`,
      generalReferenceId: selectedReferenceId || '',
      containerNumber: null,
      etaPort: null,
      entryNumber: null,
      poNumber: null,
      notes: null,
      createdAt: new Date().toISOString(),
      isBlank: true,
    } as any)
  }

  // Handle cell click
  const handleCellClick = (entry: AnparioCCEntry & { isBlank?: boolean }, fieldName: string, currentValue: string) => {
    // Capture column widths before entering edit mode
    if (tableRef.current && !editingCell) {
      const headers = tableRef.current.querySelectorAll('thead th')
      const widths = Array.from(headers).map(th => th.getBoundingClientRect().width)
      setColumnWidths(widths)
    }

    // If clicking a cell in the blank row while editing another cell in the blank row,
    // mark this as a pending focus so we can restore it after the row is created
    if (editingCell?.entryId.startsWith('blank-') && entry.id.startsWith('blank-')) {
      pendingFocusRef.current = { fieldName, isNewRow: true }
    }

    setEditingCell({ entryId: entry.id, fieldName })
    setTempValue(currentValue || "")
  }

  // Handle save
  const handleSave = async () => {
    if (!editingCell || !selectedReferenceId) return

    const isEditingBlank = editingCell.entryId.startsWith('blank-')
    const trimmedValue = tempValue.trim()
    
    if (isEditingBlank) {
      // Only create entry if user actually entered something
      if (!trimmedValue) {
        // Cancel editing without creating empty row
        setEditingCell(null)
        setTempValue("")
        return
      }
      
      // Create a new entry
      const newEntryData: Partial<AnparioCCEntry> = {
        generalReferenceId: selectedReferenceId,
        etaPort: null,
        containerNumber: null,
        entryNumber: null,
        poNumber: null,
        notes: null,
        [editingCell.fieldName]: trimmedValue || null
      }
      
      // Clear editing state immediately
      setEditingCell(null)
      setTempValue("")
      
      // Save to server in background
      await createEntryMutation.mutateAsync(newEntryData)
    } else {
      // Update existing entry in local state immediately
      setLocalEntries(prev => prev.map(entry => 
        entry.id === editingCell.entryId 
          ? { ...entry, [editingCell.fieldName]: trimmedValue || null }
          : entry
      ))
      
      // Clear editing state immediately
      setEditingCell(null)
      setTempValue("")
      
      // Save to server in background
      const updateData: Partial<AnparioCCEntry> = {
        [editingCell.fieldName]: trimmedValue || null
      }
      updateEntryMutation.mutate({ id: editingCell.entryId, data: updateData })
    }
  }

  const handleCancel = () => {
    setEditingCell(null)
    setTempValue("")
  }

  // Handle keydown with Tab/Enter navigation
  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      
      // Capture editing context before save clears it
      const currentEditingCell = editingCell
      
      await handleSave()
      
      // Move to next cell using captured context
      if (currentEditingCell) {
        moveToNextCell(currentEditingCell)
      }
    } else if (e.key === "Tab") {
      e.preventDefault()
      
      // Capture editing context before save clears it
      const currentEditingCell = editingCell
      
      await handleSave()
      
      // Move to next cell using captured context
      if (currentEditingCell) {
        moveToNextCell(currentEditingCell)
      }
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  // Move to next cell (Tab/Enter behavior) - accepts current cell context as parameter
  const moveToNextCell = (currentCell: { entryId: string; fieldName: string }) => {
    // Field order matches column order: ETA Port, Container Number, PO Number, Entry Number, Notes
    const fieldOrder = ['etaPort', 'containerNumber', 'poNumber', 'entryNumber', 'notes']
    const currentFieldIndex = fieldOrder.indexOf(currentCell.fieldName)
    const currentEntryIndex = displayRows.findIndex(r => r.id === currentCell.entryId)

    if (currentFieldIndex === fieldOrder.length - 1) {
      // We're on Notes (last field) - move to first field of next row
      if (currentEntryIndex < displayRows.length - 1) {
        const nextEntry = displayRows[currentEntryIndex + 1]
        const nextValue = (nextEntry as any)[fieldOrder[0]] || ''
        handleCellClick(nextEntry, fieldOrder[0], nextValue)
      }
    } else {
      // Move to next field in same row
      const nextField = fieldOrder[currentFieldIndex + 1]
      const currentEntry = displayRows[currentEntryIndex]
      const nextValue = (currentEntry as any)[nextField] || ''
      handleCellClick(currentEntry, nextField, nextValue)
    }
  }

  // Render cell
  const renderCell = (entry: AnparioCCEntry & { isBlank?: boolean }, fieldName: string, width?: number) => {
    const isEditing = editingCell?.entryId === entry.id && editingCell.fieldName === fieldName
    const value = (entry as any)[fieldName] || ""

    if (isEditing) {
      return (
        <td 
          key={fieldName} 
          className="border px-2 py-0.5"
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
            autoComplete="off"
            data-testid={`input-${fieldName}-${entry.id}`}
          />
        </td>
      )
    }

    return (
      <td 
        key={fieldName} 
        className="border px-2 py-0.5 text-center cursor-pointer hover-elevate"
        style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
        onClick={() => handleCellClick(entry, fieldName, value)}
        data-testid={`cell-${fieldName}-${entry.id}`}
      >
        <span className="text-xs">{value}</span>
      </td>
    )
  }

  // Get row background color - green only if Entry Number has value
  const getRowColor = (entry: AnparioCCEntry & { isBlank?: boolean }) => {
    if (entry.isBlank) return ""
    return (entry.entryNumber && entry.entryNumber.toString().trim()) 
      ? "bg-green-100 dark:bg-green-900 dark:text-white" 
      : ""
  }

  // Handle Create Invoice
  const handleCreateInvoice = () => {
    if (!anparioCustomer) {
      toast({
        title: "Error",
        description: "Anpario PLC customer not found in database",
        variant: "destructive",
      })
      return
    }

    if (!selectedReference) {
      toast({
        title: "Error",
        description: "Please select a monthly reference",
        variant: "destructive",
      })
      return
    }

    if (!settings?.importClearanceFee || !settings?.inventoryLinkedFee) {
      toast({
        title: "Error",
        description: "Import Clearance Fee and Inventory Linked Fee must be set in Settings",
        variant: "destructive",
      })
      return
    }

    // Calculate total charge
    const importClearanceFee = parseFloat(settings.importClearanceFee)
    const inventoryLinkedFee = parseFloat(settings.inventoryLinkedFee)
    const totalCharge = clearanceCount * (importClearanceFee + inventoryLinkedFee)

    // Get end of month date in YYYY-MM-DD format
    const lastDay = new Date(selectedReference.year, selectedReference.month, 0).getDate()
    const endOfMonthDate = new Date(selectedReference.year, selectedReference.month - 1, lastDay)
    const endOfMonthStr = endOfMonthDate.toISOString().split('T')[0]

    // Open invoice window with pre-populated data
    openWindow({
      id: `invoice-anpario-${selectedReference.id}`,
      type: 'customer-invoice',
      title: `Invoice - Anpario EU CC ${formatMonthYear(selectedReference.month, selectedReference.year)}`,
      payload: {
        mode: 'create',
        jobType: 'general',
        jobRef: selectedReference.jobRef,  // Pass jobRef explicitly for general references
        generalReference: selectedReference,
        prePopulateData: {
          taxPointDate: endOfMonthStr,
          ourRef: selectedReference.jobRef.toString(),
          exportersRef: "",
          customerCompanyName: anparioCustomer.companyName,
          customerAddress: anparioCustomer.address || "",
          customerVatNumber: anparioCustomer.vatNumber || "",
          shipmentDetails: "",
          consignorName: anparioCustomer.companyName,
          consignorAddress: "",
          consigneeName: anparioCustomer.companyName,
          consigneeAddress: "",
          identifier: "N/A",
          vesselName: "N/A",
          portLoading: "N/A",
          portDischarge: "N/A",
          deliveryTerms: "N/A",
          destination: "N/A",
          lineItems: [
            {
              description: `Monthly EU Customs Clearances x ${clearanceCount}`,
              chargeAmount: totalCharge.toFixed(2),
              vatCode: "1",
              vatAmount: "0.00",
            }
          ],
        }
      }
    })
  }

  // Handle Create Statement
  const handleCreateStatement = async () => {
    if (!anparioCustomer) {
      toast({
        title: "Error",
        description: "Anpario PLC customer not found in database",
        variant: "destructive",
      })
      return
    }

    if (!selectedReference) {
      toast({
        title: "Error",
        description: "Please select a monthly reference",
        variant: "destructive",
      })
      return
    }

    if (!settings?.importClearanceFee || !settings?.inventoryLinkedFee) {
      toast({
        title: "Error",
        description: "Import Clearance Fee and Inventory Linked Fee must be set in Settings",
        variant: "destructive",
      })
      return
    }

    try {
      // Calculate total charge
      const importClearanceFee = parseFloat(settings.importClearanceFee)
      const inventoryLinkedFee = parseFloat(settings.inventoryLinkedFee)
      const totalCharge = clearanceCount * (importClearanceFee + inventoryLinkedFee)
      const vatAmount = 0 // Zero rated

      // Call statement generation API
      const response = await fetch('/api/anpario-cc-entries/generate-statement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          generalReferenceId: selectedReference.id,
          customerCompanyName: anparioCustomer.companyName,
          customerAddress: anparioCustomer.address || '',
          customerVatNumber: anparioCustomer.vatNumber || '',
          totalCharge: totalCharge.toFixed(2),
          vatAmount: vatAmount.toFixed(2),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate statement PDF')
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `RS Statement - ${selectedReference.jobRef}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Statement Generated",
        description: "Statement PDF has been downloaded successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate statement",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with month selector and buttons */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <label className="font-semibold whitespace-nowrap text-xs">Select Month:</label>
            <Select value={selectedReferenceId || ""} onValueChange={setSelectedReferenceId}>
              <SelectTrigger className="w-[250px]" data-testid="select-month-reference">
                <SelectValue placeholder="Select a month" />
              </SelectTrigger>
              <SelectContent>
                {anparioReferences.map(ref => (
                  <SelectItem key={ref.id} value={ref.id}>
                    {formatMonthYear(ref.month, ref.year)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedReference && (
              <div className="text-xs text-muted-foreground">
                Monthly Ref: <span className="font-semibold">{selectedReference.jobRef}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-md">
              {clearanceCount} Clearances
            </div>
            <Button variant="default" size="sm" onClick={handleCreateInvoice} data-testid="button-create-invoice">
              <FileText className="h-4 w-4 mr-1" />
              Create Invoice
            </Button>
            <Button variant="default" size="sm" onClick={handleCreateStatement} data-testid="button-create-breakdown">
              <FileBarChart className="h-4 w-4 mr-1" />
              Breakdown
            </Button>
          </div>
        </div>
      </Card>

      {/* Data grid */}
      {selectedReferenceId ? (
        <Card className="p-4">
          <div className="overflow-x-auto">
            <table ref={tableRef} className="w-full border-collapse">
              <thead>
                <tr className="border-b-2">
                  <th className="border px-2 py-0.5 text-center font-semibold bg-muted text-xs" style={columnWidths[0] ? { width: `${columnWidths[0]}px` } : {}}>ETA Port</th>
                  <th className="border px-2 py-0.5 text-center font-semibold bg-muted text-xs" style={columnWidths[1] ? { width: `${columnWidths[1]}px` } : {}}>Container Number</th>
                  <th className="border px-2 py-0.5 text-center font-semibold bg-muted text-xs" style={columnWidths[2] ? { width: `${columnWidths[2]}px` } : {}}>PO Number</th>
                  <th className="border px-2 py-0.5 text-center font-semibold bg-muted text-xs" style={columnWidths[3] ? { width: `${columnWidths[3]}px` } : {}}>Entry Number</th>
                  <th className="border px-2 py-0.5 text-center font-semibold bg-muted text-xs" style={columnWidths[4] ? { width: `${columnWidths[4]}px` } : {}}>Notes</th>
                  <th className="border px-2 py-0.5 text-center font-semibold bg-muted text-xs" style={columnWidths[5] ? { width: `${columnWidths[5]}px` } : {}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((entry) => (
                  <tr key={entry.id} className={`border-b ${getRowColor(entry)}`}>
                    {renderCell(entry, "etaPort", columnWidths[0])}
                    {renderCell(entry, "containerNumber", columnWidths[1])}
                    {renderCell(entry, "poNumber", columnWidths[2])}
                    {renderCell(entry, "entryNumber", columnWidths[3])}
                    {renderCell(entry, "notes", columnWidths[4])}
                    <td 
                      className="border px-2 py-0.5 text-center"
                      style={columnWidths[5] ? { width: `${columnWidths[5]}px`, minWidth: `${columnWidths[5]}px`, maxWidth: `${columnWidths[5]}px` } : {}}
                    >
                      {!entry.isBlank ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this entry?")) {
                              deleteEntryMutation.mutate(entry.id)
                            }
                          }}
                          data-testid={`button-delete-${entry.id}`}
                          className="h-auto px-1 py-0 text-xs min-h-0"
                        >
                          Delete
                        </Button>
                      ) : (
                        <span className="text-xs opacity-0">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">
          <p className="text-xs">No monthly references found. Create an "Anpario EU CC" general reference to get started.</p>
        </Card>
      )}
    </div>
  )
}
