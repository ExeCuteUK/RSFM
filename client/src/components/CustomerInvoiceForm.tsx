import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import type { ImportShipment, ExportShipment, CustomClearance, Invoice } from '@shared/schema'
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
  chargeAmount: string
  vatCode: '1' | '2' | '3' // 1=0%, 2=20%, 3=exempt
  vatAmount: string
}

interface CustomerInvoiceFormProps {
  job: ImportShipment | ExportShipment | CustomClearance | null
  jobType: 'import' | 'export' | 'clearance'
  open: boolean
  onOpenChange: (open: boolean) => void
  existingInvoice?: Invoice | null // For edit mode
}

export function CustomerInvoiceForm({ job, jobType, open, onOpenChange, existingInvoice }: CustomerInvoiceFormProps) {
  const { toast } = useToast()
  
  // Invoice fields
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customerName, setCustomerName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [shipmentDetails, setShipmentDetails] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', chargeAmount: '', vatCode: '2', vatAmount: '0' }
  ])
  const [paymentTerms, setPaymentTerms] = useState('Payment due within 30 days of invoice date')

  // Reset or populate form when job/invoice changes
  useEffect(() => {
    if (existingInvoice) {
      // Edit mode - populate with existing invoice data
      setInvoiceDate(existingInvoice.invoiceDate)
      setCustomerName(existingInvoice.customerCompanyName || '')
      setCustomerAddress(existingInvoice.customerAddress || '')
      setShipmentDetails(existingInvoice.shipmentDetails || '')
      setPaymentTerms(existingInvoice.paymentTerms || 'Payment due within 30 days of invoice date')
      
      // Convert existing line items to the form format
      const items = existingInvoice.lineItems || []
      if (items.length > 0) {
        setLineItems(items as LineItem[])
      } else {
        setLineItems([{ description: '', chargeAmount: '', vatCode: '2', vatAmount: '0' }])
      }
    } else if (job) {
      // Create mode - reset to defaults
      setInvoiceDate(format(new Date(), 'yyyy-MM-dd'))
      setCustomerName('')
      setCustomerAddress('')
      setPaymentTerms('Payment due within 30 days of invoice date')
      
      let details = ''
      if (jobType === 'import') {
        details = `Import Shipment #${job.jobRef}`
      } else if (jobType === 'export') {
        details = `Export Shipment #${job.jobRef}`
      } else {
        details = `Custom Clearance #${job.jobRef}`
      }
      setShipmentDetails(details)
      
      setLineItems([{ description: '', chargeAmount: '', vatCode: '2', vatAmount: '0' }])
    }
  }, [job, jobType, existingInvoice])

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', chargeAmount: '', vatCode: '2', vatAmount: '0' }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  const updateLineItem = (index: number, field: 'description' | 'chargeAmount' | 'vatCode', value: string) => {
    const updated = [...lineItems]
    if (field === 'chargeAmount') {
      updated[index][field] = value
      // Recalculate VAT for this line
      const charge = parseFloat(value) || 0
      const vatCode = updated[index].vatCode
      let vat = 0
      if (vatCode === '2') { // 20% standard
        vat = charge * 0.2
      }
      updated[index].vatAmount = vat.toFixed(2)
    } else if (field === 'vatCode') {
      updated[index][field] = value as '1' | '2' | '3'
      // Recalculate VAT for this line
      const charge = parseFloat(updated[index].chargeAmount) || 0
      let vat = 0
      if (value === '2') { // 20% standard
        vat = charge * 0.2
      }
      updated[index].vatAmount = vat.toFixed(2)
    } else {
      updated[index][field] = value
    }
    setLineItems(updated)
  }

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => {
    const amount = parseFloat(item.chargeAmount) || 0
    return sum + amount
  }, 0)

  const vatAmount = lineItems.reduce((sum, item) => {
    const vat = parseFloat(item.vatAmount) || 0
    return sum + vat
  }, 0)
  
  const total = subtotal + vatAmount

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (existingInvoice) {
        // Update existing invoice
        const response = await apiRequest('PATCH', `/api/invoices/${existingInvoice.id}`, data)
        return response.json()
      } else {
        // Create new invoice
        const response = await apiRequest('POST', '/api/invoices', data)
        return response.json()
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/import-shipments'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/export-shipments'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/custom-clearances'] })
      toast({ 
        title: 'Success', 
        description: existingInvoice ? 'Invoice updated successfully' : 'Invoice created successfully' 
      })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${existingInvoice ? 'update' : 'create'} invoice`,
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
      item.description.trim() && item.chargeAmount.trim()
    )

    if (validLineItems.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one line item with description and charge amount is required',
        variant: 'destructive'
      })
      return
    }

    // Create or update invoice
    const invoiceData: any = {
      invoiceDate,
      customerCompanyName: customerName || null,
      customerAddress: customerAddress.trim() || null,
      shipmentDetails: shipmentDetails.trim() || null,
      lineItems: validLineItems,
      subtotal,
      vat: vatAmount,
      total,
      paymentTerms: paymentTerms.trim() || null
    }
    
    // Only include job info when creating new invoice
    if (!existingInvoice && job) {
      invoiceData.jobRef = job.jobRef
      invoiceData.jobType = jobType
      invoiceData.jobId = job.id
    }
    
    saveMutation.mutate(invoiceData)
  }

  if (!job && !existingInvoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" data-testid="dialog-customer-invoice">
        <DialogHeader>
          <DialogTitle>{existingInvoice ? 'Edit Invoice' : 'Create Customer Invoice'}</DialogTitle>
          <DialogDescription>
            {existingInvoice ? `Invoice #${existingInvoice.invoiceNumber}` : `Job Reference: #${job?.jobRef}`}
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
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    className="flex-1"
                    data-testid={`input-line-description-${index}`}
                  />
                  <Input
                    placeholder="0.00"
                    value={item.chargeAmount}
                    onChange={(e) => updateLineItem(index, 'chargeAmount', e.target.value)}
                    className="w-28"
                    type="number"
                    step="0.01"
                    data-testid={`input-line-amount-${index}`}
                  />
                  <Select 
                    value={item.vatCode} 
                    onValueChange={(value) => updateLineItem(index, 'vatCode', value)}
                  >
                    <SelectTrigger className="w-32" data-testid={`select-vat-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">0%</SelectItem>
                      <SelectItem value="2">20%</SelectItem>
                      <SelectItem value="3">Exempt</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="w-24 flex items-center justify-end h-9">
                    <span className="text-sm text-muted-foreground">£{item.vatAmount}</span>
                  </div>
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

          {/* Totals Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal (Charges):</span>
              <span className="font-mono" data-testid="text-subtotal">£{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total VAT:</span>
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
            disabled={saveMutation.isPending}
            data-testid="button-save-invoice"
          >
            {saveMutation.isPending 
              ? (existingInvoice ? 'Updating...' : 'Creating...') 
              : (existingInvoice ? 'Update Invoice' : 'Create Invoice')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
