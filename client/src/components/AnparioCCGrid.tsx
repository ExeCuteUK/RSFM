import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Plus, FileText, FileBarChart } from "lucide-react"
import { type GeneralReference, type AnparioCCEntry, type ImportCustomer, type Settings } from "@shared/schema"
import { useWindowManager } from "@/contexts/WindowManagerContext"

export function AnparioCCGrid() {
  const { toast } = useToast()
  const { openWindow } = useWindowManager()
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<{ entryId: string; fieldName: string } | null>(null)
  const [tempValue, setTempValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch all general references with "Anpario EU CC" name
  const { data: allReferences = [] } = useQuery<GeneralReference[]>({
    queryKey: ["/api/general-references"],
  })

  // Filter to only Anpario EU CC references and sort by date descending
  const anparioReferences = allReferences
    .filter(ref => ref.referenceName === "Anpario EU CC")
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

  // Update entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AnparioCCEntry> }) => {
      return await apiRequest("PATCH", `/api/anpario-cc-entries/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anpario-cc-entries/by-reference", selectedReferenceId] })
      toast({
        title: "Entry Updated",
        description: "Clearance entry has been updated successfully",
      })
    },
    onError: (error: Error) => {
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
      toast({
        title: "Entry Created",
        description: "New clearance entry has been added",
      })
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

  // Format date as DD/MM/YY
  const formatDateDDMMYY = (dateStr: string | null): string => {
    if (!dateStr) return ""
    try {
      const date = new Date(dateStr)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = String(date.getFullYear()).slice(-2)
      return `${day}/${month}/${year}`
    } catch {
      return ""
    }
  }

  // Validate and convert DD/MM/YY to YYYY-MM-DD
  const validateAndConvertDate = (dateStr: string): string | null => {
    if (!dateStr.trim()) return null
    
    const ddmmyyPattern = /^(\d{2})\/(\d{2})\/(\d{2})$/
    const match = dateStr.match(ddmmyyPattern)
    
    if (!match) {
      throw new Error("Date must be in DD/MM/YY format")
    }
    
    const [, day, month, year] = match
    const fullYear = `20${year}`
    return `${fullYear}-${month}-${day}`
  }

  // Handle cell click
  const handleCellClick = (entryId: string, fieldName: string, currentValue: string) => {
    setTempValue(currentValue || "")
    setEditingCell({ entryId, fieldName })
  }

  // Handle save
  const handleSave = async (entryId: string, fieldName: string, value: string) => {
    try {
      const updateData: Partial<AnparioCCEntry> = {}
      
      if (fieldName === "etaPort") {
        const convertedDate = validateAndConvertDate(value)
        ;(updateData as any)[fieldName] = convertedDate
      } else {
        ;(updateData as any)[fieldName] = value.trim() || null
      }
      
      await updateEntryMutation.mutateAsync({ id: entryId, data: updateData })
      setEditingCell(null)
      setTempValue("")
    } catch (error) {
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Invalid input",
        variant: "destructive",
      })
    }
  }

  // Handle cancel
  const handleCancel = () => {
    setEditingCell(null)
    setTempValue("")
  }

  // Add new row
  const handleAddRow = () => {
    if (!selectedReferenceId) {
      toast({
        title: "Error",
        description: "Please select a monthly reference first",
        variant: "destructive",
      })
      return
    }

    createEntryMutation.mutate({
      generalReferenceId: selectedReferenceId,
      etaPort: null,
      containerNumber: null,
      entryNumber: null,
      poNumber: null,
      notes: null,
    })
  }

  // Calculate clearance count (only actual data rows, exclude empty rows)
  const clearanceCount = entries.filter(entry => 
    entry.containerNumber || entry.etaPort || entry.entryNumber || entry.poNumber
  ).length

  // Generate display rows (minimum 25 rows)
  const displayRows = [...entries]
  const blankRowsNeeded = Math.max(0, 25 - entries.length)
  for (let i = 0; i < blankRowsNeeded; i++) {
    displayRows.push({
      id: `blank-${i}`,
      generalReferenceId: selectedReferenceId || '',
      containerNumber: null,
      etaPort: null,
      entryNumber: null,
      poNumber: null,
      notes: null,
      createdAt: new Date().toISOString(),
    } as AnparioCCEntry)
  }

  // Get last day of month
  const getLastDayOfMonth = (month: number, year: number): string => {
    const lastDay = new Date(year, month, 0).getDate()
    const day = String(lastDay).padStart(2, '0')
    const mon = String(month).padStart(2, '0')
    const yr = String(year).slice(-2)
    return `${day}/${mon}/${yr}`
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
            <label className="font-semibold whitespace-nowrap">Select Month:</label>
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
              <div className="text-sm text-muted-foreground">
                Monthly Ref: <span className="font-semibold">{selectedReference.jobRef}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-md">
              {clearanceCount} Clearances
            </div>
            <Button variant="default" size="sm" onClick={handleCreateInvoice} data-testid="button-create-invoice">
              <FileText className="h-4 w-4 mr-1" />
              Create Invoice
            </Button>
            <Button variant="default" size="sm" onClick={handleCreateStatement} data-testid="button-create-statement">
              <FileBarChart className="h-4 w-4 mr-1" />
              Create Statement
            </Button>
            <Button variant="outline" size="sm" onClick={handleAddRow} data-testid="button-add-row">
              <Plus className="h-4 w-4 mr-1" />
              Add Row
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
                  <th className="p-2 text-center font-semibold bg-muted text-xs">ETA Port</th>
                  <th className="p-2 text-center font-semibold bg-muted text-xs">Container Number</th>
                  <th className="p-2 text-center font-semibold bg-muted text-xs">Entry Number</th>
                  <th className="p-2 text-center font-semibold bg-muted text-xs">PO Number</th>
                  <th className="p-2 text-center font-semibold bg-muted text-xs">Notes</th>
                  <th className="p-2 text-center font-semibold bg-muted text-xs w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((entry, index) => {
                  const isBlankRow = entry.id.startsWith('blank-')
                  return (
                  <tr key={entry.id} className="border-b hover:bg-muted/50">
                    {/* ETA Port */}
                    <td className="p-2 text-center">
                      {!isBlankRow && editingCell?.entryId === entry.id && editingCell.fieldName === "etaPort" ? (
                        <Input
                          ref={inputRef}
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleSave(entry.id, "etaPort", tempValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(entry.id, "etaPort", tempValue)
                            if (e.key === "Escape") handleCancel()
                          }}
                          placeholder="DD/MM/YY"
                          className="h-8 text-center text-xs"
                          data-testid={`input-eta-port-${index}`}
                        />
                      ) : (
                        <div
                          onClick={() => !isBlankRow && handleCellClick(entry.id, "etaPort", formatDateDDMMYY(entry.etaPort))}
                          className={`${!isBlankRow ? 'cursor-pointer hover:bg-accent' : ''} p-1 rounded min-h-[32px] flex items-center justify-center text-xs`}
                          data-testid={`cell-eta-port-${index}`}
                        >
                          {formatDateDDMMYY(entry.etaPort)}
                        </div>
                      )}
                    </td>

                    {/* Container Number */}
                    <td className="p-2 text-center">
                      {!isBlankRow && editingCell?.entryId === entry.id && editingCell.fieldName === "containerNumber" ? (
                        <Input
                          ref={inputRef}
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleSave(entry.id, "containerNumber", tempValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(entry.id, "containerNumber", tempValue)
                            if (e.key === "Escape") handleCancel()
                          }}
                          className="h-8 text-center text-xs"
                          data-testid={`input-container-number-${index}`}
                        />
                      ) : (
                        <div
                          onClick={() => !isBlankRow && handleCellClick(entry.id, "containerNumber", entry.containerNumber || "")}
                          className={`${!isBlankRow ? 'cursor-pointer hover:bg-accent' : ''} p-1 rounded min-h-[32px] flex items-center justify-center text-xs`}
                          data-testid={`cell-container-number-${index}`}
                        >
                          {entry.containerNumber}
                        </div>
                      )}
                    </td>

                    {/* Entry Number */}
                    <td className="p-2 text-center">
                      {!isBlankRow && editingCell?.entryId === entry.id && editingCell.fieldName === "entryNumber" ? (
                        <Input
                          ref={inputRef}
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleSave(entry.id, "entryNumber", tempValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(entry.id, "entryNumber", tempValue)
                            if (e.key === "Escape") handleCancel()
                          }}
                          className="h-8 text-center text-xs"
                          data-testid={`input-entry-number-${index}`}
                        />
                      ) : (
                        <div
                          onClick={() => !isBlankRow && handleCellClick(entry.id, "entryNumber", entry.entryNumber || "")}
                          className={`${!isBlankRow ? 'cursor-pointer hover:bg-accent' : ''} p-1 rounded min-h-[32px] flex items-center justify-center text-xs`}
                          data-testid={`cell-entry-number-${index}`}
                        >
                          {entry.entryNumber}
                        </div>
                      )}
                    </td>

                    {/* PO Number */}
                    <td className="p-2 text-center">
                      {!isBlankRow && editingCell?.entryId === entry.id && editingCell.fieldName === "poNumber" ? (
                        <Input
                          ref={inputRef}
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleSave(entry.id, "poNumber", tempValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(entry.id, "poNumber", tempValue)
                            if (e.key === "Escape") handleCancel()
                          }}
                          className="h-8 text-center text-xs"
                          data-testid={`input-po-number-${index}`}
                        />
                      ) : (
                        <div
                          onClick={() => !isBlankRow && handleCellClick(entry.id, "poNumber", entry.poNumber || "")}
                          className={`${!isBlankRow ? 'cursor-pointer hover:bg-accent' : ''} p-1 rounded min-h-[32px] flex items-center justify-center text-xs`}
                          data-testid={`cell-po-number-${index}`}
                        >
                          {entry.poNumber}
                        </div>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="p-2 text-center">
                      {!isBlankRow && editingCell?.entryId === entry.id && editingCell.fieldName === "notes" ? (
                        <Input
                          ref={inputRef}
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleSave(entry.id, "notes", tempValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(entry.id, "notes", tempValue)
                            if (e.key === "Escape") handleCancel()
                          }}
                          className="h-8 text-center text-xs"
                          data-testid={`input-notes-${index}`}
                        />
                      ) : (
                        <div
                          onClick={() => !isBlankRow && handleCellClick(entry.id, "notes", entry.notes || "")}
                          className={`${!isBlankRow ? 'cursor-pointer hover:bg-accent' : ''} p-1 rounded min-h-[32px] flex items-center justify-center text-xs`}
                          data-testid={`cell-notes-${index}`}
                        >
                          {entry.notes}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-2 text-center">
                      {!isBlankRow && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this entry?")) {
                              deleteEntryMutation.mutate(entry.id)
                            }
                          }}
                          data-testid={`button-delete-${index}`}
                          className="h-8 px-2 text-xs"
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
          <p>No monthly references found. Create an "Anpario EU CC" general reference to get started.</p>
        </Card>
      )}
    </div>
  )
}
