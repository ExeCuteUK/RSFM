import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import type { ImportShipment, ExportShipment, CustomClearance } from '@shared/schema'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface LineItem {
  description: string
  amount: string
}

interface CustomerInvoiceFormProps {
  job: ImportShipment | ExportShipment | CustomClearance | null
  jobType: 'import' | 'export' | 'clearance'
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerInvoiceForm({ job, jobType, open, onOpenChange }: CustomerInvoiceFormProps) {
  const { toast } = useToast()
  
  // Invoice fields
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customerName, setCustomerName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [shipmentDetails, setShipmentDetails] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', amount: '' }
  ])
  const [vatRate, setVatRate] = useState<'0' | '20' | 'exempt'>('20')
  const [paymentTerms, setPaymentTerms] = useState('Payment due within 30 days of invoice date')

  // Reset form when job changes
  useEffect(() => {
    if (job) {
      setInvoiceDate(format(new Date(), 'yyyy-MM-dd'))
      
      // Set customer name based on job type
      if (jobType === 'import') {
        const importJob = job as ImportShipment
        setCustomerName(importJob.importerName || '')
      } else if (jobType === 'export') {
        const exportJob = job as ExportShipment
        setCustomerName(exportJob.destinationCustomerName || '')
      } else {
        const clearanceJob = job as CustomClearance
        setCustomerName(clearanceJob.importerName || '')
      }
      
      // Set shipment details based on job type
      let details = ''
      if (jobType === 'import') {
        const importJob = job as ImportShipment
        details = `Import Shipment #${importJob.jobRef}\n`
        details += importJob.portOfLoading ? `Port of Loading: ${importJob.portOfLoading}\n` : ''
        details += importJob.portOfDestination ? `Port of Destination: ${importJob.portOfDestination}\n` : ''
        details += importJob.containerNumbers ? `Container: ${importJob.containerNumbers}\n` : ''
      } else if (jobType === 'export') {
        const exportJob = job as ExportShipment
        details = `Export Shipment #${exportJob.jobRef}\n`
        details += exportJob.portOfLoading ? `Port of Loading: ${exportJob.portOfLoading}\n` : ''
        details += exportJob.portOfDestination ? `Port of Destination: ${exportJob.portOfDestination}\n` : ''
        details += exportJob.containerNumbers ? `Container: ${exportJob.containerNumbers}\n` : ''
      } else {
        const clearanceJob = job as CustomClearance
        details = `Custom Clearance #${clearanceJob.jobRef}\n`
        details += clearanceJob.entryNumber ? `Entry Number: ${clearanceJob.entryNumber}\n` : ''
      }
      setShipmentDetails(details.trim())
      
      setLineItems([{ description: '', amount: '' }])
      setVatRate('20')
    }
  }, [job, jobType])

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', amount: '' }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  const updateLineItem = (index: number, field: 'description' | 'amount', value: string) => {
    const updated = [...lineItems]
    updated[index][field] = value
    setLineItems(updated)
  }

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => {
    const amount = parseFloat(item.amount) || 0
    return sum + amount
  }, 0)

  const vatAmount = vatRate === '20' ? subtotal * 0.2 : 0
  const total = subtotal + vatAmount

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/invoices', data)
      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/import-shipments'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/export-shipments'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/custom-clearances'] })
      toast({ title: 'Success', description: 'Invoice created successfully' })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invoice',
        variant: 'destructive'
      })
    }
  })

  const handleSubmit = () => {
    // Validation
    if (!customerName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Customer name is required',
        variant: 'destructive'
      })
      return
    }

    if (!invoiceDate) {
      toast({
        title: 'Validation Error',
        description: 'Invoice date is required',
        variant: 'destructive'
      })
      return
    }

    // Check that at least one line item has data
    const validLineItems = lineItems.filter(item => 
      item.description.trim() && item.amount.trim()
    )

    if (validLineItems.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one line item with description and amount is required',
        variant: 'destructive'
      })
      return
    }

    // Create invoice
    createMutation.mutate({
      jobRef: job?.jobRef,
      jobType,
      jobId: job?.id,
      invoiceDate,
      customerName,
      customerAddress: customerAddress.trim() || null,
      shipmentDetails: shipmentDetails.trim() || null,
      lineItems: validLineItems,
      vatRate,
      subtotal,
      vatAmount,
      total,
      paymentTerms: paymentTerms.trim() || null
    })
  }

  if (!job) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" data-testid="dialog-customer-invoice">
        <DialogHeader>
          <DialogTitle>Create Customer Invoice</DialogTitle>
          <DialogDescription>
            Job Reference: #{job.jobRef}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invoice Date */}
          <div>
            <Label htmlFor="invoiceDate">Invoice Date</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              data-testid="input-invoice-date"
            />
          </div>

          {/* Customer Name */}
          <div>
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Company name"
              data-testid="input-customer-name"
            />
          </div>

          {/* Customer Address */}
          <div>
            <Label htmlFor="customerAddress">Customer Address</Label>
            <Textarea
              id="customerAddress"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Street address, City, Postcode"
              rows={3}
              data-testid="textarea-customer-address"
            />
          </div>

          {/* Shipment Details */}
          <div>
            <Label htmlFor="shipmentDetails">Shipment Details</Label>
            <Textarea
              id="shipmentDetails"
              value={shipmentDetails}
              onChange={(e) => setShipmentDetails(e.target.value)}
              placeholder="Container numbers, ports, etc."
              rows={4}
              data-testid="textarea-shipment-details"
            />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Charges *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                data-testid="button-add-line-item"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </div>
            
            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    className="flex-1"
                    data-testid={`input-line-description-${index}`}
                  />
                  <Input
                    placeholder="0.00"
                    value={item.amount}
                    onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                    className="w-32"
                    type="number"
                    step="0.01"
                    data-testid={`input-line-amount-${index}`}
                  />
                  {lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(index)}
                      data-testid={`button-remove-line-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* VAT Rate */}
          <div>
            <Label htmlFor="vatRate">VAT Rate</Label>
            <Select value={vatRate} onValueChange={(value: any) => setVatRate(value)}>
              <SelectTrigger id="vatRate" data-testid="select-vat-rate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0% - Zero Rated</SelectItem>
                <SelectItem value="20">20% - Standard Rate</SelectItem>
                <SelectItem value="exempt">Exempt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Totals Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-mono" data-testid="text-subtotal">£{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>VAT ({vatRate === '20' ? '20%' : vatRate === '0' ? '0%' : 'Exempt'}):</span>
              <span className="font-mono" data-testid="text-vat">£{vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="font-mono" data-testid="text-total">£{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Textarea
              id="paymentTerms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              rows={2}
              data-testid="textarea-payment-terms"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            data-testid="button-create-invoice"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
