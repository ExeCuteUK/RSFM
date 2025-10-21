import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import type { PurchaseInvoice, ImportShipment, ExportShipment, CustomClearance, ImportCustomer, ExportCustomer } from '@shared/schema'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Trash2, CheckCircle2, XCircle, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

interface InvoiceEditDialogProps {
  invoice: PurchaseInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoiceEditDialog({ invoice, open, onOpenChange }: InvoiceEditDialogProps) {
  const { toast } = useToast()
  const [jobRef, setJobRef] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')

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

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice) {
      setJobRef(invoice.jobRef.toString())
      setCompanyName(invoice.companyName)
      setInvoiceNumber(invoice.invoiceNumber)
      setInvoiceDate(invoice.invoiceDate)
      setInvoiceAmount(invoice.invoiceAmount.toString())
    } else {
      setJobRef('')
      setCompanyName('')
      setInvoiceNumber('')
      setInvoiceDate('')
      setInvoiceAmount('')
    }
  }, [invoice])

  const getJobInfo = (jobRefStr: string) => {
    const jobRefNum = parseInt(jobRefStr)
    if (isNaN(jobRefNum) || jobRefNum < 26001) {
      return { exists: false }
    }

    // Check import shipments
    const importShipment = importShipments.find(s => s.jobRef === jobRefNum)
    if (importShipment) {
      return { exists: true, type: 'Import' as const }
    }

    // Check export shipments
    const exportShipment = exportShipments.find(s => s.jobRef === jobRefNum)
    if (exportShipment) {
      return { exists: true, type: 'Export' as const }
    }

    // Check custom clearances
    const clearance = customClearances.find(c => c.jobRef === jobRefNum)
    if (clearance) {
      return { exists: true, type: 'Clearance' as const }
    }

    return { exists: false }
  }

  const validateJobRef = (jobRefStr: string): boolean => {
    const jobInfo = getJobInfo(jobRefStr)
    return jobInfo.exists
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

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<PurchaseInvoice>) => {
      if (!invoice) throw new Error('No invoice selected')
      const response = await apiRequest('PATCH', `/api/purchase-invoices/${invoice.id}`, data)
      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/purchase-invoices'] })
      toast({ title: 'Success', description: 'Invoice updated successfully' })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update invoice',
        variant: 'destructive'
      })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!invoice) throw new Error('No invoice selected')
      const response = await apiRequest('DELETE', `/api/purchase-invoices/${invoice.id}`)
      return response
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/purchase-invoices'] })
      toast({ title: 'Success', description: 'Invoice deleted successfully' })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete invoice',
        variant: 'destructive'
      })
    }
  })

  const handleUpdate = () => {
    if (!jobRef.trim() || !companyName.trim() || !invoiceNumber.trim() || !invoiceDate || !invoiceAmount.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      })
      return
    }

    if (!validateJobRef(jobRef)) {
      toast({
        title: 'Invalid Job Reference',
        description: `Job reference #${jobRef} does not exist`,
        variant: 'destructive'
      })
      return
    }

    updateMutation.mutate({
      jobRef: parseInt(jobRef),
      companyName,
      invoiceNumber,
      invoiceDate,
      invoiceAmount: parseFloat(invoiceAmount)
    })
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteMutation.mutate()
    }
  }

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-invoice-edit">
        <DialogHeader>
          <DialogTitle>Edit Expense Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="edit-jobRef">Job Reference</Label>
            <div className="relative mt-2">
              <Input
                id="edit-jobRef"
                type="number"
                value={jobRef}
                onChange={(e) => setJobRef(e.target.value)}
                placeholder="26001"
                className="pr-10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                data-testid="input-edit-job-ref"
              />
              {jobRef.length >= 5 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {validateJobRef(jobRef) ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="edit-companyName">Company Name</Label>
            <Input
              id="edit-companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name"
              className="mt-2"
              data-testid="input-edit-company-name"
            />
          </div>

          <div>
            <Label htmlFor="edit-invoiceNumber">Invoice Number</Label>
            <Input
              id="edit-invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Invoice number"
              className="mt-2"
              data-testid="input-edit-invoice-number"
            />
          </div>

          <div>
            <Label htmlFor="edit-invoiceDate">Invoice Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-9 px-3 mt-2"
                  data-testid="input-edit-invoice-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {invoiceDate ? formatDateForDisplay(invoiceDate) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={invoiceDate ? new Date(invoiceDate) : undefined}
                  onSelect={(date) => setInvoiceDate(formatDateForStorage(date))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="edit-invoiceAmount">Amount (£)</Label>
            <Input
              id="edit-invoiceAmount"
              type="number"
              step="0.01"
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(e.target.value)}
              placeholder="0.00"
              className="mt-2"
              data-testid="input-edit-invoice-amount"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            data-testid="button-delete-invoice"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
            data-testid="button-update"
          >
            {updateMutation.isPending ? 'Updating...' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
