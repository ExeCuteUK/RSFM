import { useState, useRef, useEffect } from 'react'
import { useWindowManager } from '@/contexts/WindowManagerContext'
import { DraggableWindow } from './DraggableWindow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Plus, X, CheckCircle2, XCircle, AlertTriangle, CalendarIcon } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import { format, parse } from 'date-fns'
import type { ImportShipment, ExportShipment, CustomClearance, ImportCustomer, ExportCustomer } from '@shared/schema'

interface ExpenseInvoiceWindowProps {
  windowId: string
  payload?: {
    initialData?: {
      jobRef?: string
      companyName?: string
      invoiceNumber?: string
      invoiceDate?: string
      invoiceAmount?: string
    }
  }
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

export function ExpenseInvoiceWindow({ windowId, payload }: ExpenseInvoiceWindowProps) {
  const { closeWindow, minimizeWindow } = useWindowManager()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<InvoiceRow[]>(() => {
    const initialData = payload?.initialData
    if (initialData) {
      return [{ 
        id: '1', 
        jobRef: initialData.jobRef || '', 
        companyName: initialData.companyName || '', 
        invoiceNumber: initialData.invoiceNumber || '', 
        invoiceDate: initialData.invoiceDate || '', 
        invoiceAmount: initialData.invoiceAmount || '' 
      }]
    }
    return [{ id: '1', jobRef: '', companyName: '', invoiceNumber: '', invoiceDate: '', invoiceAmount: '' }]
  })
  const [jobInfoMap, setJobInfoMap] = useState<{ [invoiceId: string]: JobInfo }>({})
  const jobRefInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const companyNameInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const invoiceNumberInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const invoiceDateInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const invoiceAmountInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
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

  // Validate pre-filled job references when data loads
  useEffect(() => {
    // Only run if we have job data loaded
    if (importShipments.length === 0 && exportShipments.length === 0 && customClearances.length === 0) {
      return
    }

    // Validate any invoices that have a jobRef value
    const newJobInfoMap: { [invoiceId: string]: JobInfo } = {}
    let hasUpdates = false

    invoices.forEach(invoice => {
      if (invoice.jobRef && invoice.jobRef.length >= 5) {
        const jobInfo = getJobInfo(invoice.jobRef)
        newJobInfoMap[invoice.id] = jobInfo
        hasUpdates = true
      }
    })

    if (hasUpdates) {
      setJobInfoMap(prev => ({
        ...prev,
        ...newJobInfoMap
      }))
    }
  }, [importShipments, exportShipments, customClearances, importCustomers, exportCustomers])

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
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      
      // Find the current invoice index
      const currentIndex = invoices.findIndex(inv => inv.id === invoiceId)
      const isLastRow = currentIndex === invoices.length - 1
      
      if (isLastRow) {
        // If it's the last row, add a new row
        addInvoiceRow(invoiceId)
      } else {
        // If there's a row below, focus the next row's job ref field
        const nextInvoice = invoices[currentIndex + 1]
        if (nextInvoice && jobRefInputRefs.current[nextInvoice.id]) {
          jobRefInputRefs.current[nextInvoice.id]?.focus()
        }
      }
    }
  }

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'dd/MM/yy')
    } catch {
      return 'N/A'
    }
  }

  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return ''
    try {
      return format(new Date(dateString), 'dd/MM/yy')
    } catch {
      return ''
    }
  }

  const formatDateForStorage = (date: Date | undefined): string => {
    if (!date) return ''
    try {
      return format(date, 'yyyy-MM-dd')
    } catch {
      return ''
    }
  }

  const checkDateDiscrepancy = (invoiceDate: string, bookingDate: string | undefined): { type: 'none' | 'warning', message: string } => {
    // Only show advisory if invoice date is fully filled out (length 10 for YYYY-MM-DD format)
    if (!invoiceDate || invoiceDate.length < 10 || !bookingDate) {
      return { type: 'none', message: '' }
    }

    try {
      const invDate = new Date(invoiceDate)
      const bookDate = new Date(bookingDate)

      // Check if dates are valid
      if (isNaN(invDate.getTime()) || isNaN(bookDate.getTime())) {
        return { type: 'none', message: '' }
      }

      const invYear = invDate.getFullYear()
      const invMonth = invDate.getMonth()
      const bookYear = bookDate.getFullYear()
      const bookMonth = bookDate.getMonth()

      // Calculate month difference
      const monthDiff = (invYear - bookYear) * 12 + (invMonth - bookMonth)
      const absMonthDiff = Math.abs(monthDiff)

      // Check if 3+ months apart (all advisories in yellow)
      if (absMonthDiff >= 3) {
        return { 
          type: 'warning', 
          message: 'Advisory: Invoice date and job booking date are more than 3 months apart'
        }
      }
      
      // Check if invoice date is before booking date
      if (invDate < bookDate) {
        return { 
          type: 'warning', 
          message: 'Advisory: Supplier invoice has been issued before job booking date'
        }
      }
      
      // Check if different months
      if (absMonthDiff > 0) {
        return { 
          type: 'warning', 
          message: 'Advisory: Supplier invoice date is not issued in the same month as the job booking month'
        }
      }

      return { type: 'none', message: '' }
    } catch {
      return { type: 'none', message: '' }
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
    
    // Check if any invoices have date advisories
    const invoicesWithAdvisories = validInvoices.filter(inv => {
      const jobInfo = jobInfoMap[inv.id]
      if (jobInfo?.exists && jobInfo.bookingDate) {
        const dateCheck = checkDateDiscrepancy(inv.invoiceDate, jobInfo.bookingDate)
        return dateCheck.type !== 'none'
      }
      return false
    })
    
    // If there are advisories, ask for confirmation
    if (invoicesWithAdvisories.length > 0) {
      const confirmed = window.confirm(
        `${invoicesWithAdvisories.length} invoice(s) have date advisories. Do you want to proceed with saving these invoices?`
      )
      if (!confirmed) {
        return
      }
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
      title="Add Batch Invoices / Credits"
      onClose={handleCancel}
      onMinimize={() => minimizeWindow(windowId)}
      width={1100}
      height={720}
    >
      <div className="p-4 flex flex-col h-full">
        <div ref={scrollContainerRef} className="flex-1 overflow-auto mb-3">
          <div className="space-y-2">
            {invoices.map((invoice, index) => {
              const jobInfo = jobInfoMap[invoice.id]
              return (
                <div key={invoice.id} className="space-y-1">
                  <div
                    className="grid grid-cols-[110px_1fr_0.67fr_170px_96px_auto_auto] gap-2 items-end p-2 border rounded-md bg-card"
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            companyNameInputRefs.current[invoice.id]?.focus()
                          }
                        }}
                        placeholder="26001"
                        className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        data-testid={`input-job-ref-${index}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`companyName-${invoice.id}`} className="text-xs">Company Name</Label>
                      <Input
                        ref={(el) => (companyNameInputRefs.current[invoice.id] = el)}
                        id={`companyName-${invoice.id}`}
                        value={invoice.companyName}
                        onChange={(e) => handleCompanyNameChange(invoice.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            invoiceNumberInputRefs.current[invoice.id]?.focus()
                          }
                        }}
                        placeholder="Company name"
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            invoiceDateInputRefs.current[invoice.id]?.focus()
                          }
                        }}
                        placeholder="Invoice #"
                        data-testid={`input-invoice-number-${index}`}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`invoiceDate-${invoice.id}`} className="text-xs">Invoice Date</Label>
                      <div className="flex gap-1">
                        <Input
                          ref={(el) => (invoiceDateInputRefs.current[invoice.id] = el)}
                          id={`invoiceDate-${invoice.id}`}
                          value={invoice.invoiceDate ? formatDateForDisplay(invoice.invoiceDate) : ''}
                          onChange={(e) => {
                            const value = e.target.value
                            // Try to parse DD/MM/YY or DD/MM/YYYY format
                            if (value.length === 8 || value.length === 10) {
                              try {
                                // Parse DD/MM/YY format
                                const parsed = parse(value, value.length === 8 ? 'dd/MM/yy' : 'dd/MM/yyyy', new Date())
                                if (!isNaN(parsed.getTime())) {
                                  updateInvoice(invoice.id, 'invoiceDate', formatDateForStorage(parsed))
                                  return
                                }
                              } catch {}
                            }
                            // Store the display value as-is while user is typing
                            const current = invoice.invoiceDate ? formatDateForDisplay(invoice.invoiceDate) : ''
                            if (value !== current) {
                              // User is typing, store as-is for now
                              updateInvoice(invoice.id, 'invoiceDate', value)
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value
                            if (!value) {
                              updateInvoice(invoice.id, 'invoiceDate', '')
                              return
                            }
                            // Try to parse on blur
                            try {
                              let parsed: Date | null = null
                              if (value.length === 8) {
                                parsed = parse(value, 'dd/MM/yy', new Date())
                              } else if (value.length === 10) {
                                parsed = parse(value, 'dd/MM/yyyy', new Date())
                              }
                              
                              if (parsed && !isNaN(parsed.getTime())) {
                                updateInvoice(invoice.id, 'invoiceDate', formatDateForStorage(parsed))
                              }
                            } catch {}
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              invoiceAmountInputRefs.current[invoice.id]?.focus()
                            }
                          }}
                          placeholder="DD/MM/YY"
                          className="flex-1"
                          data-testid={`input-invoice-date-${index}`}
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="flex-shrink-0"
                              data-testid={`button-calendar-${index}`}
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={invoice.invoiceDate ? new Date(invoice.invoiceDate) : undefined}
                              onSelect={(date) => {
                                updateInvoice(invoice.id, 'invoiceDate', formatDateForStorage(date))
                                setTimeout(() => invoiceAmountInputRefs.current[invoice.id]?.focus(), 100)
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`invoiceAmount-${invoice.id}`} className="text-xs">Amount (£)</Label>
                      <Input
                        ref={(el) => (invoiceAmountInputRefs.current[invoice.id] = el)}
                        id={`invoiceAmount-${invoice.id}`}
                        type="number"
                        step="0.01"
                        value={invoice.invoiceAmount}
                        onChange={(e) => updateInvoice(invoice.id, 'invoiceAmount', e.target.value)}
                        onKeyDown={(e) => handleAmountKeyPress(e, invoice.id)}
                        placeholder="0.00"
                        className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        data-testid={`input-invoice-amount-${index}`}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => addInvoiceRow(invoice.id)}
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
                      title="Remove line"
                      data-testid={`button-remove-invoice-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {invoice.jobRef.length >= 5 && (
                    <div className="ml-4 px-3 py-1.5 border-l-4 bg-muted/30 rounded-r-md text-xs space-y-1">
                      {jobInfo?.exists ? (
                        <>
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
                          {(() => {
                            const dateCheck = checkDateDiscrepancy(invoice.invoiceDate, jobInfo.bookingDate)
                            if (dateCheck.type !== 'none') {
                              return (
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                                    {dateCheck.message}
                                  </span>
                                </div>
                              )
                            }
                            return null
                          })()}
                        </>
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
