import { useState, useRef, useEffect } from 'react'
import { useWindowManager } from '@/contexts/WindowManagerContext'
import { DraggableWindow } from './DraggableWindow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, X, CheckCircle2, XCircle } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import type { ImportShipment, ExportShipment, CustomClearance, ImportCustomer, ExportCustomer } from '@shared/schema'

interface ExpenseInvoiceWindowProps {
  windowId: string
}

interface InvoiceRow {
  id: string
  jobRef: string
  companyName: string
  invoiceNumber: string
  invoiceDate: string
  invoiceAmount: string
}

interface JobInfo {
  exists: boolean
  type?: 'Import' | 'Export' | 'Clearance'
  identifier?: string
  bookingDate?: string
  customerName?: string
}

export function ExpenseInvoiceWindow({ windowId }: ExpenseInvoiceWindowProps) {
  const { closeWindow, minimizeWindow } = useWindowManager()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<InvoiceRow[]>([
    { id: '1', jobRef: '', companyName: '', invoiceNumber: '', invoiceDate: '', invoiceAmount: '' }
  ])
  const [jobInfoMap, setJobInfoMap] = useState<{ [invoiceId: string]: JobInfo }>({})
  const jobRefInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const invoiceNumberInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [focusRowId, setFocusRowId] = useState<string | null>(null)

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

  // Focus the job ref input when a new row is added
  useEffect(() => {
    if (focusRowId && jobRefInputRefs.current[focusRowId]) {
      jobRefInputRefs.current[focusRowId]?.focus()
      setFocusRowId(null)
    }
  }, [focusRowId])

  // Scroll to bottom when entering data in the last row
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    // When a new invoice row is added, scroll to bottom
    if (invoices.length > 1) {
      scrollToBottom()
    }
  }, [invoices.length])

  const createMutation = useMutation({
    mutationFn: async (data: { invoices: any[] }) => {
      const response = await apiRequest('POST', '/api/purchase-invoices/batch', {
        invoices: data.invoices
      })
      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/purchase-invoices'] })
      toast({ title: 'Success', description: 'Expense invoices created successfully' })
      closeWindow(windowId)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create expense invoices',
        variant: 'destructive'
      })
    }
  })

  const getJobInfo = (jobRefStr: string): JobInfo => {
    const jobRefNum = parseInt(jobRefStr)
    if (isNaN(jobRefNum) || jobRefNum < 26001) {
      return { exists: false }
    }

    // Check import shipments
    const importShipment = importShipments.find(s => s.jobRef === jobRefNum)
    if (importShipment) {
      const customer = importCustomers.find(c => c.id === importShipment.importCustomerId)
      return {
        exists: true,
        type: 'Import',
        identifier: importShipment.trailerOrContainerNumber || 'N/A',
        bookingDate: importShipment.bookingDate || 'N/A',
        customerName: customer?.companyName || 'Unknown Customer'
      }
    }

    // Check export shipments
    const exportShipment = exportShipments.find(s => s.jobRef === jobRefNum)
    if (exportShipment) {
      const customer = exportCustomers.find(c => c.id === exportShipment.destinationCustomerId)
      return {
        exists: true,
        type: 'Export',
        identifier: exportShipment.trailerNo || 'N/A',
        bookingDate: exportShipment.bookingDate || 'N/A',
        customerName: customer?.companyName || 'Unknown Customer'
      }
    }

    // Check custom clearances
    const clearance = customClearances.find(c => c.jobRef === jobRefNum)
    if (clearance) {
      let customerName = 'Unknown Customer'
      if (clearance.importCustomerId) {
        const customer = importCustomers.find(c => c.id === clearance.importCustomerId)
        customerName = customer?.companyName || 'Unknown Customer'
      } else if (clearance.exportCustomerId) {
        const customer = exportCustomers.find(c => c.id === clearance.exportCustomerId)
        customerName = customer?.companyName || 'Unknown Customer'
      }
      
      return {
        exists: true,
        type: 'Clearance',
        identifier: clearance.trailerOrContainerNumber || 'N/A',
        bookingDate: clearance.etaPort || 'N/A',
        customerName
      }
    }

    return { exists: false }
  }

  const handleJobRefChange = (invoiceId: string, value: string) => {
    updateInvoice(invoiceId, 'jobRef', value)
    
    // Validate job ref if it's complete enough
    if (value.length >= 5) {
      const jobInfo = getJobInfo(value)
      setJobInfoMap(prev => ({
        ...prev,
        [invoiceId]: jobInfo
      }))
    } else {
      // Clear job info if job ref is too short
      setJobInfoMap(prev => {
        const newMap = { ...prev }
        delete newMap[invoiceId]
        return newMap
      })
    }
  }

  const addInvoiceRow = (afterId?: string) => {
    const newId = (Math.max(...invoices.map(i => parseInt(i.id)), 0) + 1).toString()
    const newRow = { id: newId, jobRef: '', companyName: '', invoiceNumber: '', invoiceDate: '', invoiceAmount: '' }
    
    if (afterId) {
      const index = invoices.findIndex(inv => inv.id === afterId)
      const newInvoices = [...invoices]
      newInvoices.splice(index + 1, 0, newRow)
      setInvoices(newInvoices)
    } else {
      setInvoices([...invoices, newRow])
    }
    
    setFocusRowId(newId)
  }

  const removeInvoiceRow = (id: string) => {
    if (invoices.length > 1) {
      setInvoices(invoices.filter(inv => inv.id !== id))
      // Remove job info for this invoice
      setJobInfoMap(prev => {
        const newMap = { ...prev }
        delete newMap[id]
        return newMap
      })
    }
  }

  const updateInvoice = (id: string, field: keyof InvoiceRow, value: string) => {
    setInvoices(invoices.map(inv => 
      inv.id === id ? { ...inv, [field]: value } : inv
    ))
  }

  const handleCompanyNameChange = (invoiceId: string, value: string) => {
    const previousValue = invoices.find(inv => inv.id === invoiceId)?.companyName || ''
    updateInvoice(invoiceId, 'companyName', value)
    
    // Check if value matches one of the datalist options (autocomplete was used)
    const existingCompanyNames = invoices
      .filter(inv => inv.id !== invoiceId && inv.companyName.trim())
      .map(inv => inv.companyName)
      .filter((name, idx, arr) => arr.indexOf(name) === idx)
    
    // If the value changed to match an existing company name and it wasn't just a character being typed
    if (value && existingCompanyNames.includes(value) && value !== previousValue && value.length > previousValue.length) {
      // Focus the invoice number field
      setTimeout(() => {
        invoiceNumberInputRefs.current[invoiceId]?.focus()
      }, 0)
    }
  }

  const validateJobRef = (jobRefStr: string): boolean => {
    const jobInfo = getJobInfo(jobRefStr)
    return jobInfo.exists
  }

  const handleAmountKeyPress = (e: React.KeyboardEvent, invoiceId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addInvoiceRow(invoiceId)
    }
  }

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'dd/MM/yyyy')
    } catch {
      return 'N/A'
    }
  }

  const handleSubmit = () => {
    // Validate and prepare invoices
    const validInvoices = invoices.filter(inv => 
      inv.jobRef.trim() &&
      inv.companyName.trim() && 
      inv.invoiceNumber.trim() && 
      inv.invoiceDate && 
      inv.invoiceAmount.trim()
    )

    if (validInvoices.length === 0) {
      toast({
        title: 'No Valid Invoices',
        description: 'Please fill in at least one complete invoice',
        variant: 'destructive'
      })
      return
    }

    // Validate job references
    const invalidJobRefs = validInvoices.filter(inv => !validateJobRef(inv.jobRef))
    if (invalidJobRefs.length > 0) {
      const invalidRefs = invalidJobRefs.map(inv => inv.jobRef).join(', ')
      toast({
        title: 'Invalid Job Reference(s)',
        description: `The following job references do not exist: ${invalidRefs}`,
        variant: 'destructive'
      })
      return
    }
    
    // Validate all amounts are valid numbers
    const invalidAmounts = validInvoices.filter(inv => {
      const amount = parseFloat(inv.invoiceAmount)
      return isNaN(amount) || amount <= 0
    })
    
    if (invalidAmounts.length > 0) {
      toast({
        title: 'Invalid Amount',
        description: 'All invoice amounts must be valid positive numbers',
        variant: 'destructive'
      })
      return
    }
    
    const invoiceData = validInvoices.map(inv => ({
      jobRef: parseInt(inv.jobRef),
      companyName: inv.companyName.trim(),
      invoiceNumber: inv.invoiceNumber.trim(),
      invoiceDate: inv.invoiceDate,
      invoiceAmount: parseFloat(inv.invoiceAmount)
    }))

    createMutation.mutate({ invoices: invoiceData })
  }

  const handleCancel = () => {
    closeWindow(windowId)
  }

  // Check if form is valid (all fields filled and all job refs valid)
  const isFormValid = () => {
    // Check if at least one invoice has all fields filled
    const hasCompleteInvoice = invoices.some(inv => 
      inv.jobRef.trim() &&
      inv.companyName.trim() && 
      inv.invoiceNumber.trim() && 
      inv.invoiceDate && 
      inv.invoiceAmount.trim()
    )
    
    if (!hasCompleteInvoice) {
      return false
    }

    // Check if any filled invoice has invalid job reference
    for (const invoice of invoices) {
      // Only validate if at least job ref is filled
      if (invoice.jobRef.trim()) {
        const jobInfo = jobInfoMap[invoice.id]
        // If job info exists and shows invalid, or if job ref is long enough but no info yet
        if (invoice.jobRef.length >= 5) {
          if (!jobInfo || !jobInfo.exists) {
            return false
          }
        }
        
        // If any field is partially filled, check if all required fields are filled
        if (invoice.companyName.trim() || invoice.invoiceNumber.trim() || 
            invoice.invoiceDate || invoice.invoiceAmount.trim()) {
          // If any required field is empty, form is invalid
          if (!invoice.jobRef.trim() || !invoice.companyName.trim() || 
              !invoice.invoiceNumber.trim() || !invoice.invoiceDate || 
              !invoice.invoiceAmount.trim()) {
            return false
          }
        }
      }
    }
    
    return true
  }

  return (
    <DraggableWindow
      id={windowId}
      title="Add Expense Invoices"
      onClose={handleCancel}
      onMinimize={() => minimizeWindow(windowId)}
      width={1100}
      height={720}
    >
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Invoice Details</h3>
          <Button
            onClick={() => addInvoiceRow()}
            variant="outline"
            size="sm"
            data-testid="button-add-invoice-row"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Invoice
          </Button>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-auto mb-4">
          <div className="space-y-2">
            {invoices.map((invoice, index) => {
              const jobInfo = jobInfoMap[invoice.id]
              return (
                <div key={invoice.id} className="space-y-1">
                  <div
                    className="grid grid-cols-[110px_1fr_0.67fr_130px_80px_auto_auto] gap-2 items-end p-3 border rounded-md bg-card"
                    data-testid={`invoice-row-${index}`}
                  >
                    <div>
                      <Label htmlFor={`jobRef-${invoice.id}`} className="text-xs">Job Ref</Label>
                      <Input
                        ref={(el) => (jobRefInputRefs.current[invoice.id] = el)}
                        id={`jobRef-${invoice.id}`}
                        type="number"
                        value={invoice.jobRef}
                        onChange={(e) => handleJobRefChange(invoice.id, e.target.value)}
                        placeholder="26001"
                        className="mt-1"
                        data-testid={`input-job-ref-${index}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`companyName-${invoice.id}`} className="text-xs">Company Name</Label>
                      <Input
                        id={`companyName-${invoice.id}`}
                        value={invoice.companyName}
                        onChange={(e) => handleCompanyNameChange(invoice.id, e.target.value)}
                        placeholder="Company name"
                        className="mt-1"
                        list={`companyNames-${invoice.id}`}
                        data-testid={`input-company-name-${index}`}
                      />
                      <datalist id={`companyNames-${invoice.id}`}>
                        {invoices
                          .filter(inv => inv.id !== invoice.id && inv.companyName.trim())
                          .map(inv => inv.companyName)
                          .filter((name, idx, arr) => arr.indexOf(name) === idx)
                          .map((name, idx) => (
                            <option key={idx} value={name} />
                          ))
                        }
                      </datalist>
                    </div>

                    <div>
                      <Label htmlFor={`invoiceNumber-${invoice.id}`} className="text-xs">Invoice Number</Label>
                      <Input
                        ref={(el) => (invoiceNumberInputRefs.current[invoice.id] = el)}
                        id={`invoiceNumber-${invoice.id}`}
                        value={invoice.invoiceNumber}
                        onChange={(e) => updateInvoice(invoice.id, 'invoiceNumber', e.target.value)}
                        placeholder="Invoice #"
                        className="mt-1"
                        data-testid={`input-invoice-number-${index}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`invoiceDate-${invoice.id}`} className="text-xs">Invoice Date</Label>
                      <Input
                        id={`invoiceDate-${invoice.id}`}
                        type="date"
                        value={invoice.invoiceDate}
                        onChange={(e) => updateInvoice(invoice.id, 'invoiceDate', e.target.value)}
                        className="mt-1 [&::-webkit-calendar-picker-indicator]:hidden"
                        data-testid={`input-invoice-date-${index}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`invoiceAmount-${invoice.id}`} className="text-xs">Amount (£)</Label>
                      <Input
                        id={`invoiceAmount-${invoice.id}`}
                        type="number"
                        step="0.01"
                        value={invoice.invoiceAmount}
                        onChange={(e) => updateInvoice(invoice.id, 'invoiceAmount', e.target.value)}
                        onKeyPress={(e) => handleAmountKeyPress(e, invoice.id)}
                        placeholder="0.00"
                        className="mt-1"
                        data-testid={`input-invoice-amount-${index}`}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => addInvoiceRow(invoice.id)}
                      className="mt-1"
                      title="Add new line"
                      data-testid={`button-add-after-${index}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInvoiceRow(invoice.id)}
                      disabled={invoices.length === 1}
                      className="mt-1"
                      title="Remove line"
                      data-testid={`button-remove-invoice-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {invoice.jobRef.length >= 5 && (
                    <div className="ml-4 px-3 py-1.5 border-l-4 bg-muted/30 rounded-r-md text-xs">
                      {jobInfo?.exists ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              Job #{invoice.jobRef} - Valid {jobInfo.type} Job
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span>
                              <span className="text-muted-foreground">Customer: </span>
                              <span className="font-medium">{jobInfo.customerName}</span>
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span>
                              <span className="text-muted-foreground">Identifier: </span>
                              <span className="font-medium">{jobInfo.identifier}</span>
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span>
                              <span className="text-muted-foreground">Booking Date: </span>
                              <span className="font-medium">{formatDate(jobInfo.bookingDate)}</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                          <div className="font-semibold text-red-600 dark:text-red-400">
                            Job #{invoice.jobRef} does not exist
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !isFormValid()}
            data-testid="button-submit"
          >
            {createMutation.isPending ? 'Saving...' : 'Save Invoices'}
          </Button>
        </div>
      </div>
    </DraggableWindow>
  )
}
