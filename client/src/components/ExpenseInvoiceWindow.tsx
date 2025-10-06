import { useState } from 'react'
import { useWindowManager } from '@/contexts/WindowManagerContext'
import { DraggableWindow } from './DraggableWindow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, X } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import type { ImportShipment, ExportShipment, CustomClearance } from '@shared/schema'

interface ExpenseInvoiceWindowProps {
  windowId: string
}

interface InvoiceRow {
  id: string
  companyName: string
  invoiceNumber: string
  invoiceDate: string
  invoiceAmount: string
}

export function ExpenseInvoiceWindow({ windowId }: ExpenseInvoiceWindowProps) {
  const { closeWindow, minimizeWindow } = useWindowManager()
  const { toast } = useToast()
  const [jobRef, setJobRef] = useState('')
  const [invoices, setInvoices] = useState<InvoiceRow[]>([
    { id: '1', companyName: '', invoiceNumber: '', invoiceDate: '', invoiceAmount: '' }
  ])

  const { data: importShipments = [] } = useQuery<ImportShipment[]>({
    queryKey: ["/api/import-shipments"],
  })

  const { data: exportShipments = [] } = useQuery<ExportShipment[]>({
    queryKey: ["/api/export-shipments"],
  })

  const { data: customClearances = [] } = useQuery<CustomClearance[]>({
    queryKey: ["/api/custom-clearances"],
  })

  const createMutation = useMutation({
    mutationFn: async (data: { jobRef: number; invoices: any[] }) => {
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

  const addInvoiceRow = () => {
    const newId = (Math.max(...invoices.map(i => parseInt(i.id)), 0) + 1).toString()
    setInvoices([
      ...invoices,
      { id: newId, companyName: '', invoiceNumber: '', invoiceDate: '', invoiceAmount: '' }
    ])
  }

  const removeInvoiceRow = (id: string) => {
    if (invoices.length > 1) {
      setInvoices(invoices.filter(inv => inv.id !== id))
    }
  }

  const updateInvoice = (id: string, field: keyof InvoiceRow, value: string) => {
    setInvoices(invoices.map(inv => 
      inv.id === id ? { ...inv, [field]: value } : inv
    ))
  }

  const validateJobRef = (): boolean => {
    const jobRefNum = parseInt(jobRef)
    if (isNaN(jobRefNum) || jobRefNum < 26001) {
      toast({
        title: 'Invalid Job Reference',
        description: 'Job reference must be a number (26001 or higher)',
        variant: 'destructive'
      })
      return false
    }

    // Check if job exists
    const jobExists = 
      importShipments.some(s => s.jobRef === jobRefNum) ||
      exportShipments.some(s => s.jobRef === jobRefNum) ||
      customClearances.some(c => c.jobRef === jobRefNum)

    if (!jobExists) {
      toast({
        title: 'Job Not Found',
        description: `Job reference #${jobRefNum} does not exist`,
        variant: 'destructive'
      })
      return false
    }

    return true
  }

  const handleSubmit = () => {
    if (!validateJobRef()) return

    // Validate invoices
    const validInvoices = invoices.filter(inv => 
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

    const jobRefNum = parseInt(jobRef)
    const invoiceData = validInvoices.map(inv => ({
      jobRef: jobRefNum,
      companyName: inv.companyName,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      invoiceAmount: parseFloat(inv.invoiceAmount) || 0
    }))

    createMutation.mutate({ jobRef: jobRefNum, invoices: invoiceData })
  }

  const handleCancel = () => {
    closeWindow(windowId)
  }

  return (
    <DraggableWindow
      id={windowId}
      title="Add Expense Invoices"
      onClose={handleCancel}
      onMinimize={() => minimizeWindow(windowId)}
      width={900}
      height={600}
    >
      <div className="p-6 flex flex-col h-full">
        <div className="mb-6">
          <Label htmlFor="jobRef">Job Reference</Label>
          <Input
            id="jobRef"
            type="number"
            value={jobRef}
            onChange={(e) => setJobRef(e.target.value)}
            placeholder="Enter job reference (e.g., 26001)"
            className="mt-2"
            data-testid="input-job-ref"
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Invoice Details</h3>
          <Button
            onClick={addInvoiceRow}
            variant="outline"
            size="sm"
            data-testid="button-add-invoice-row"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Invoice
          </Button>
        </div>

        <div className="flex-1 overflow-auto mb-6">
          <div className="space-y-4">
            {invoices.map((invoice, index) => (
              <div
                key={invoice.id}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end p-4 border rounded-md bg-card"
                data-testid={`invoice-row-${index}`}
              >
                <div>
                  <Label htmlFor={`companyName-${invoice.id}`}>Company Name</Label>
                  <Input
                    id={`companyName-${invoice.id}`}
                    value={invoice.companyName}
                    onChange={(e) => updateInvoice(invoice.id, 'companyName', e.target.value)}
                    placeholder="Company name"
                    className="mt-2"
                    data-testid={`input-company-name-${index}`}
                  />
                </div>

                <div>
                  <Label htmlFor={`invoiceNumber-${invoice.id}`}>Invoice Number</Label>
                  <Input
                    id={`invoiceNumber-${invoice.id}`}
                    value={invoice.invoiceNumber}
                    onChange={(e) => updateInvoice(invoice.id, 'invoiceNumber', e.target.value)}
                    placeholder="Invoice #"
                    className="mt-2"
                    data-testid={`input-invoice-number-${index}`}
                  />
                </div>

                <div>
                  <Label htmlFor={`invoiceDate-${invoice.id}`}>Invoice Date</Label>
                  <Input
                    id={`invoiceDate-${invoice.id}`}
                    type="date"
                    value={invoice.invoiceDate}
                    onChange={(e) => updateInvoice(invoice.id, 'invoiceDate', e.target.value)}
                    className="mt-2"
                    data-testid={`input-invoice-date-${index}`}
                  />
                </div>

                <div>
                  <Label htmlFor={`invoiceAmount-${invoice.id}`}>Amount (£)</Label>
                  <Input
                    id={`invoiceAmount-${invoice.id}`}
                    type="number"
                    step="0.01"
                    value={invoice.invoiceAmount}
                    onChange={(e) => updateInvoice(invoice.id, 'invoiceAmount', e.target.value)}
                    placeholder="0.00"
                    className="mt-2"
                    data-testid={`input-invoice-amount-${index}`}
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInvoiceRow(invoice.id)}
                  disabled={invoices.length === 1}
                  className="mt-2"
                  data-testid={`button-remove-invoice-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
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
            disabled={createMutation.isPending}
            data-testid="button-submit"
          >
            {createMutation.isPending ? 'Saving...' : 'Save Invoices'}
          </Button>
        </div>
      </div>
    </DraggableWindow>
  )
}
