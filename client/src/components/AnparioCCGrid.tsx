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
  const inputRef = useRef<HTMLInputElement>(null)
  const prevEditingCellRef = useRef<{ entryId: string; fieldName: string } | null>(null)

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
  const { data: entries = [] } = useQuery<AnparioCCEntry[]>({
    queryKey: ["/api/anpario-cc-entries/by-reference", selectedReferenceId],
    queryFn: async () => {
      if (!selectedReferenceId) return []
      const res = await fetch(`/api/anpario-cc-entries/by-reference/${selectedReferenceId}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch entries')
      return res.json()
    },
    enabled: !!selectedReferenceId,
  })

  // Fetch Anpario PLC customer
  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })
  const anparioCustomer = importCustomers.find(c => c.companyName === "Anpario PLC")

  // Fetch settings for fees
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings", { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch settings')
      const data = await res.json()
      return data[0] // Settings returns an array
    },
  })

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingCell])

  // Refresh data when exiting edit mode to sync with server
  useEffect(() => {
    // Only invalidate when truly exiting edit mode (going from editing to not editing)
    // Don't invalidate when moving between cells (both prevEditingCellRef and editingCell are non-null)
    const wasEditing = prevEditingCellRef.current !== null
    const isEditing = editingCell !== null
    
    if (wasEditing && !isEditing && selectedReferenceId) {
      // User has left editing mode completely - refresh to get server-normalized data
      queryClient.invalidateQueries({ queryKey: ["/api/anpario-cc-entries/by-reference", selectedReferenceId] })
    }
    
    // Update ref for next render
    prevEditingCellRef.current = editingCell
  }, [editingCell, selectedReferenceId])

  // Update entry mutation with optimistic updates
  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AnparioCCEntry> }) => {
      return await apiRequest("PATCH", `/api/anpario-cc-entries/${id}`, data)
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/anpario-cc-entries/by-reference", selectedReferenceId] })
      
      // Snapshot the previous value
      const previousEntries = queryClient.getQueryData<AnparioCCEntry[]>(["/api/anpario-cc-entries/by-reference", selectedReferenceId])
      
      // Optimistically update to the new value
      queryClient.setQueryData<AnparioCCEntry[]>(
        ["/api/anpario-cc-entries/by-reference", selectedReferenceId],
        (old) => old ? old.map(entry => entry.id === id ? { ...entry, ...data } : entry) : []
      )
      
      // Return context with the previous value
      return { previousEntries }
    },
    onSuccess: (_, variables) => {
      // Don't invalidate queries immediately - rely on optimistic updates
      // Only invalidate when we're done editing to avoid focus loss
      
      // Check if this was the last entry and auto-create a new row
      const isLastEntry = entries.length > 0 && variables.id === entries[entries.length - 1].id
      if (isLastEntry && selectedReferenceId) {
        // Auto-create new row
        createEntryMutation.mutate({
          generalReferenceId: selectedReferenceId,
          etaPort: null,
          containerNumber: null,
          entryNumber: null,
          poNumber: null,
          notes: null,
        })
      }
      
      // Don't clear editingCell here - let handleSave manage it to support tab navigation
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousEntries) {
        queryClient.setQueryData(["/api/anpario-cc-entries/by-reference", selectedReferenceId], context.previousEntries)
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update entry",
        variant: "destructive",
      })
    },
  })

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (data: Partial<AnparioCCEntry>) => {
      return await apiRequest("POST", "/api/anpario-cc-entries", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anpario-cc-entries/by-reference", selectedReferenceId] })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create entry",
        variant: "destructive",
      })
    },
  })

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/anpario-cc-entries/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anpario-cc-entries/by-reference", selectedReferenceId] })
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
  const clearanceCount = entries.filter(entry => 
    entry.containerNumber || entry.etaPort || entry.entryNumber || entry.poNumber
  ).length

  // Generate display rows - show actual entries plus one editable blank row for new data entry
  const displayRows: (AnparioCCEntry & { isBlank?: boolean })[] = [...entries]
  
  // Always add one editable blank row at the end for new entries
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

  // Handle cell click
  const handleCellClick = (entry: AnparioCCEntry & { isBlank?: boolean }, fieldName: string, currentValue: string) => {
    setEditingCell({ entryId: entry.id, fieldName })
    setTempValue(currentValue || "")
  }

  // Handle save
  const handleSave = async (options: { clearAfterSave?: boolean; cellId?: string; fieldName?: string } = {}) => {
    const { clearAfterSave = true, cellId, fieldName } = options
    
    if (!editingCell || !selectedReferenceId) return

    // If cellId/fieldName provided, only save if we're still on that cell
    if (cellId && fieldName) {
      if (editingCell.entryId !== cellId || editingCell.fieldName !== fieldName) {
        // We've moved to a different cell, don't save this one
        return
      }
    }

    // Capture the cell we're saving so we can check if we've moved to another cell
    const savingCell = editingCell
    const savingValue = tempValue

    try {
      // Check if we're editing a blank row (first blank when no entries exist)
      const isEditingFirstBlank = savingCell.entryId.startsWith('blank-')
      
      if (isEditingFirstBlank) {
        // Create a new entry
        const newEntryData: Partial<AnparioCCEntry> = {
          generalReferenceId: selectedReferenceId,
          etaPort: null,
          containerNumber: null,
          entryNumber: null,
          poNumber: null,
          notes: null,
          [savingCell.fieldName]: savingValue.trim() || null
        }
        
        await createEntryMutation.mutateAsync(newEntryData)
        
        // Only clear if we're still on the same cell (haven't tabbed away)
        if (clearAfterSave && editingCell?.entryId === savingCell.entryId && editingCell?.fieldName === savingCell.fieldName) {
          setEditingCell(null)
          setTempValue("")
        }
      } else {
        // Update existing entry
        const updateData: Partial<AnparioCCEntry> = {
          [savingCell.fieldName]: savingValue.trim() || null
        }
        
        await updateEntryMutation.mutateAsync({ id: savingCell.entryId, data: updateData })
        
        // Only clear if we're still on the same cell (haven't tabbed away)
        if (clearAfterSave && editingCell?.entryId === savingCell.entryId && editingCell?.fieldName === savingCell.fieldName) {
          setEditingCell(null)
          setTempValue("")
        }
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Invalid input",
        variant: "destructive",
      })
    }
  }

  // Handle keydown
  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      await handleSave()
    } else if (e.key === "Escape") {
      setEditingCell(null)
      setTempValue("")
    } else if (e.key === "Tab" && editingCell) {
      e.preventDefault()
      
      // Define field order for tab navigation (matches left-to-right column order)
      const fieldOrder = ['etaPort', 'containerNumber', 'entryNumber', 'poNumber', 'notes']
      const currentFieldIndex = fieldOrder.indexOf(editingCell.fieldName)
      
      // Don't tab from notes column (it's the last field)
      if (editingCell.fieldName === 'notes') {
        return
      }
      
      // Check if we're on a blank row
      const isBlankRow = editingCell.entryId.startsWith('blank-')
      
      if (isBlankRow) {
        // For blank rows, we must await to get the new entry ID
        try {
          await handleSave({ clearAfterSave: false })
          // After save, refetch to get the new entry
          await queryClient.invalidateQueries({ queryKey: ["/api/anpario-cc-entries/by-reference", selectedReferenceId] })
          // Wait a moment for the refetch
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Find the newly created entry (it will be the last one)
          const updatedEntries = queryClient.getQueryData<AnparioCCEntry[]>(["/api/anpario-cc-entries/by-reference", selectedReferenceId])
          if (updatedEntries && updatedEntries.length > 0) {
            const newEntry = updatedEntries[updatedEntries.length - 1]
            const nextField = fieldOrder[currentFieldIndex + 1]
            const nextValue = (newEntry as any)[nextField] || ''
            handleCellClick(newEntry, nextField, nextValue)
          }
        } catch (error) {
          toast({
            title: "Save Error",
            description: error instanceof Error ? error.message : "Failed to save",
            variant: "destructive",
          })
        }
      } else {
        // For existing rows, move immediately (optimistic updates handle UI)
        if (currentFieldIndex < fieldOrder.length - 1) {
          const nextField = fieldOrder[currentFieldIndex + 1]
          const currentEntry = displayRows.find(r => r.id === editingCell.entryId)
          if (currentEntry) {
            const nextValue = (currentEntry as any)[nextField] || ''
            
            // Start save in background (won't clear editingCell since we're moving to new cell)
            handleSave({ clearAfterSave: false }).catch(error => {
              toast({
                title: "Save Error",
                description: error instanceof Error ? error.message : "Failed to save",
                variant: "destructive",
              })
            })
            
            // Move focus immediately
            handleCellClick(currentEntry, nextField, nextValue)
          }
        }
      }
    }
  }

  // Render cell
  const renderCell = (entry: AnparioCCEntry & { isBlank?: boolean }, fieldName: string) => {
    const isEditing = editingCell?.entryId === entry.id && editingCell.fieldName === fieldName
    
    // Define fixed widths for each column
    const widthClass = {
      etaPort: 'w-28',
      containerNumber: 'w-40',
      entryNumber: 'w-32',
      poNumber: 'w-32',
      notes: 'w-64'
    }[fieldName] || 'w-32'
    
    const value = (entry as any)[fieldName] || ""

    if (isEditing) {
      return (
        <td 
          key={fieldName} 
          className={`border px-2 py-1 ${widthClass}`}
        >
          <input
            ref={inputRef}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => handleSave({ cellId: entry.id, fieldName })}
            className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center focus:outline-none"
            data-testid={`input-${fieldName}-${entry.id}`}
          />
        </td>
      )
    }

    return (
      <td 
        key={fieldName} 
        className={`border px-2 py-1 text-center cursor-pointer hover-elevate ${widthClass}`}
        onClick={() => handleCellClick(entry, fieldName, value)}
        data-testid={`cell-${fieldName}-${entry.id}`}
      >
        <span className="text-xs">{value}</span>
      </td>
    )
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
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="border px-2 py-1 text-center font-semibold bg-muted text-xs w-28">ETA Port</th>
                  <th className="border px-2 py-1 text-center font-semibold bg-muted text-xs w-40">Container Number</th>
                  <th className="border px-2 py-1 text-center font-semibold bg-muted text-xs w-32">Entry Number</th>
                  <th className="border px-2 py-1 text-center font-semibold bg-muted text-xs w-32">PO Number</th>
                  <th className="border px-2 py-1 text-center font-semibold bg-muted text-xs w-64">Notes</th>
                  <th className="border px-2 py-1 text-center font-semibold bg-muted text-xs w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((entry) => {
                  const hasEntryNumber = !entry.isBlank && entry.entryNumber
                  return (
                  <tr 
                    key={entry.id} 
                    className={`border-b ${hasEntryNumber ? 'bg-green-100 dark:bg-green-950 hover:bg-green-200 dark:hover:bg-green-900' : 'hover:bg-muted/50'}`}
                  >
                    {renderCell(entry, "etaPort")}
                    {renderCell(entry, "containerNumber")}
                    {renderCell(entry, "entryNumber")}
                    {renderCell(entry, "poNumber")}
                    {renderCell(entry, "notes")}
                    <td className="border px-2 py-1 text-center w-24">
                      {!entry.isBlank && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this entry?")) {
                              deleteEntryMutation.mutate(entry.id)
                            }
                          }}
                          data-testid={`button-delete-${entry.id}`}
                          className="h-auto min-h-6 px-2 py-0 text-xs whitespace-nowrap"
                        >
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                  )
                })}
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
