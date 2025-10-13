import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import type { ImportShipment, ExportShipment, CustomClearance, Invoice, ImportCustomer, ExportCustomer, ExportReceiver, InvoiceChargeTemplate } from '@shared/schema'
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
import { Plus, Trash2, Save, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LineItem {
  description: string
  chargeAmount: string
  vatCode: '1' | '2' | '3' // 1=0%, 2=20%, 3=exempt
  vatAmount: string
}

interface ShipmentLine {
  numberOfPackages: string
  packingType: string
  commodity: string
  kgs: string
  cbm: string
}

interface CustomerInvoiceFormProps {
  job: ImportShipment | ExportShipment | CustomClearance | null
  jobType: 'import' | 'export' | 'clearance'
  open: boolean
  onOpenChange: (open: boolean) => void
  existingInvoice?: Invoice | null
  asWindow?: boolean
}

export function CustomerInvoiceForm({ job, jobType, open, onOpenChange, existingInvoice, asWindow = false }: CustomerInvoiceFormProps) {
  const { toast } = useToast()
  
  // Fetch customer data based on job
  const importCustomerId = job && jobType === 'import' 
    ? (job as ImportShipment).importCustomerId 
    : job && jobType === 'clearance' 
      ? (job as CustomClearance).importCustomerId 
      : null
  const exportCustomerId = job && jobType === 'export' 
    ? (job as ExportShipment).destinationCustomerId 
    : job && jobType === 'clearance' 
      ? (job as CustomClearance).exportCustomerId 
      : null
  const exportReceiverId = job && jobType === 'export' 
    ? (job as ExportShipment).receiverId 
    : job && jobType === 'clearance' 
      ? (job as CustomClearance).receiverId 
      : null
  
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
  const [type, setType] = useState<'invoice' | 'credit_note'>('invoice')
  const [taxPointDate, setTaxPointDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [ourRef, setOurRef] = useState('')
  const [exportersRef, setExportersRef] = useState('')
  
  // Customer section (INVOICE TO)
  const [customerCompanyName, setCustomerCompanyName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerVatNumber, setCustomerVatNumber] = useState('')
  
  // Shipment details section (legacy fields kept for backward compatibility)
  const [numberOfPackages, setNumberOfPackages] = useState('')
  const [packingType, setPackingType] = useState('')
  const [commodity, setCommodity] = useState('')
  const [kgs, setKgs] = useState('')
  const [cbm, setCbm] = useState('')
  
  // New shipment lines (up to 3)
  const [shipmentLines, setShipmentLines] = useState<ShipmentLine[]>([
    { numberOfPackages: '', packingType: '', commodity: '', kgs: '', cbm: '' }
  ])
  
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
    { description: '', chargeAmount: '', vatCode: '1', vatAmount: '0' }
  ])
  const [paymentTerms, setPaymentTerms] = useState('Payment due within 30 days of invoice date')

  // Template dialog states
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [loadTemplateOpen, setLoadTemplateOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

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
      setType((existingInvoice.type as 'invoice' | 'credit_note') || 'invoice')
      setTaxPointDate(existingInvoice.taxPointDate || existingInvoice.invoiceDate)
      setOurRef(existingInvoice.ourRef || '')
      setExportersRef(existingInvoice.exportersRef || '')
      setCustomerCompanyName(existingInvoice.customerCompanyName || '')
      setCustomerAddress(existingInvoice.customerAddress || '')
      setCustomerVatNumber(existingInvoice.customerVatNumber || '')
      
      // Load shipment lines from invoice (prefer new format, fallback to legacy)
      if (existingInvoice.shipmentLines && existingInvoice.shipmentLines.length > 0) {
        setShipmentLines(existingInvoice.shipmentLines as ShipmentLine[])
      } else {
        // Fallback to legacy single shipment fields
        setShipmentLines([{
          numberOfPackages: existingInvoice.numberOfPackages || '',
          packingType: existingInvoice.packingType || '',
          commodity: existingInvoice.commodity || '',
          kgs: existingInvoice.kgs || '',
          cbm: existingInvoice.cbm || ''
        }])
      }
      
      // Keep legacy fields in sync for backward compatibility
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
        setLineItems([{ description: '', chargeAmount: '', vatCode: '1', vatAmount: '0' }])
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
        
        // Shipment details - populate first shipment line from job
        const firstLine: ShipmentLine = {
          numberOfPackages: importJob.numberOfPieces || '',
          packingType: importJob.packaging || '',
          commodity: importJob.goodsDescription || '',
          kgs: importJob.weight || '',
          cbm: importJob.cube || ''
        }
        setShipmentLines([firstLine])
        
        // Keep legacy fields in sync
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
        setVesselName(importJob.vesselName || 'N/A')
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
        
        // Shipment details - populate first shipment line from job
        const firstLine: ShipmentLine = {
          numberOfPackages: exportJob.numberOfPieces || '',
          packingType: exportJob.packaging || '',
          commodity: exportJob.goodsDescription || '',
          kgs: exportJob.weight || '',
          cbm: exportJob.cube || ''
        }
        setShipmentLines([firstLine])
        
        // Keep legacy fields in sync
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
        setVesselName(exportJob.vesselName || 'N/A')
        setDateOfShipment(exportJob.dispatchDate || '')
        setPortLoading(exportJob.departureFrom || '')
        // Port discharge: try portOfArrival first, then deliveryAddress destination
        setPortDischarge(exportJob.portOfArrival || extractPostcode(exportJob.deliveryAddress || ''))
        setDeliveryTerms(exportJob.incoterms || '')
        setDestination(extractPostcode(exportJob.deliveryAddress || ''))
      } else if (jobType === 'clearance') {
        const clearanceJob = job as CustomClearance
        
        // Exporters Ref = Customer Reference
        setExportersRef(clearanceJob.customerReferenceNumber || '')
        
        // Invoice To: Use agent if available, otherwise customer (works for both import and export clearances)
        const customer = importCustomer || exportCustomer
        if (customer) {
          if (customer.agentName) {
            setCustomerCompanyName(customer.agentName)
            setCustomerAddress(customer.agentAddress || '')
            setCustomerVatNumber(customer.agentVatNumber || '')
          } else {
            setCustomerCompanyName(customer.companyName)
            setCustomerAddress(customer.address || '')
            setCustomerVatNumber(customer.vatNumber || '')
          }
        }
        
        // Shipment details - populate first shipment line from clearance job
        const firstLine: ShipmentLine = {
          numberOfPackages: clearanceJob.numberOfPieces || '',
          packingType: clearanceJob.packaging || '',
          commodity: clearanceJob.goodsDescription || '',
          kgs: clearanceJob.weight || '',
          cbm: clearanceJob.cube || ''
        }
        setShipmentLines([firstLine])
        
        // Keep legacy fields in sync
        setNumberOfPackages(clearanceJob.numberOfPieces || '')
        setPackingType(clearanceJob.packaging || '')
        setCommodity(clearanceJob.goodsDescription || '')
        setKgs(clearanceJob.weight || '')
        setCbm(clearanceJob.cube || '')
        
        // Consignor (for clearance = Supplier Name)
        setConsignorName(clearanceJob.supplierName || '')
        setConsignorAddress('') // Not available on clearance jobs
        
        // Consignee (for clearance = Customer/Receiver based on type)
        if (clearanceJob.jobType === 'import' && importCustomer) {
          setConsigneeName(importCustomer.companyName)
          setConsigneeAddress(importCustomer.address || '')
        } else if (clearanceJob.jobType === 'export' && exportReceiver) {
          setConsigneeName(exportReceiver.companyName)
          setConsigneeAddress(exportReceiver.address || '')
        }
        
        // Shipping info
        setIdentifier(clearanceJob.trailerOrContainerNumber || '')
        setVesselName(clearanceJob.vesselName || 'N/A')
        setDateOfShipment('') // Not available on clearance jobs
        setPortLoading(clearanceJob.departureFrom || '')
        setPortDischarge(clearanceJob.portOfArrival || '')
        setDeliveryTerms(clearanceJob.incoterms || '')
        setDestination(extractPostcode(clearanceJob.deliveryAddress || ''))
      }
      
      // Auto-populate line items from quotation/rate fields (only for new invoices, not when editing)
      if (!existingInvoice && job) {
        const autoLineItems: LineItem[] = []
        
        if (jobType === 'import') {
          const importJob = job as ImportShipment
          
          // Freight Rate Out
          if (importJob.freightRateOut && parseFloat(importJob.freightRateOut) > 0) {
            const charge = parseFloat(importJob.freightRateOut)
            autoLineItems.push({
              description: 'Freight Rate Out',
              chargeAmount: charge.toFixed(2),
              vatCode: '1',
              vatAmount: '0.00'
            })
          }
          
          // Export Customs Clearance
          if (importJob.exportCustomsClearanceCharge && parseFloat(importJob.exportCustomsClearanceCharge) > 0) {
            const charge = parseFloat(importJob.exportCustomsClearanceCharge)
            autoLineItems.push({
              description: 'Export Customs Clearance',
              chargeAmount: charge.toFixed(2),
              vatCode: '1',
              vatAmount: '0.00'
            })
          }
          
          // Import Customs Clearance
          if (importJob.clearanceCharge && parseFloat(importJob.clearanceCharge) > 0) {
            const charge = parseFloat(importJob.clearanceCharge)
            autoLineItems.push({
              description: 'Import Customs Clearance',
              chargeAmount: charge.toFixed(2),
              vatCode: '1',
              vatAmount: '0.00'
            })
          }
          
          // Additional Commodity Codes (subtract 1 since first code is included)
          if (importJob.additionalCommodityCodes && importJob.additionalCommodityCodeCharge) {
            const totalCodes = Number(importJob.additionalCommodityCodes) || 0
            const perCodeCharge = parseFloat(importJob.additionalCommodityCodeCharge) || 0
            const chargeableCount = Math.max(totalCodes - 1, 0)
            
            if (chargeableCount > 0 && perCodeCharge > 0) {
              const total = chargeableCount * perCodeCharge
              autoLineItems.push({
                description: `Additional Commodity Codes x ${chargeableCount}`,
                chargeAmount: total.toFixed(2),
                vatCode: '1',
                vatAmount: '0.00'
              })
            }
          }
          
          // Expenses To Charge Out
          if (importJob.expensesToChargeOut && Array.isArray(importJob.expensesToChargeOut)) {
            importJob.expensesToChargeOut.forEach(expense => {
              if (expense.description && expense.amount && parseFloat(expense.amount) > 0) {
                const charge = parseFloat(expense.amount)
                autoLineItems.push({
                  description: expense.description,
                  chargeAmount: charge.toFixed(2),
                  vatCode: '1',
                  vatAmount: '0.00'
                })
              }
            })
          }
        } else if (jobType === 'export') {
          const exportJob = job as ExportShipment
          
          // Freight Rate Out
          if (exportJob.freightRateOut && parseFloat(exportJob.freightRateOut) > 0) {
            const charge = parseFloat(exportJob.freightRateOut)
            autoLineItems.push({
              description: 'Freight Rate Out',
              chargeAmount: charge.toFixed(2),
              vatCode: '1',
              vatAmount: '0.00'
            })
          }
          
          // Export Customs Clearance
          if (exportJob.clearanceCharge && parseFloat(exportJob.clearanceCharge) > 0) {
            const charge = parseFloat(exportJob.clearanceCharge)
            autoLineItems.push({
              description: 'Export Customs Clearance',
              chargeAmount: charge.toFixed(2),
              vatCode: '1',
              vatAmount: '0.00'
            })
          }
          
          // Destination Clearance Charge Out (Import Customs Clearance for export jobs)
          if (exportJob.arrivalClearanceCost && parseFloat(exportJob.arrivalClearanceCost) > 0) {
            const charge = parseFloat(exportJob.arrivalClearanceCost)
            autoLineItems.push({
              description: 'Destination Clearance Charge Out',
              chargeAmount: charge.toFixed(2),
              vatCode: '1',
              vatAmount: '0.00'
            })
          }
          
          // Additional Commodity Codes (subtract 1 since first code is included)
          if (exportJob.additionalCommodityCodes && exportJob.additionalCommodityCodeCharge) {
            const totalCodes = Number(exportJob.additionalCommodityCodes) || 0
            const perCodeCharge = parseFloat(exportJob.additionalCommodityCodeCharge) || 0
            const chargeableCount = Math.max(totalCodes - 1, 0)
            
            if (chargeableCount > 0 && perCodeCharge > 0) {
              const total = chargeableCount * perCodeCharge
              autoLineItems.push({
                description: `Additional Commodity Codes x ${chargeableCount}`,
                chargeAmount: total.toFixed(2),
                vatCode: '1',
                vatAmount: '0.00'
              })
            }
          }
          
          // Expenses To Charge Out
          if (exportJob.expensesToChargeOut && Array.isArray(exportJob.expensesToChargeOut)) {
            exportJob.expensesToChargeOut.forEach(expense => {
              if (expense.description && expense.amount && parseFloat(expense.amount) > 0) {
                const charge = parseFloat(expense.amount)
                autoLineItems.push({
                  description: expense.description,
                  chargeAmount: charge.toFixed(2),
                  vatCode: '1',
                  vatAmount: '0.00'
                })
              }
            })
          }
          
          // Additional Expenses In
          if (exportJob.additionalExpensesIn && Array.isArray(exportJob.additionalExpensesIn)) {
            exportJob.additionalExpensesIn.forEach(expense => {
              if (expense.description && expense.amount && parseFloat(expense.amount) > 0) {
                const charge = parseFloat(expense.amount)
                autoLineItems.push({
                  description: expense.description,
                  chargeAmount: charge.toFixed(2),
                  vatCode: '1',
                  vatAmount: '0.00'
                })
              }
            })
          }
        } else if (jobType === 'clearance') {
          const clearanceJob = job as CustomClearance
          
          // Clearance Charge (labeled based on clearance type)
          if (clearanceJob.clearanceCharge && parseFloat(clearanceJob.clearanceCharge) > 0) {
            const charge = parseFloat(clearanceJob.clearanceCharge)
            const description = clearanceJob.jobType === 'import' 
              ? 'Import Customs Clearance' 
              : 'Export Customs Clearance'
            autoLineItems.push({
              description,
              chargeAmount: charge.toFixed(2),
              vatCode: '1',
              vatAmount: '0.00'
            })
          }
          
          // Expenses To Charge Out (all expenses from the array, including auto-calculated ones)
          if (clearanceJob.expensesToChargeOut && Array.isArray(clearanceJob.expensesToChargeOut)) {
            clearanceJob.expensesToChargeOut.forEach(expense => {
              if (expense.description && expense.amount && parseFloat(expense.amount) > 0) {
                const charge = parseFloat(expense.amount)
                autoLineItems.push({
                  description: expense.description,
                  chargeAmount: charge.toFixed(2),
                  vatCode: '1',
                  vatAmount: '0.00'
                })
              }
            })
          }
        }
        
        // Set line items - use auto-populated items if any exist, otherwise one empty item
        setLineItems(autoLineItems.length > 0 ? autoLineItems : [{ description: '', chargeAmount: '', vatCode: '1', vatAmount: '0' }])
      } else {
        // For editing existing invoice or no job, keep one empty line item
        setLineItems([{ description: '', chargeAmount: '', vatCode: '1', vatAmount: '0' }])
      }
    }
  }, [job, jobType, existingInvoice, importCustomer, exportCustomer, exportReceiver])

  // Clear payment terms when type changes to credit_note
  useEffect(() => {
    if (type === 'credit_note') {
      setPaymentTerms('')
    } else if (type === 'invoice' && !paymentTerms) {
      setPaymentTerms('Payment due within 30 days of invoice date')
    }
  }, [type])

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', chargeAmount: '', vatCode: '1', vatAmount: '0' }])
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

  const addShipmentLine = () => {
    if (shipmentLines.length < 3) {
      setShipmentLines([...shipmentLines, { numberOfPackages: '', packingType: '', commodity: '', kgs: '', cbm: '' }])
    }
  }

  const removeShipmentLine = (index: number) => {
    if (shipmentLines.length > 1) {
      setShipmentLines(shipmentLines.filter((_, i) => i !== index))
    }
  }

  const updateShipmentLine = (index: number, field: keyof ShipmentLine, value: string) => {
    const updated = [...shipmentLines]
    updated[index][field] = value
    setShipmentLines(updated)
  }

  const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.chargeAmount) || 0), 0)
  const vatAmount = lineItems.reduce((sum, item) => sum + (parseFloat(item.vatAmount) || 0), 0)
  const total = subtotal + vatAmount

  // Fetch templates
  const { data: templates = [] } = useQuery<InvoiceChargeTemplate[]>({
    queryKey: ['/api/invoice-charge-templates'],
    enabled: open
  })

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: { templateName: string; lineItems: LineItem[] }) => {
      const response = await apiRequest('POST', '/api/invoice-charge-templates', data)
      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/invoice-charge-templates'] })
      toast({
        title: 'Success',
        description: 'Template saved successfully'
      })
      setSaveTemplateOpen(false)
      setTemplateName('')
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save template',
        variant: 'destructive'
      })
    }
  })

  // Handle save template
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Template name is required',
        variant: 'destructive'
      })
      return
    }

    if (lineItems.length === 0 || lineItems.every(item => !item.description.trim())) {
      toast({
        title: 'Validation Error',
        description: 'At least one line item with a description is required',
        variant: 'destructive'
      })
      return
    }

    saveTemplateMutation.mutate({ templateName, lineItems })
  }

  // Handle load template
  const handleLoadTemplate = () => {
    if (!selectedTemplateId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a template',
        variant: 'destructive'
      })
      return
    }

    const template = templates.find(t => t.id === selectedTemplateId)
    if (template) {
      setLineItems(template.lineItems as LineItem[])
      toast({
        title: 'Success',
        description: 'Template loaded successfully'
      })
      setLoadTemplateOpen(false)
      setSelectedTemplateId('')
    }
  }

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
      let errorTitle = 'Error'
      let errorDescription = `Failed to ${existingInvoice ? 'update' : 'create'} invoice`
      
      if (error.message) {
        const match = error.message.match(/^(\d+):\s*(.+)$/)
        if (match) {
          const [, statusCode, responseBody] = match
          
          try {
            const errorData = JSON.parse(responseBody)
            if (errorData.error) {
              errorDescription = errorData.error
            } else if (errorData.message) {
              errorDescription = errorData.message
            }
            
            if (statusCode === '400') {
              errorTitle = 'Validation Error'
            } else if (statusCode === '404') {
              errorTitle = 'Not Found'
            } else if (statusCode === '500') {
              errorTitle = 'Server Error'
            }
          } catch {
            errorDescription = responseBody || error.message
          }
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorTitle = 'Network Error'
          errorDescription = 'Unable to connect to the server. Please check your internet connection and try again.'
        } else {
          errorDescription = error.message
        }
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
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
      type,
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
      // Legacy fields (keep for backward compatibility, populated from first shipment line)
      numberOfPackages: shipmentLines[0]?.numberOfPackages || '',
      packingType: shipmentLines[0]?.packingType || '',
      commodity: shipmentLines[0]?.commodity || '',
      kgs: shipmentLines[0]?.kgs || '',
      cbm: shipmentLines[0]?.cbm || '',
      // New shipment lines array
      shipmentLines: shipmentLines.filter(line => 
        line.numberOfPackages || line.packingType || line.commodity || line.kgs || line.cbm
      ),
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

  const formContent = (
    <>
      <div className="space-y-4">
        {/* Invoice Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{type === 'credit_note' ? 'Credit Details' : 'Invoice Details'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(value: 'invoice' | 'credit_note') => setType(value)}>
                  <SelectTrigger id="type" data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="credit_note">Credit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
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
                    disabled={!!job}
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
            </CardContent>
          </Card>

          {/* Invoice To Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{type === 'credit_note' ? 'Credit To' : 'Invoice To'}</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Shipment Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Shipment Details</CardTitle>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addShipmentLine}
                  disabled={shipmentLines.length >= 3}
                  data-testid="button-add-shipment-line"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {shipmentLines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-2">
                      <Label htmlFor={`packages-${index}`}>No. Packages</Label>
                      <Input
                        id={`packages-${index}`}
                        value={line.numberOfPackages}
                        onChange={(e) => updateShipmentLine(index, 'numberOfPackages', e.target.value)}
                        data-testid={`input-packages-${index}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`packing-${index}`}>Packing Type</Label>
                      <Input
                        id={`packing-${index}`}
                        value={line.packingType}
                        onChange={(e) => updateShipmentLine(index, 'packingType', e.target.value)}
                        placeholder="e.g., Pallet(s)"
                        data-testid={`input-packing-type-${index}`}
                      />
                    </div>
                    <div className="col-span-4">
                      <Label htmlFor={`commodity-${index}`}>Commodity</Label>
                      <Input
                        id={`commodity-${index}`}
                        value={line.commodity}
                        onChange={(e) => updateShipmentLine(index, 'commodity', e.target.value)}
                        data-testid={`input-commodity-${index}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`kgs-${index}`}>KGS</Label>
                      <Input
                        id={`kgs-${index}`}
                        value={line.kgs}
                        onChange={(e) => updateShipmentLine(index, 'kgs', e.target.value)}
                        data-testid={`input-kgs-${index}`}
                      />
                    </div>
                    <div className="col-span-1">
                      <Label htmlFor={`cbm-${index}`}>CBM</Label>
                      <Input
                        id={`cbm-${index}`}
                        value={line.cbm}
                        onChange={(e) => updateShipmentLine(index, 'cbm', e.target.value)}
                        data-testid={`input-cbm-${index}`}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeShipmentLine(index)}
                        disabled={shipmentLines.length === 1}
                        data-testid={`button-remove-shipment-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Consignor/Consignee Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Consignor / Consignee</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Shipping Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Shipping Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="identifier">Identifier</Label>
                  <Input
                    id="identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    data-testid="input-identifier"
                  />
                </div>
                <div>
                  <Label htmlFor="vesselName">Vessel Name</Label>
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
            </CardContent>
          </Card>

          {/* Description of Charges Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">Description of Charges</CardTitle>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setLoadTemplateOpen(true)}
                    data-testid="button-load-template"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Load From Template
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSaveTemplateOpen(true)}
                    data-testid="button-save-template"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save Charges Template
                  </Button>
                </div>
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
            </CardHeader>
            <CardContent>
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
                    <Label htmlFor={`charge-${index}`}>{type === 'credit_note' ? 'Credit Amount' : 'Charge Amount'}</Label>
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
            
            {/* Totals */}
            <div className="flex justify-end mt-4">
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
            <div className="mt-4">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Textarea
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                rows={2}
                data-testid="input-payment-terms"
              />
            </div>
            </CardContent>
          </Card>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
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
      </div>

      {/* Save Template Dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Charges Template</DialogTitle>
            <DialogDescription>
              Save the current line items as a template for future use
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name..."
                data-testid="input-template-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSaveTemplateOpen(false)
                setTemplateName('')
              }}
              data-testid="button-cancel-save-template"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={saveTemplateMutation.isPending}
              data-testid="button-confirm-save-template"
            >
              {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={loadTemplateOpen} onOpenChange={setLoadTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Charges Template</DialogTitle>
            <DialogDescription>
              Select a template to load its line items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="select-template">Select Template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger id="select-template" data-testid="select-template">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <SelectItem value="none" disabled>No templates available</SelectItem>
                  ) : (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.templateName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLoadTemplateOpen(false)
                setSelectedTemplateId('')
              }}
              data-testid="button-cancel-load-template"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLoadTemplate}
              disabled={!selectedTemplateId}
              data-testid="button-confirm-load-template"
            >
              Load Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  if (asWindow) {
    return formContent
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

        <div className="py-4">
          {formContent}
        </div>
      </DialogContent>
    </Dialog>
  )
}
