import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import type { ImportShipment, ExportShipment, CustomClearance, Invoice, ImportCustomer, ExportCustomer, ExportReceiver } from '@shared/schema'
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
  existingInvoice?: Invoice | null
}

export function CustomerInvoiceForm({ job, jobType, open, onOpenChange, existingInvoice }: CustomerInvoiceFormProps) {
  const { toast } = useToast()
  
  // Fetch customer data based on job
  const importCustomerId = job && jobType === 'import' ? (job as ImportShipment).importCustomerId : null
  const exportCustomerId = job && jobType === 'export' ? (job as ExportShipment).destinationCustomerId : null
  const exportReceiverId = job && jobType === 'export' ? (job as ExportShipment).receiverId : null
  
  const { data: importCustomer } = useQuery<ImportCustomer>({
    queryKey: ['/api/import-customers', importCustomerId],
    queryFn: async () => {
      if (!importCustomerId) throw new Error("Import customer ID required")
      const res = await fetch(`/api/import-customers/${importCustomerId}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch import customer')
      return res.json()
    },
    enabled: !!importCustomerId && !existingInvoice
  })
  
  const { data: exportCustomer } = useQuery<ExportCustomer>({
    queryKey: ['/api/export-customers', exportCustomerId],
    queryFn: async () => {
      if (!exportCustomerId) throw new Error("Export customer ID required")
      const res = await fetch(`/api/export-customers/${exportCustomerId}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch export customer')
      return res.json()
    },
    enabled: !!exportCustomerId && !existingInvoice
  })
  
  const { data: exportReceiver } = useQuery<ExportReceiver>({
    queryKey: ['/api/export-receivers', exportReceiverId],
    queryFn: async () => {
      if (!exportReceiverId) throw new Error("Export receiver ID required")
      const res = await fetch(`/api/export-receivers/${exportReceiverId}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch export receiver')
      return res.json()
    },
    enabled: !!exportReceiverId && !existingInvoice
  })

  // Invoice fields - Header section
  const [taxPointDate, setTaxPointDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [ourRef, setOurRef] = useState('')
  const [exportersRef, setExportersRef] = useState('')
  
  // Customer section (INVOICE TO)
  const [customerCompanyName, setCustomerCompanyName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerVatNumber, setCustomerVatNumber] = useState('')
  
  // Shipment details section
  const [numberOfPackages, setNumberOfPackages] = useState('')
  const [packingType, setPackingType] = useState('')
  const [commodity, setCommodity] = useState('')
  const [kgs, setKgs] = useState('')
  const [cbm, setCbm] = useState('')
  
  // Consignor/Consignee section
  const [consignorName, setConsignorName] = useState('')
  const [consignorAddress, setConsignorAddress] = useState('')
  const [consigneeName, setConsigneeName] = useState('')
  const [consigneeAddress, setConsigneeAddress] = useState('')
  
  // Shipping information
  const [identifier, setIdentifier] = useState('') // Trailer/Container/Flight No
  const [vesselName, setVesselName] = useState('')
  const [dateOfShipment, setDateOfShipment] = useState('')
  const [portLoading, setPortLoading] = useState('')
  const [portDischarge, setPortDischarge] = useState('')
  const [deliveryTerms, setDeliveryTerms] = useState('')
  const [destination, setDestination] = useState('')
  
  // Line items and payment
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', chargeAmount: '', vatCode: '2', vatAmount: '0' }
  ])
  const [paymentTerms, setPaymentTerms] = useState('Payment due within 30 days of invoice date')

  // Helper function to extract postcode from delivery address
  const extractPostcode = (address: string): string => {
    if (!address) return ''
    
    // UK postcode pattern
    const postcodeMatch = address.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})/i)
    if (postcodeMatch) return postcodeMatch[1]
    
    // Extract town/city as fallback (last line before postcode)
    const lines = address.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length >= 2) {
      return lines[lines.length - 2] || lines[lines.length - 1]
    }
    return lines[lines.length - 1] || ''
  }

  // Auto-populate form when job changes
  useEffect(() => {
    if (existingInvoice) {
      // Edit mode - populate from existing invoice
      setTaxPointDate(existingInvoice.taxPointDate || existingInvoice.invoiceDate)
      setOurRef(existingInvoice.ourRef || '')
      setExportersRef(existingInvoice.exportersRef || '')
      setCustomerCompanyName(existingInvoice.customerCompanyName || '')
      setCustomerAddress(existingInvoice.customerAddress || '')
      setCustomerVatNumber(existingInvoice.customerVatNumber || '')
      setNumberOfPackages(existingInvoice.numberOfPackages || '')
      setPackingType(existingInvoice.packingType || '')
      setCommodity(existingInvoice.commodity || '')
      setKgs(existingInvoice.kgs || '')
      setCbm(existingInvoice.cbm || '')
      setConsignorName(existingInvoice.consignorName || '')
      setConsignorAddress(existingInvoice.consignorAddress || '')
      setConsigneeName(existingInvoice.consigneeName || '')
      setConsigneeAddress(existingInvoice.consigneeAddress || '')
      setIdentifier(existingInvoice.trailerContainerNo || '')
      setVesselName(existingInvoice.vesselFlightNo || '')
      setDateOfShipment(existingInvoice.dateOfShipment || '')
      setPortLoading(existingInvoice.portLoading || '')
      setPortDischarge(existingInvoice.portDischarge || '')
      setDeliveryTerms(existingInvoice.deliveryTerms || '')
      setDestination(existingInvoice.destination || '')
      setPaymentTerms(existingInvoice.paymentTerms || 'Payment due within 30 days of invoice date')
      
      const items = existingInvoice.lineItems || []
      if (items.length > 0) {
        setLineItems(items as LineItem[])
      } else {
        setLineItems([{ description: '', chargeAmount: '', vatCode: '2', vatAmount: '0' }])
      }
    } else if (job) {
      // Create mode - auto-populate from job
      const today = format(new Date(), 'yyyy-MM-dd')
      setTaxPointDate(today)
      setOurRef(`${job.jobRef}`)
      
      if (jobType === 'import') {
        const importJob = job as ImportShipment
        
        // Exporters Ref = Customer Reference
        setExportersRef(importJob.customerReferenceNumber || '')
        
        // Invoice To: Use agent if available, otherwise customer
        if (importCustomer) {
          if (importCustomer.agentName) {
            setCustomerCompanyName(importCustomer.agentName)
            setCustomerAddress(importCustomer.agentAddress || '')
            setCustomerVatNumber(importCustomer.agentVatNumber || '')
          } else {
            setCustomerCompanyName(importCustomer.companyName)
            setCustomerAddress(importCustomer.address || '')
            setCustomerVatNumber(importCustomer.vatNumber || '')
          }
        }
        
        // Shipment details
        setNumberOfPackages(importJob.numberOfPieces || '')
        setPackingType(importJob.packaging || '')
        setCommodity(importJob.goodsDescription || '')
        setKgs(importJob.weight || '')
        setCbm(importJob.cube || '')
        
        // Consignor (for import = Export Customer & Address from supplier field)
        setConsignorName(importJob.supplierName || '')
        setConsignorAddress('') // Not available on import jobs
        
        // Consignee (for import = Customer Name & Address)
        if (importCustomer) {
          setConsigneeName(importCustomer.companyName)
          setConsigneeAddress(importCustomer.address || '')
        }
        
        // Shipping info
        setIdentifier(importJob.trailerOrContainerNumber || '')
        setVesselName(importJob.vesselName || '')
        setDateOfShipment(importJob.dispatchDate || '')
        setPortLoading(importJob.departureCountry || '')
        setPortDischarge(importJob.portOfArrival || '')
        setDeliveryTerms(importJob.incoterms || '')
        setDestination(extractPostcode(importJob.deliveryAddress || ''))
      } else if (jobType === 'export') {
        const exportJob = job as ExportShipment
        
        // Exporters Ref = Customer Reference
        setExportersRef(exportJob.customerReferenceNumber || '')
        
        // Invoice To: Use agent if available, otherwise customer
        if (exportCustomer) {
          if (exportCustomer.agentName) {
            setCustomerCompanyName(exportCustomer.agentName)
            setCustomerAddress(exportCustomer.agentAddress || '')
            setCustomerVatNumber(exportCustomer.agentVatNumber || '')
          } else {
            setCustomerCompanyName(exportCustomer.companyName)
            setCustomerAddress(exportCustomer.address || '')
            setCustomerVatNumber(exportCustomer.vatNumber || '')
          }
        }
        
        // Shipment details
        setNumberOfPackages(exportJob.numberOfPieces || '')
        setPackingType(exportJob.packaging || '')
        setCommodity(exportJob.goodsDescription || '')
        setKgs(exportJob.weight || '')
        setCbm(exportJob.cube || '')
        
        // Consignor (for export = Customer Name & Address)
        if (exportCustomer) {
          setConsignorName(exportCustomer.companyName)
          setConsignorAddress(exportCustomer.address || '')
        }
        
        // Consignee (for export = Export Receiver & Address)
        if (exportReceiver) {
          setConsigneeName(exportReceiver.companyName)
          setConsigneeAddress(exportReceiver.address || '')
        }
        
        // Shipping info
        setIdentifier(exportJob.trailerNo || '')
        setVesselName(exportJob.vesselName || '')
        setDateOfShipment(exportJob.dispatchDate || '')
        setPortLoading(exportJob.departureFrom || '')
        // Port discharge: try portOfArrival first, then deliveryAddress destination
        setPortDischarge(exportJob.portOfArrival || extractPostcode(exportJob.deliveryAddress || ''))
        setDeliveryTerms(exportJob.incoterms || '')
        setDestination(extractPostcode(exportJob.deliveryAddress || ''))
      }
      
      setLineItems([{ description: '', chargeAmount: '', vatCode: '2', vatAmount: '0' }])
    }
  }, [job, jobType, existingInvoice, importCustomer, exportCustomer, exportReceiver])

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
      const charge = parseFloat(value) || 0
      const vatCode = updated[index].vatCode
      let vat = 0
      if (vatCode === '2') {
        vat = charge * 0.2
      }
      updated[index].vatAmount = vat.toFixed(2)
    } else if (field === 'vatCode') {
      updated[index][field] = value as '1' | '2' | '3'
      const charge = parseFloat(updated[index].chargeAmount) || 0
      let vat = 0
      if (value === '2') {
        vat = charge * 0.2
      }
      updated[index].vatAmount = vat.toFixed(2)
    } else {
      updated[index][field] = value
    }
    setLineItems(updated)
  }

  const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.chargeAmount) || 0), 0)
  const vatAmount = lineItems.reduce((sum, item) => sum + (parseFloat(item.vatAmount) || 0), 0)
  const total = subtotal + vatAmount

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (existingInvoice) {
        const response = await apiRequest('PATCH', `/api/invoices/${existingInvoice.id}`, data)
        return response.json()
      } else {
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
    if (!customerCompanyName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Customer company name is required',
        variant: 'destructive'
      })
      return
    }

    if (lineItems.some(item => !item.description.trim() || !item.chargeAmount)) {
      toast({
        title: 'Validation Error',
        description: 'All line items must have a description and charge amount',
        variant: 'destructive'
      })
      return
    }

    const invoiceData = {
      jobRef: job?.jobRef || existingInvoice?.jobRef,
      jobType: jobType,
      jobId: job?.id || existingInvoice?.jobId,
      invoiceDate: taxPointDate,
      taxPointDate,
      ourRef,
      exportersRef,
      customerCompanyName,
      customerAddress,
      customerVatNumber,
      numberOfPackages,
      packingType,
      commodity,
      kgs,
      cbm,
      consignorName,
      consignorAddress,
      consigneeName,
      consigneeAddress,
      trailerContainerNo: identifier,
      vesselFlightNo: vesselName,
      dateOfShipment,
      portLoading,
      portDischarge,
      deliveryTerms,
      destination,
      lineItems,
      paymentTerms,
      subtotal,
      vat: vatAmount,
      total
    }

    saveMutation.mutate(invoiceData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingInvoice ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
          <DialogDescription>
            {existingInvoice ? 'Update the invoice details below' : 'Complete the invoice details below'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Header Section */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="taxPointDate">Date/Tax Point</Label>
              <Input
                id="taxPointDate"
                type="date"
                value={taxPointDate}
                onChange={(e) => setTaxPointDate(e.target.value)}
                data-testid="input-tax-point-date"
              />
            </div>
            <div>
              <Label htmlFor="ourRef">Our Ref</Label>
              <Input
                id="ourRef"
                value={ourRef}
                onChange={(e) => setOurRef(e.target.value)}
                data-testid="input-our-ref"
              />
            </div>
            <div>
              <Label htmlFor="exportersRef">Exporters Ref</Label>
              <Input
                id="exportersRef"
                value={exportersRef}
                onChange={(e) => setExportersRef(e.target.value)}
                data-testid="input-exporters-ref"
              />
            </div>
          </div>

          {/* Invoice To Section */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">INVOICE TO</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerCompanyName}
                  onChange={(e) => setCustomerCompanyName(e.target.value)}
                  data-testid="input-customer-name"
                />
              </div>
              <div>
                <Label htmlFor="customerAddress">Customer Address</Label>
                <Textarea
                  id="customerAddress"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  rows={3}
                  data-testid="input-customer-address"
                />
              </div>
              <div>
                <Label htmlFor="customerVat">VAT No.</Label>
                <Input
                  id="customerVat"
                  value={customerVatNumber}
                  onChange={(e) => setCustomerVatNumber(e.target.value)}
                  data-testid="input-customer-vat"
                />
              </div>
            </div>
          </div>

          {/* Shipment Details Section */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">SHIPMENT DETAILS</h3>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <Label htmlFor="packages">No. Packages</Label>
                <Input
                  id="packages"
                  value={numberOfPackages}
                  onChange={(e) => setNumberOfPackages(e.target.value)}
                  data-testid="input-packages"
                />
              </div>
              <div>
                <Label htmlFor="packingType">Packing Type</Label>
                <Input
                  id="packingType"
                  value={packingType}
                  onChange={(e) => setPackingType(e.target.value)}
                  placeholder="e.g., Pallet(s)"
                  data-testid="input-packing-type"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="commodity">Commodity</Label>
                <Input
                  id="commodity"
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  data-testid="input-commodity"
                />
              </div>
              <div>
                <Label htmlFor="kgs">KGS</Label>
                <Input
                  id="kgs"
                  value={kgs}
                  onChange={(e) => setKgs(e.target.value)}
                  data-testid="input-kgs"
                />
              </div>
              <div>
                <Label htmlFor="cbm">CBM</Label>
                <Input
                  id="cbm"
                  value={cbm}
                  onChange={(e) => setCbm(e.target.value)}
                  data-testid="input-cbm"
                />
              </div>
            </div>
          </div>

          {/* Consignor/Consignee Section */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">CONSIGNOR / CONSIGNEE</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consignorName">Consignor Name</Label>
                <Input
                  id="consignorName"
                  value={consignorName}
                  onChange={(e) => setConsignorName(e.target.value)}
                  data-testid="input-consignor-name"
                />
                <Label htmlFor="consignorAddress">Consignor Address</Label>
                <Textarea
                  id="consignorAddress"
                  value={consignorAddress}
                  onChange={(e) => setConsignorAddress(e.target.value)}
                  rows={3}
                  data-testid="input-consignor-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consigneeName">Consignee Name</Label>
                <Input
                  id="consigneeName"
                  value={consigneeName}
                  onChange={(e) => setConsigneeName(e.target.value)}
                  data-testid="input-consignee-name"
                />
                <Label htmlFor="consigneeAddress">Consignee Address</Label>
                <Textarea
                  id="consigneeAddress"
                  value={consigneeAddress}
                  onChange={(e) => setConsigneeAddress(e.target.value)}
                  rows={3}
                  data-testid="input-consignee-address"
                />
              </div>
            </div>
          </div>

          {/* Shipping Information Section */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">SHIPPING INFORMATION</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="identifier">Trailer/Cont No.</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  data-testid="input-identifier"
                />
              </div>
              <div>
                <Label htmlFor="vesselName">Vessel/Flight No.</Label>
                <Input
                  id="vesselName"
                  value={vesselName}
                  onChange={(e) => setVesselName(e.target.value)}
                  data-testid="input-vessel-name"
                />
              </div>
              <div>
                <Label htmlFor="dateOfShipment">Date of Shipment</Label>
                <Input
                  id="dateOfShipment"
                  type="date"
                  value={dateOfShipment}
                  onChange={(e) => setDateOfShipment(e.target.value)}
                  data-testid="input-date-of-shipment"
                />
              </div>
              <div>
                <Label htmlFor="portLoading">Port Loading</Label>
                <Input
                  id="portLoading"
                  value={portLoading}
                  onChange={(e) => setPortLoading(e.target.value)}
                  data-testid="input-port-loading"
                />
              </div>
              <div>
                <Label htmlFor="portDischarge">Port Discharge</Label>
                <Input
                  id="portDischarge"
                  value={portDischarge}
                  onChange={(e) => setPortDischarge(e.target.value)}
                  data-testid="input-port-discharge"
                />
              </div>
              <div>
                <Label htmlFor="deliveryTerms">Delivery Terms</Label>
                <Input
                  id="deliveryTerms"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  data-testid="input-delivery-terms"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  data-testid="input-destination"
                />
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">DESCRIPTION OF CHARGES</h3>
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
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label htmlFor={`desc-${index}`}>Description</Label>
                    <Input
                      id={`desc-${index}`}
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      data-testid={`input-line-description-${index}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`charge-${index}`}>Charge Amount</Label>
                    <Input
                      id={`charge-${index}`}
                      type="number"
                      step="0.01"
                      value={item.chargeAmount}
                      onChange={(e) => updateLineItem(index, 'chargeAmount', e.target.value)}
                      data-testid={`input-line-charge-${index}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`vat-code-${index}`}>VAT Code</Label>
                    <Select
                      value={item.vatCode}
                      onValueChange={(value) => updateLineItem(index, 'vatCode', value)}
                    >
                      <SelectTrigger id={`vat-code-${index}`} data-testid={`select-vat-code-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - 0% Zero Rated</SelectItem>
                        <SelectItem value="2">2 - 20% Standard</SelectItem>
                        <SelectItem value="3">3 - Exempt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>VAT Amount</Label>
                    <Input
                      value={`£${item.vatAmount}`}
                      readOnly
                      className="bg-muted"
                      data-testid={`text-vat-amount-${index}`}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                      data-testid={`button-remove-line-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Invoice Total:</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">VAT Total:</span>
                <span>£{vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>GRAND TOTAL:</span>
                <span>£{total.toFixed(2)}</span>
              </div>
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
              data-testid="input-payment-terms"
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
            {saveMutation.isPending ? 'Saving...' : existingInvoice ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
