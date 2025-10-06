import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import type { PurchaseInvoice } from '@shared/schema'
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
import { Trash2 } from 'lucide-react'

interface InvoiceEditDialogProps {
  invoice: PurchaseInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoiceEditDialog({ invoice, open, onOpenChange }: InvoiceEditDialogProps) {
  const { toast } = useToast()
  const [companyName, setCompanyName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice) {
      setCompanyName(invoice.companyName)
      setInvoiceNumber(invoice.invoiceNumber)
      setInvoiceDate(invoice.invoiceDate)
      setInvoiceAmount(invoice.invoiceAmount.toString())
    } else {
      setCompanyName('')
      setInvoiceNumber('')
      setInvoiceDate('')
      setInvoiceAmount('')
    }
  }, [invoice])

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
    if (!companyName.trim() || !invoiceNumber.trim() || !invoiceDate || !invoiceAmount.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      })
      return
    }

    updateMutation.mutate({
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
          <DialogDescription>
            Job Reference: #{invoice.jobRef}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
            <Input
              id="edit-invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="mt-2"
              data-testid="input-edit-invoice-date"
            />
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
