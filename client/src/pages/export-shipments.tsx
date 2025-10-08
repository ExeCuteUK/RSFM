import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Truck, RefreshCw, Paperclip, StickyNote, X, Search, ChevronDown, CalendarCheck, PackageCheck, FileCheck, DollarSign, FileText, Container, Plane, Package, User, Ship, Calendar, Box, MapPin, PoundSterling, ClipboardList, ClipboardCheck, FileOutput, FileArchive, Send, Shield, ChevronLeft, ChevronRight, Receipt } from "lucide-react"
import { ExportShipmentForm } from "@/components/export-shipment-form"
import { CustomerInvoiceForm } from "@/components/CustomerInvoiceForm"
import type { ExportShipment, InsertExportShipment, ExportReceiver, ExportCustomer, CustomClearance, ClearanceAgent, Haulier, Invoice } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"
import { useWindowManager } from "@/contexts/WindowManagerContext"
import { useEmail } from "@/contexts/EmailContext"

export default function ExportShipments() {
  const { openWindow } = useWindowManager()
  const { openEmailComposer } = useEmail()
  const [deletingShipmentId, setDeletingShipmentId] = useState<string | null>(null)
  const [clearanceAgentDialog, setClearanceAgentDialog] = useState<{ show: boolean; shipmentId: string } | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["Awaiting Collection", "Dispatched", "Delivered"])
  const [selectedShipmentTypes, setSelectedShipmentTypes] = useState<string[]>(["Container Shipment", "Road Shipment", "Air Freight"])
  const [searchText, setSearchText] = useState("")
  const [notesShipmentId, setNotesShipmentId] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState("")
  const [viewingShipment, setViewingShipment] = useState<ExportShipment | null>(null)
  const [dragOver, setDragOver] = useState<{ shipmentId: string; type: "attachment" | "pod" } | null>(null)
  const [deletingFile, setDeletingFile] = useState<{ id: string; filePath: string; fileType: "attachment" | "pod"; fileName: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [invoiceShipment, setInvoiceShipment] = useState<ExportShipment | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<{ invoice: Invoice; shipment: ExportShipment } | null>(null)
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null)
  const [invoiceSelectionDialog, setInvoiceSelectionDialog] = useState<{ shipment: ExportShipment; invoices: Invoice[] } | null>(null)
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const { toast} = useToast()
  const [, setLocation] = useLocation()
  
  const ITEMS_PER_PAGE = 30

  // Read search parameter from URL or localStorage on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const searchParam = params.get('search')
    const storedJobRef = localStorage.getItem('shipmentSearchJobRef')
    
    if (searchParam) {
      setSearchText(searchParam)
      setSelectedStatuses([]) // Select "All" filter
    } else if (storedJobRef) {
      setSearchText(storedJobRef)
      setSelectedStatuses([]) // Select "All" filter
      localStorage.removeItem('shipmentSearchJobRef') // Clear after use
    }
  }, [])

  const { data: allShipments = [], isLoading } = useQuery<ExportShipment[]>({
    queryKey: ["/api/export-shipments"],
  })

  const { data: exportReceivers = [] } = useQuery<ExportReceiver[]>({
    queryKey: ["/api/export-receivers"],
  })

  const { data: exportCustomers = [] } = useQuery<ExportCustomer[]>({
    queryKey: ["/api/export-customers"],
  })

  const { data: customClearances = [] } = useQuery<CustomClearance[]>({
    queryKey: ["/api/custom-clearances"],
  })

  const { data: clearanceAgents = [] } = useQuery<ClearanceAgent[]>({
    queryKey: ["/api/clearance-agents"],
  })

  // Fetch all invoices
  const { data: allInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  })

  const { data: hauliers = [] } = useQuery<Haulier[]>({
    queryKey: ["/api/hauliers"],
  })

  const getReceiverName = (receiverId: string | null) => {
    if (!receiverId) return "N/A"
    const receiver = exportReceivers.find(r => r.id === receiverId)
    return receiver?.companyName || "N/A"
  }

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "N/A"
    const customer = exportCustomers.find(c => c.id === customerId)
    return customer?.companyName || "N/A"
  }

  const filteredByStatus = selectedStatuses.length === 0
    ? allShipments 
    : allShipments.filter(s => s.status && selectedStatuses.includes(s.status))

  const filteredByType = selectedShipmentTypes.length === 0
    ? filteredByStatus
    : filteredByStatus.filter(s => s.containerShipment && selectedShipmentTypes.includes(s.containerShipment))

  const filteredShipments = searchText.trim() === ""
    ? filteredByType
    : filteredByType.filter(s => {
        const searchLower = searchText.toLowerCase()
        const customerName = getCustomerName(s.destinationCustomerId).toLowerCase()
        const jobRef = s.jobRef.toString()
        const trailer = (s.trailerNo || "").toLowerCase()
        const vessel = (s.vesselName || "").toLowerCase()
        
        return jobRef.includes(searchLower) ||
               customerName.includes(searchLower) ||
               trailer.includes(searchLower) ||
               vessel.includes(searchLower)
      })
  
  // Reset to first page when filters or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchText, selectedStatuses, selectedShipmentTypes])
  
  // Pagination
  const totalPages = Math.ceil(filteredShipments.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const shipments = filteredShipments.slice(startIndex, endIndex)

  const createShipment = useMutation({
    mutationFn: async (data: InsertExportShipment) => {
      return apiRequest("POST", "/api/export-shipments", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      toast({ title: "Export shipment created successfully" })
    },
  })

  const updateShipment = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertExportShipment }) => {
      return apiRequest("PATCH", `/api/export-shipments/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      toast({ title: "Export shipment updated successfully" })
    },
  })

  const deleteShipment = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/export-shipments/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      toast({ title: "Export shipment deleted successfully" })
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/export-shipments/${id}`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      toast({ title: "Status updated successfully" })
    },
  })

  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return apiRequest("PATCH", `/api/export-shipments/${id}`, { additionalNotes: notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      setNotesShipmentId(null)
      setNotesValue("")
      toast({ title: "Notes updated successfully" })
    },
  })

  const updateAdviseClearanceToAgentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/export-shipments/${id}/advise-clearance-to-agent-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
    },
  })

  const updateInvoiceCustomerStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/export-shipments/${id}/invoice-customer-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
    },
  })

  const updateSendPodToCustomerStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/export-shipments/${id}/send-pod-to-customer-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
    },
  })

  const uploadFile = useMutation({
    mutationFn: async ({ id, file, fileType }: { id: string; file: File; fileType: "attachment" | "pod" }) => {
      // Get upload URL
      const uploadResponse = await fetch("/api/objects/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name })
      })
      const { uploadURL } = await uploadResponse.json()
      
      // Upload file to storage
      await fetch(uploadURL, {
        method: "PUT",
        body: file
      })
      
      // Get the file path (remove query params)
      const filePath = uploadURL.split('?')[0]
      
      // Update shipment with new file
      const shipment = allShipments.find(s => s.id === id)
      if (!shipment) throw new Error("Shipment not found")
      
      const currentFiles = fileType === "attachment" ? (shipment.attachments || []) : (shipment.proofOfDelivery || [])
      const updatedFiles = [...currentFiles, filePath]
      
      await apiRequest("PATCH", `/api/export-shipments/${id}`, {
        [fileType === "attachment" ? "attachments" : "proofOfDelivery"]: updatedFiles
      })
      
      return { filePath }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/job-file-groups"], refetchType: "all" })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      toast({ title: "File uploaded successfully" })
    },
    onError: () => {
      toast({ title: "File upload failed", variant: "destructive" })
    },
  })

  const deleteFile = useMutation({
    mutationFn: async ({ id, filePath, fileType }: { id: string; filePath: string; fileType: "attachment" | "pod" }) => {
      const shipment = allShipments.find(s => s.id === id)
      if (!shipment) throw new Error("Shipment not found")
      
      const currentFiles = fileType === "attachment" ? (shipment.attachments || []) : (shipment.proofOfDelivery || [])
      const updatedFiles = currentFiles.filter(f => f !== filePath)
      
      return apiRequest("PATCH", `/api/export-shipments/${id}`, {
        [fileType === "attachment" ? "attachments" : "proofOfDelivery"]: updatedFiles
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/job-file-groups"], refetchType: "all" })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      toast({ title: "File deleted successfully" })
    },
  })

  const deleteInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      await apiRequest('DELETE', `/api/invoices/${invoiceId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      toast({
        title: 'Invoice deleted successfully',
      })
      setDeletingInvoice(null)
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error.message || 'Failed to delete invoice',
        variant: 'destructive',
      })
    },
  })

  const handleOpenNotes = (shipment: ExportShipment) => {
    setNotesShipmentId(shipment.id)
    setNotesValue(shipment.additionalNotes || "")
  }

  const handleSaveNotes = () => {
    if (!notesShipmentId) return
    updateNotes.mutate({ id: notesShipmentId, notes: notesValue })
  }

  const handleCloseNotes = () => {
    setNotesShipmentId(null)
    setNotesValue("")
  }

  const handleCreateNew = () => {
    openWindow({
      id: `export-shipment-new-${Date.now()}`,
      type: 'export-shipment',
      title: 'New Export Shipment',
      payload: { 
        mode: 'create' as const,
        defaultValues: {} 
      }
    })
  }

  const handleEdit = (shipment: ExportShipment) => {
    openWindow({
      id: `export-shipment-${shipment.id}`,
      type: 'export-shipment',
      title: `Edit Export Shipment #${shipment.jobRef}`,
      payload: { 
        mode: 'edit' as const,
        defaultValues: shipment 
      }
    })
  }

  const handleDelete = (id: string) => {
    setDeletingShipmentId(id)
  }

  const confirmDelete = () => {
    if (!deletingShipmentId) return
    deleteShipment.mutate(deletingShipmentId)
    setDeletingShipmentId(null)
  }

  const handleDeleteFile = (id: string, filePath: string, fileType: "attachment" | "pod") => {
    const fileName = filePath.split('/').pop() || filePath
    setDeletingFile({ id, filePath, fileType, fileName })
  }

  const confirmDeleteFile = () => {
    if (deletingFile) {
      deleteFile.mutate({ 
        id: deletingFile.id, 
        filePath: deletingFile.filePath, 
        fileType: deletingFile.fileType 
      })
      setDeletingFile(null)
    }
  }

  const handleFileDragOver = (e: React.DragEvent, shipmentId: string, type: "attachment" | "pod") => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver({ shipmentId, type })
  }

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)
  }

  const handleFileDrop = async (e: React.DragEvent, shipmentId: string, type: "attachment" | "pod") => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    for (const file of files) {
      uploadFile.mutate({ id: shipmentId, file, fileType: type })
    }
  }

  const normalizeFilePath = (filePath: string) => {
    if (filePath.startsWith('/objects/')) return filePath
    if (filePath.startsWith('objects/')) return `/${filePath}`
    return filePath
  }

  const getLinkedClearance = (linkedClearanceId: string | null) => {
    if (!linkedClearanceId) return null
    return customClearances.find(c => c.id === linkedClearanceId) || null
  }

  const getClearanceStatusBadgeClass = (status: string) => {
    if (status === "Request CC") {
      return "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
    } else if (status === "Fully Cleared") {
      return "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
    } else if (status === "Waiting Arrival") {
      return "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
    } else if (status === "P.H Hold" || status === "Customs Issue") {
      return "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
    } else {
      return "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
    }
  }

  const toggleStatus = (currentStatus: string, id: string) => {
    const statusCycle: { [key: string]: string } = {
      "Awaiting Collection": "Dispatched",
      "Dispatched": "Delivered",
      "Delivered": "Completed",
      "Completed": "Awaiting Collection"
    }
    const nextStatus = statusCycle[currentStatus] || "Awaiting Collection"
    updateStatus.mutate({ id, status: nextStatus })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Awaiting Collection": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
      case "Dispatched": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
      case "Delivered": return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
      case "Completed": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"
    }
  }

  const parseAttachments = (attachments: string[] | null) => {
    if (!attachments) return []
    if (Array.isArray(attachments)) return attachments
    try {
      return JSON.parse(attachments as any)
    } catch {
      return []
    }
  }

  const getStatusIndicatorColor = (status: number | null) => {
    if (status === 1 || status === null) return "text-yellow-700 dark:text-yellow-400"
    if (status === 3) return "text-green-600 dark:text-green-400"
    if (status === 4) return "text-red-600 dark:text-red-400"
    return "text-muted-foreground"
  }

  const handleAdviseClearanceToAgentStatusUpdate = (id: string, status: number) => {
    updateAdviseClearanceToAgentStatus.mutate({ id, status })
  }

  const handleInvoiceCustomerStatusUpdate = (id: string, status: number) => {
    updateInvoiceCustomerStatus.mutate({ id, status })
  }

  const handleSendPodToCustomerStatusUpdate = (id: string, status: number) => {
    updateSendPodToCustomerStatus.mutate({ id, status })
  }

  const handleSendInvoiceToCustomerEmail = (shipment: ExportShipment) => {
    try {
      // Get all invoices for this shipment
      const shipmentInvoices = allInvoices.filter(inv => 
        inv.jobRef === shipment.jobRef && inv.jobType === 'export' && inv.jobId === shipment.id
      )
      
      // Check if invoices exist
      if (shipmentInvoices.length === 0) {
        toast({
          title: "No Invoices Found",
          description: "No invoices are attached to this job. Please create an invoice first.",
          variant: "destructive",
        })
        return
      }

      // If multiple invoices, show selection dialog
      if (shipmentInvoices.length > 1) {
        setInvoiceSelectionDialog({ shipment, invoices: shipmentInvoices })
        return
      }

      // Build email recipient data (handle both array and legacy string formats)
      const jobContactEmailArray = Array.isArray(shipment.jobContactEmail) 
        ? shipment.jobContactEmail 
        : (shipment.jobContactEmail ? [shipment.jobContactEmail] : [])
      const jobContactEmail = jobContactEmailArray[0] || ""
      const ccEmails = jobContactEmailArray.slice(1).join(", ")
      
      // Build subject
      const jobRef = shipment.jobRef || "N/A"
      const customerRef = shipment.customerReferenceNumber
      
      // Conditionally include "Your Ref" only if customerRef exists
      const yourRefPart = customerRef ? ` / Your Ref: ${customerRef}` : ""
      const subject = `R.S Invoice / Our Ref: ${jobRef}${yourRefPart}`
      
      const body = "Please find attached our Invoice."
      
      // Get invoice PDF paths - use the API endpoint for downloading invoices
      const invoiceFiles = shipmentInvoices.map(invoice => 
        `/api/invoices/${invoice.id}/pdf`
      )
      
      // Open email composer
      openEmailComposer({
        id: `email-${Date.now()}`,
        to: jobContactEmail,
        cc: ccEmails,
        bcc: "",
        subject: subject,
        body: body,
        attachments: invoiceFiles,
        metadata: {
          source: 'send-invoice-customer',
          shipmentId: shipment.id
        }
      })
    } catch (error) {
      console.error('Error opening email composer:', error)
      toast({
        title: "Failed to open email",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleConfirmInvoiceSelection = () => {
    if (!invoiceSelectionDialog) return
    
    const { shipment, invoices } = invoiceSelectionDialog
    const selectedInvoiceObjects = invoices.filter(inv => selectedInvoices.includes(inv.id))
    
    if (selectedInvoiceObjects.length === 0) {
      toast({
        title: "No Invoices Selected",
        description: "Please select at least one invoice to attach.",
        variant: "destructive",
      })
      return
    }

    // Build email recipient data (handle both array and legacy string formats)
    const jobContactEmailArray = Array.isArray(shipment.jobContactEmail) 
      ? shipment.jobContactEmail 
      : (shipment.jobContactEmail ? [shipment.jobContactEmail] : [])
    const jobContactEmail = jobContactEmailArray[0] || ""
    const ccEmails = jobContactEmailArray.slice(1).join(", ")
    
    // Build subject
    const jobRef = shipment.jobRef || "N/A"
    const customerRef = shipment.customerReferenceNumber
    
    // Conditionally include "Your Ref" only if customerRef exists
    const yourRefPart = customerRef ? ` / Your Ref: ${customerRef}` : ""
    const subject = `R.S Invoice / Our Ref: ${jobRef}${yourRefPart}`
    
    const body = "Please find attached our Invoice."
    
    // Get invoice PDF paths - use the API endpoint for downloading invoices
    const invoiceFiles = selectedInvoiceObjects.map(invoice => 
      `/api/invoices/${invoice.id}/pdf`
    )
    
    // Open email composer
    openEmailComposer({
      id: `email-${Date.now()}`,
      to: jobContactEmail,
      cc: ccEmails,
      bcc: "",
      subject: subject,
      body: body,
      attachments: invoiceFiles,
      metadata: {
        source: 'send-invoice-customer',
        shipmentId: shipment.id
      }
    })
    
    // Close dialog
    setInvoiceSelectionDialog(null)
    setSelectedInvoices([])
  }

  const handleSendPodToCustomerEmail = (shipment: ExportShipment) => {
    try {
      // Check if POD documents exist
      if (!shipment.proofOfDelivery || shipment.proofOfDelivery.length === 0) {
        toast({
          title: "No Proof Of Delivery Files",
          description: "No Proof Of Delivery Files are attached to this Job. Please upload a POD to the job file and then try again.",
          variant: "destructive",
        })
        return
      }

      // Build email recipient data (handle both array and legacy string formats)
      const jobContactEmailArray = Array.isArray(shipment.jobContactEmail) 
        ? shipment.jobContactEmail 
        : (shipment.jobContactEmail ? [shipment.jobContactEmail] : [])
      const jobContactEmail = jobContactEmailArray[0] || ""
      const ccEmails = jobContactEmailArray.slice(1).join(", ")
      
      // Build subject
      const customerRef = shipment.customerReferenceNumber
      const jobRef = shipment.jobRef || "N/A"
      const containerNumber = shipment.trailerNo || "N/A"
      const deliveryDate = formatDate(shipment.deliveryDate) || "N/A"
      
      let truckContainerFlight = ""
      if (shipment.containerShipment === "Container Shipment") {
        truckContainerFlight = `Container Number: ${containerNumber}`
      } else if (shipment.containerShipment === "Road Shipment") {
        truckContainerFlight = `Trailer Number: ${containerNumber}`
      } else if (shipment.containerShipment === "Air Freight") {
        truckContainerFlight = `Flight Number: ${containerNumber}`
      } else {
        truckContainerFlight = `Container or Trailer or Flight Number: ${containerNumber}`
      }
      
      // Conditionally include "Your Ref" only if customerRef exists
      const yourRefPart = customerRef ? `Your Ref: ${customerRef} / ` : ""
      const subject = `Export Delivery Update / ${yourRefPart}Our Ref: ${jobRef} / ${truckContainerFlight} / Delivery Date: ${deliveryDate}`
      
      // Build message body - conditionally include "your ref" only if customerRef exists
      // Handle multiple contact names (handle both array and legacy string formats)
      let greeting = "Hi there"
      const jobContactNameArray = Array.isArray(shipment.jobContactName)
        ? shipment.jobContactName
        : (shipment.jobContactName ? [shipment.jobContactName] : [])
      
      if (jobContactNameArray.length > 0) {
        if (jobContactNameArray.length === 1) {
          greeting = `Hi ${jobContactNameArray[0]}`
        } else if (jobContactNameArray.length === 2) {
          greeting = `Hi ${jobContactNameArray[0]} and ${jobContactNameArray[1]}`
        } else if (jobContactNameArray.length > 2) {
          const allButLast = jobContactNameArray.slice(0, -1).join(', ')
          greeting = `Hi ${allButLast}, and ${jobContactNameArray[jobContactNameArray.length - 1]}`
        }
      }
      
      const yourRefText = customerRef ? `, your ref ${customerRef}` : ""
      const body = `${greeting},

Please find enclosed Proof Of Delivery attached for this shipment${yourRefText}.

Hope all is OK.`
      
      // Get POD file paths and normalize them
      const normalizeFilePath = (path: string) => {
        if (!path) return ""
        if (path.startsWith("/objects/")) return path
        if (path.startsWith("objects/")) return `/${path}`
        return path
      }
      const podFiles = parseAttachments(shipment.proofOfDelivery).map(normalizeFilePath).filter(Boolean)
      
      // Open email composer
      openEmailComposer({
        id: `email-${Date.now()}`,
        to: jobContactEmail,
        cc: ccEmails,
        bcc: "",
        subject: subject,
        body: body,
        attachments: podFiles,
        metadata: {
          source: 'send-pod-customer-export',
          shipmentId: shipment.id
        }
      })
    } catch (error) {
      console.error('Error opening email composer:', error)
      toast({
        title: "Failed to open email",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const getCustomer = (customerId: string | null) => {
    if (!customerId) return null
    return exportCustomers.find(c => c.id === customerId) || null
  }

  const getReceiver = (receiverId: string | null) => {
    if (!receiverId) return null
    return exportReceivers.find(r => r.id === receiverId) || null
  }

  const formatCurrency = (currency: string | null) => {
    if (currency === "EUR") return "€"
    if (currency === "USD") return "$"
    return "£"
  }

  const handleClearanceAgentSelected = (agent: ClearanceAgent) => {
    try {
      if (!clearanceAgentDialog) return
      
      const shipment = allShipments.find(s => s.id === clearanceAgentDialog.shipmentId)
      if (!shipment) return
      
      // Get customer name
      const customer = exportCustomers.find(c => c.id === shipment.destinationCustomerId)
      const customerName = customer?.companyName || "N/A"
      
      // Build email subject (Export - no ETA field)
      const truckContainerFlight = shipment.trailerNo || "TBA"
      const subject = `Export Clearance / ${customerName} / Our Ref : ${shipment.jobRef} / ${truckContainerFlight}`
      
      // Build email body
      let body = `Hi Team,\n\nPlease could you arrange an Export Clearance on the below shipment. Our Ref : ${shipment.jobRef}\n\n`
      
      body += `Consignment will depart on ${shipment.containerShipment === "Road Shipment" ? "Trailer" : shipment.containerShipment === "Air Freight" ? "Flight" : "Container"} : ${shipment.trailerNo || "TBA"} Into ${shipment.portOfArrival || "TBA"} on ${formatDate(shipment.bookingDate) || "TBA"}.\n\n`
      
      body += `Exporter : ${customerName}\n`
      body += `${shipment.numberOfPieces || ""} ${shipment.packaging || ""}.\n`
      body += `${shipment.goodsDescription || ""}\n`
      
      // Add weight with "kgs" suffix if weight exists
      const weightText = shipment.weight ? `${shipment.weight} kgs` : ""
      body += `${weightText}\n\n`
      
      body += `Kind Regards`
      
      // Get attachments (transport documents)
      const attachments = shipment.attachments || []
      
      openEmailComposer({
        id: `email-${Date.now()}`,
        to: agent.agentExportEmail?.[0] || "",
        cc: "",
        bcc: "",
        subject,
        body,
        attachments,
        metadata: {
          source: 'advise-clearance-agent-export',
          shipmentId: shipment.id
        }
      })
      
      setClearanceAgentDialog(null)
    } catch (error) {
      console.error('Error composing email:', error)
      toast({
        title: "Error composing email",
        description: "Failed to prepare email. Please try again.",
        variant: "destructive"
      })
      setClearanceAgentDialog(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Export Shipments</h1>
          <p className="text-muted-foreground">
            Manage outgoing shipments and export clearances
          </p>
        </div>
        <Button data-testid="button-new-shipment" onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Export Shipment
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by job ref, receiver, trailer, vessel..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value)
              if (e.target.value.trim()) {
                setSelectedStatuses([])
              }
            }}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedShipmentTypes.includes("Container Shipment") ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedShipmentTypes(prev => {
                if (prev.includes("Container Shipment") && prev.length === 1) {
                  return prev
                }
                return prev.includes("Container Shipment") 
                  ? prev.filter(t => t !== "Container Shipment")
                  : [...prev, "Container Shipment"]
              })
            }}
            data-testid="filter-containers"
          >
            <Container className="h-4 w-4 mr-1" />
            Containers
          </Button>
          <Button
            variant={selectedShipmentTypes.includes("Road Shipment") ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedShipmentTypes(prev => {
                if (prev.includes("Road Shipment") && prev.length === 1) {
                  return prev
                }
                return prev.includes("Road Shipment") 
                  ? prev.filter(t => t !== "Road Shipment")
                  : [...prev, "Road Shipment"]
              })
            }}
            data-testid="filter-road"
          >
            <Truck className="h-4 w-4 mr-1" />
            Road Transport
          </Button>
          <Button
            variant={selectedShipmentTypes.includes("Air Freight") ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedShipmentTypes(prev => {
                if (prev.includes("Air Freight") && prev.length === 1) {
                  return prev
                }
                return prev.includes("Air Freight") 
                  ? prev.filter(t => t !== "Air Freight")
                  : [...prev, "Air Freight"]
              })
            }}
            data-testid="filter-air"
          >
            <Plane className="h-4 w-4 mr-1" />
            Air Freight
          </Button>
        </div>
        <div className="h-8 w-px bg-border"></div>
        <div className="flex gap-2">
          <Button
            variant={selectedStatuses.length === 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedStatuses([])}
            data-testid="filter-all"
          >
            All
          </Button>
          <Button
            variant={selectedStatuses.includes("Awaiting Collection") ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedStatuses(prev => 
                prev.includes("Awaiting Collection") 
                  ? prev.filter(s => s !== "Awaiting Collection")
                  : [...prev, "Awaiting Collection"]
              )
            }}
            data-testid="filter-awaiting-collection"
          >
            Awaiting Collection
          </Button>
          <Button
            variant={selectedStatuses.includes("Dispatched") ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedStatuses(prev => 
                prev.includes("Dispatched") 
                  ? prev.filter(s => s !== "Dispatched")
                  : [...prev, "Dispatched"]
              )
            }}
            data-testid="filter-dispatched"
          >
            Dispatched
          </Button>
          <Button
            variant={selectedStatuses.includes("Delivered") ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedStatuses(prev => 
                prev.includes("Delivered") 
                  ? prev.filter(s => s !== "Delivered")
                  : [...prev, "Delivered"]
              )
            }}
            data-testid="filter-delivered"
          >
            Delivered
          </Button>
          <Button
            variant={selectedStatuses.includes("Completed") ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedStatuses(prev => 
                prev.includes("Completed") 
                  ? prev.filter(s => s !== "Completed")
                  : [...prev, "Completed"]
              )
            }}
            data-testid="filter-completed"
          >
            Completed
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : shipments.length === 0 ? (
        <div className="text-center py-12" data-testid="empty-state">
          <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No export shipments yet</p>
          <Button variant="outline" className="mt-4" onClick={handleCreateNew} data-testid="button-create-first">
            Create your first export shipment
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shipments.map((shipment) => (
            <Card key={shipment.id} data-testid={`card-shipment-${shipment.id}`} className="bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <h3 
                        className="font-semibold text-lg text-green-600 dark:text-green-400 hover:underline cursor-pointer" 
                        onClick={() => setViewingShipment(shipment)}
                        data-testid={`text-job-ref-${shipment.id}`}
                      >
                        {shipment.jobRef}
                      </h3>
                      <div className="flex -space-x-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenNotes(shipment)}
                          data-testid={`button-notes-${shipment.id}`}
                          title={shipment.additionalNotes || "Additional Notes"}
                          className="h-7 w-7"
                        >
                          <StickyNote className={`h-4 w-4 ${shipment.additionalNotes ? 'text-yellow-600 dark:text-yellow-400' : ''}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(shipment)}
                          data-testid={`button-edit-${shipment.id}`}
                          className="h-7 w-7"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(shipment.id)}
                          data-testid={`button-delete-${shipment.id}`}
                          className="h-7 w-7"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-receiver-${shipment.id}`}>
                      {getCustomerName(shipment.destinationCustomerId)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          className={`${getStatusColor(shipment.status)} inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer hover:opacity-80`}
                          data-testid={`badge-status-${shipment.id}`}
                        >
                          {shipment.status}
                          <ChevronDown className="h-3 w-3 text-white" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: shipment.id, status: "Awaiting Collection" })}>
                          Awaiting Collection
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: shipment.id, status: "Dispatched" })}>
                          Dispatched
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: shipment.id, status: "Delivered" })}>
                          Delivered
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus.mutate({ id: shipment.id, status: "Completed" })}>
                          Completed
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {shipment.linkedClearanceId && (() => {
                      const linkedClearance = getLinkedClearance(shipment.linkedClearanceId)
                      return linkedClearance ? (
                        <button
                          onClick={() => setLocation(`/custom-clearances?search=${shipment.jobRef}`)}
                          className={`${getClearanceStatusBadgeClass(linkedClearance.status)} inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer hover:opacity-80`}
                          data-testid={`badge-clearance-status-${shipment.id}`}
                        >
                          {linkedClearance.status}
                        </button>
                      ) : null
                    })()}
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  {shipment.trailerNo && (
                    <>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-semibold text-lg" data-testid={`text-trailer-${shipment.id}`}>
                          {shipment.trailerNo}
                        </p>
                        <p className="font-semibold text-lg" data-testid={`text-eta-port-date-${shipment.id}`}>
                          <span>{shipment.containerShipment === "Air Freight" ? "ETA Airport:" : "ETA Customs:"}</span>{' '}
                          {formatDate(shipment.etaPortDate) || (
                            <span className="text-yellow-700 dark:text-yellow-400">TBA</span>
                          )}
                        </p>
                      </div>
                    </>
                  )}
                  {shipment.containerShipment === "Container Shipment" && shipment.vesselName && (
                    <p className="font-semibold text-lg" data-testid={`text-vessel-name-${shipment.id}`}>
                      {shipment.vesselName}
                    </p>
                  )}
                  {shipment.containerShipment !== "Air Freight" && shipment.haulierName && (
                    <p className="font-semibold text-lg" data-testid={`text-haulier-name-${shipment.id}`}>
                      {shipment.haulierName}
                    </p>
                  )}
                  <p data-testid={`text-collection-date-${shipment.id}`}>
                    <span>Collection Date:</span>{' '}
                    {formatDate(shipment.collectionDate) || (
                      <span className="text-yellow-700 dark:text-yellow-400">TBA</span>
                    )}
                  </p>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p data-testid={`text-delivery-date-${shipment.id}`}>
                      <span>Delivery Date:</span>{' '}
                      {formatDate(shipment.deliveryDate) || (
                        <span className="text-yellow-700 dark:text-yellow-400">TBA</span>
                      )}
                    </p>
                    {shipment.portOfArrival && (
                      <p data-testid={`text-port-${shipment.id}`}>
                        <span>
                          {shipment.containerShipment === "Container Shipment" 
                            ? "Port Of Arrival:" 
                            : shipment.containerShipment === "Air Freight"
                            ? "Arrival Airport:"
                            : "Destination:"}
                        </span>{' '}
                        {shipment.portOfArrival}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 mt-2 border-t space-y-1">
                    {shipment.goodsDescription && (
                      <p className="text-muted-foreground line-clamp-2" data-testid={`text-description-${shipment.id}`}>
                        {shipment.goodsDescription}
                      </p>
                    )}
                    {(shipment.weight || (shipment.numberOfPieces && shipment.packaging)) && (
                      <p className="text-muted-foreground" data-testid={`text-weight-pieces-${shipment.id}`}>
                        {shipment.weight && <>Weight: {shipment.weight} kgs</>}
                        {shipment.weight && shipment.numberOfPieces && shipment.packaging && ', '}
                        {shipment.numberOfPieces && shipment.packaging && `${shipment.numberOfPieces} ${shipment.packaging}`}
                      </p>
                    )}
                  </div>
                  
                  {shipment.exportClearanceAgent === "R.S" && (
                  <div className="pt-2 mt-2 border-t">
                    <h3 className="font-semibold text-lg mb-2" data-testid={`text-todo-title-${shipment.id}`}>
                      To-Do List
                    </h3>
                    <div className="mt-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setClearanceAgentDialog({ show: true, shipmentId: shipment.id })}
                            className="hover-elevate rounded p-0 shrink-0"
                            data-testid={`button-advise-clearance-icon-${shipment.id}`}
                          >
                            <ClipboardCheck className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
                          </button>
                          <p className={`text-xs font-medium ${getStatusIndicatorColor(shipment.adviseClearanceToAgentStatusIndicator)}`} data-testid={`text-advise-clearance-${shipment.id}`}>
                            Advise Clearance to Agent
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAdviseClearanceToAgentStatusUpdate(shipment.id, 1)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.adviseClearanceToAgentStatusIndicator === 1 || shipment.adviseClearanceToAgentStatusIndicator === null
                                ? 'bg-yellow-400 border-yellow-500 scale-110'
                                : 'bg-yellow-200 border-yellow-300 hover-elevate'
                            }`}
                            data-testid={`button-advise-clearance-status-yellow-${shipment.id}`}
                            title="To Do"
                          />
                          <button
                            onClick={() => handleAdviseClearanceToAgentStatusUpdate(shipment.id, 3)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.adviseClearanceToAgentStatusIndicator === 3
                                ? 'bg-green-400 border-green-500 scale-110'
                                : 'bg-green-200 border-green-300 hover-elevate'
                            }`}
                            data-testid={`button-advise-clearance-status-green-${shipment.id}`}
                            title="Completed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                  <div className="mt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <PoundSterling className="h-4 w-4 text-muted-foreground shrink-0" />
                        <button
                          onClick={() => setInvoiceShipment(shipment)}
                          className={`text-xs font-medium ${getStatusIndicatorColor(shipment.invoiceCustomerStatusIndicator)} hover:underline cursor-pointer`}
                          data-testid={`button-invoice-customer-${shipment.id}`}
                        >
                          Invoice Customer
                        </button>
                        <button
                          onClick={() => handleSendInvoiceToCustomerEmail(shipment)}
                          className="hover-elevate active-elevate-2 p-0 rounded shrink-0"
                          data-testid={`button-send-invoice-email-${shipment.id}`}
                          title="Send invoice email to customer"
                        >
                          <Send className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleInvoiceCustomerStatusUpdate(shipment.id, 1)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.invoiceCustomerStatusIndicator === 1 || shipment.invoiceCustomerStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover-elevate'
                          }`}
                          data-testid={`button-invoice-status-yellow-${shipment.id}`}
                          title="To Do"
                        />
                        <button
                          onClick={() => handleInvoiceCustomerStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.invoiceCustomerStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover-elevate'
                          }`}
                          data-testid={`button-invoice-status-green-${shipment.id}`}
                          title="Completed"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSendPodToCustomerEmail(shipment)}
                          className="hover-elevate active-elevate-2 p-0 rounded shrink-0"
                          data-testid={`button-send-pod-email-${shipment.id}`}
                          title="Send POD email to customer"
                        >
                          <Send className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <p className={`text-xs font-medium ${getStatusIndicatorColor(shipment.sendPodToCustomerStatusIndicator)}`} data-testid={`text-send-pod-${shipment.id}`}>
                          Send POD To Customer
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSendPodToCustomerStatusUpdate(shipment.id, 1)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.sendPodToCustomerStatusIndicator === 1 || shipment.sendPodToCustomerStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover-elevate'
                          }`}
                          data-testid={`button-send-pod-status-yellow-${shipment.id}`}
                          title="To Do"
                        />
                        <button
                          onClick={() => handleSendPodToCustomerStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.sendPodToCustomerStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover-elevate'
                          }`}
                          data-testid={`button-send-pod-status-green-${shipment.id}`}
                          title="Completed"
                        />
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const attachmentFiles = parseAttachments(shipment.attachments)
                    const podFiles = parseAttachments(shipment.proofOfDelivery)
                    return (
                      <div className="mt-2 pt-2 border-t">
                        <div className="grid grid-cols-2 gap-2">
                          <div 
                            className="space-y-1"
                            onDragOver={(e) => handleFileDragOver(e, shipment.id, "attachment")}
                            onDragLeave={handleFileDragLeave}
                            onDrop={(e) => handleFileDrop(e, shipment.id, "attachment")}
                          >
                            <p className="text-xs font-medium text-muted-foreground">Documents</p>
                            <div className={`min-h-[2.5rem] p-1.5 rounded border-2 border-dashed transition-colors ${
                              dragOver?.shipmentId === shipment.id && dragOver?.type === "attachment"
                                ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                                : "border-transparent"
                            }`}>
                              {attachmentFiles.length > 0 ? (
                                <div className="space-y-0.5">
                                  {attachmentFiles.map((filePath: string, idx: number) => {
                                    const fileName = filePath.split('/').pop() || filePath
                                    const downloadPath = normalizeFilePath(filePath)
                                    return (
                                      <div key={idx} className="flex items-center gap-1 group">
                                        <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        <a
                                          href={downloadPath}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary hover:underline truncate flex-1 cursor-pointer"
                                          title={fileName}
                                        >
                                          {fileName}
                                        </a>
                                        <button
                                          onClick={() => handleDeleteFile(shipment.id, filePath, "attachment")}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-destructive/10 rounded"
                                          data-testid={`button-delete-attachment-${idx}`}
                                          title="Delete file"
                                        >
                                          <X className="h-3 w-3 text-destructive" />
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <p className={`text-xs italic transition-colors ${
                                  dragOver?.shipmentId === shipment.id && dragOver?.type === "attachment"
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-muted-foreground"
                                }`}>
                                  {dragOver?.shipmentId === shipment.id && dragOver?.type === "attachment" ? "Drop files here" : "None"}
                                </p>
                              )}
                            </div>
                          </div>
                          <div 
                            className="space-y-1"
                            onDragOver={(e) => handleFileDragOver(e, shipment.id, "pod")}
                            onDragLeave={handleFileDragLeave}
                            onDrop={(e) => handleFileDrop(e, shipment.id, "pod")}
                          >
                            <p className="text-xs font-medium text-muted-foreground">POD</p>
                            <div className={`min-h-[2.5rem] p-1.5 rounded border-2 border-dashed transition-colors ${
                              dragOver?.shipmentId === shipment.id && dragOver?.type === "pod"
                                ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                                : "border-transparent"
                            }`}>
                              {podFiles.length > 0 ? (
                                <div className="space-y-0.5">
                                  {podFiles.map((filePath: string, idx: number) => {
                                    const fileName = filePath.split('/').pop() || filePath
                                    const downloadPath = normalizeFilePath(filePath)
                                    return (
                                      <div key={idx} className="flex items-center gap-1 group">
                                        <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        <a
                                          href={downloadPath}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary hover:underline truncate flex-1 cursor-pointer"
                                          title={fileName}
                                        >
                                          {fileName}
                                        </a>
                                        <button
                                          onClick={() => handleDeleteFile(shipment.id, filePath, "pod")}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-destructive/10 rounded"
                                          data-testid={`button-delete-pod-${idx}`}
                                          title="Delete file"
                                        >
                                          <X className="h-3 w-3 text-destructive" />
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <p className={`text-xs italic transition-colors ${
                                  dragOver?.shipmentId === shipment.id && dragOver?.type === "pod"
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-muted-foreground"
                                }`}>
                                  {dragOver?.shipmentId === shipment.id && dragOver?.type === "pod" ? "Drop files here" : "None"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-muted-foreground">R.S Invoice & Credits</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => setInvoiceShipment(shipment)}
                                data-testid={`button-create-invoice-${shipment.id}`}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                <span className="text-xs">Invoice</span>
                              </Button>
                            </div>
                            {(() => {
                              const shipmentInvoices = allInvoices.filter(inv => 
                                inv.jobRef === shipment.jobRef && inv.jobType === 'export' && inv.jobId === shipment.id
                              )
                              return shipmentInvoices.length > 0 ? (
                                <div className="grid grid-cols-2 gap-1">
                                  {shipmentInvoices.map((invoice) => {
                                    const isCredit = invoice.type === 'credit_note'
                                    const prefix = isCredit ? 'CR' : 'INV'
                                    const colorClass = isCredit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                    return (
                                    <div key={invoice.id} className="flex items-center gap-1 group">
                                      <Receipt className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <span
                                        className={`text-xs ${colorClass} hover:underline cursor-pointer truncate flex-1`}
                                        title={`${prefix} ${invoice.invoiceNumber} - £${invoice.total.toFixed(2)}`}
                                      >
                                        {prefix} {invoice.invoiceNumber} - £{invoice.total.toFixed(2)}
                                      </span>
                                      <button
                                        onClick={() => setEditingInvoice({ invoice, shipment })}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        data-testid={`button-edit-invoice-${invoice.id}`}
                                      >
                                        <Pencil className="h-3 w-3 text-primary hover:text-primary/80" />
                                      </button>
                                      <button
                                        onClick={() => setDeletingInvoice(invoice)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        data-testid={`button-delete-invoice-${invoice.id}`}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive hover:text-destructive/80" />
                                      </button>
                                      <a
                                        href={`/api/invoices/${invoice.id}/pdf`}
                                        download={`RS Invoice - ${invoice.jobRef}.pdf`}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        data-testid={`button-download-invoice-${invoice.id}`}
                                      >
                                        <FileOutput className="h-3 w-3 text-primary hover:text-primary/80" />
                                      </a>
                                    </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">None</p>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {!isLoading && filteredShipments.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredShipments.length)} of {filteredShipments.length} shipments
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deletingShipmentId} onOpenChange={(open) => !open && setDeletingShipmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this export shipment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingFile} onOpenChange={(open) => !open && setDeletingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFile?.fileName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFile}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!notesShipmentId} onOpenChange={(open) => !open && handleCloseNotes()}>
        <DialogContent className="max-w-3xl h-[400px] flex flex-col" aria-describedby="export-notes-description">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Additional Notes</DialogTitle>
            <p id="export-notes-description" className="sr-only">Add or edit additional notes for this export shipment</p>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCloseNotes}
              data-testid="button-close-notes"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="flex-1 py-4">
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              className="h-full resize-none"
              placeholder="Enter additional notes here..."
              data-testid="textarea-notes"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCloseNotes}
              data-testid="button-close-without-saving"
            >
              Close Without Saving
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={updateNotes.isPending}
              data-testid="button-save-notes"
            >
              {updateNotes.isPending ? "Saving..." : "Save/Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!clearanceAgentDialog} onOpenChange={(open) => !open && setClearanceAgentDialog(null)}>
        <DialogContent className="max-w-md" aria-describedby="clearance-agent-description">
          <DialogHeader>
            <DialogTitle>Select Clearance Agent</DialogTitle>
            <p id="clearance-agent-description" className="sr-only">Choose a clearance agent to send the clearance request</p>
          </DialogHeader>
          <div className="space-y-2">
            {clearanceAgents.map((agent) => (
              <Button
                key={agent.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleClearanceAgentSelected(agent)}
                data-testid={`button-agent-${agent.id}`}
              >
                {agent.agentName}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingShipment} onOpenChange={(open) => !open && setViewingShipment(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="shipment-details-description">
          <p id="shipment-details-description" className="sr-only">View complete shipment details and information</p>
          <DialogHeader className="border-b pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {viewingShipment?.containerShipment === "Road Shipment" ? (
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Truck className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                ) : viewingShipment?.containerShipment === "Container Shipment" ? (
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Container className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                ) : viewingShipment?.containerShipment === "Air Freight" ? (
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Plane className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                )}
                <div>
                  <DialogTitle className="text-2xl leading-none">
                    R.S Export Shipment {viewingShipment?.jobRef}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground">
                      Created {viewingShipment?.createdAt && (() => {
                        const date = new Date(viewingShipment.createdAt);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = String(date.getFullYear()).slice(-2);
                        let hours = date.getHours();
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        hours = hours % 12 || 12;
                        return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
                      })()}
                    </p>
                    {viewingShipment && (
                      <Badge className={getStatusColor(viewingShipment.status)} data-testid="badge-detail-status">
                        {viewingShipment.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (viewingShipment) {
                      openWindow({
                        id: `export-shipment-${viewingShipment.id}`,
                        type: 'export-shipment',
                        title: `Edit Export Shipment #${viewingShipment.jobRef}`,
                        payload: { 
                          mode: 'edit' as const,
                          defaultValues: viewingShipment 
                        }
                      })
                      setViewingShipment(null)
                    }
                  }}
                  data-testid="button-edit-shipment"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {viewingShipment && (
            <div className="space-y-4 pt-4">
              <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-lg text-green-900 dark:text-green-100">Customer & Receiver Information</h3>
                  </div>
                  {(() => {
                    const customer = exportCustomers.find(c => c.id === viewingShipment.destinationCustomerId)
                    const hasAgent = customer?.agentName
                    
                    return (
                      <div className="space-y-4">
                        <div className={hasAgent ? "grid grid-cols-1 gap-4" : "grid grid-cols-4 gap-4"}>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Customer</p>
                            <p className="font-semibold text-base">{getCustomerName(viewingShipment.destinationCustomerId)}</p>
                          </div>
                          {!hasAgent && viewingShipment.jobContactName && viewingShipment.jobContactName.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Contact Name</p>
                              <p className="text-base">{viewingShipment.jobContactName.join(", ")}</p>
                            </div>
                          )}
                          {!hasAgent && viewingShipment.jobContactEmail && viewingShipment.jobContactEmail.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Email</p>
                              <div className="flex flex-col gap-1">
                                {viewingShipment.jobContactEmail.map((email, idx) => (
                                  <a 
                                    key={idx} 
                                    href={`mailto:${email}`} 
                                    className="text-base text-green-600 dark:text-green-400 hover:underline"
                                  >
                                    {email}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {!hasAgent && customer?.telephone && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Telephone</p>
                              <p className="text-base">{customer.telephone}</p>
                            </div>
                          )}
                        </div>
                        
                        {hasAgent && (
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Agent Name</p>
                              <p className="text-base">{customer.agentName}</p>
                            </div>
                            {viewingShipment.jobContactName && viewingShipment.jobContactName.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Contact Name</p>
                                <p className="text-base">{viewingShipment.jobContactName.join(", ")}</p>
                              </div>
                            )}
                            {viewingShipment.jobContactEmail && viewingShipment.jobContactEmail.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Email</p>
                                <div className="flex flex-col gap-1">
                                  {viewingShipment.jobContactEmail.map((email, idx) => (
                                    <a 
                                      key={idx} 
                                      href={`mailto:${email}`} 
                                      className="text-base text-green-600 dark:text-green-400 hover:underline"
                                    >
                                      {email}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            {customer.agentTelephone && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Telephone</p>
                                <p className="text-base">{customer.agentTelephone}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="border-t border-green-200 dark:border-green-800 my-3"></div>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Receiver</p>
                            <p className="font-semibold text-base">{getReceiverName(viewingShipment.receiverId)}</p>
                          </div>
                          <div className="col-start-4">
                            {viewingShipment.customerReferenceNumber && (
                              <>
                                <p className="text-xs text-muted-foreground mb-1">Customer Reference</p>
                                <p className="text-base">{viewingShipment.customerReferenceNumber}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Ship className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-lg text-green-900 dark:text-green-100">Shipment Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingShipment.containerShipment && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Shipment Type</p>
                        <p className="font-semibold text-base">{viewingShipment.containerShipment}</p>
                      </div>
                    )}
                    {viewingShipment.trailerNo && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {viewingShipment.containerShipment === "Container Shipment" ? "Container Number" :
                           viewingShipment.containerShipment === "Air Freight" ? "Flight Number" : "Trailer Number"}
                        </p>
                        <p className="font-semibold text-base">{viewingShipment.trailerNo}</p>
                      </div>
                    )}
                    {viewingShipment.vesselName && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {viewingShipment.containerShipment === "Container Shipment" ? "Vessel Name" :
                           viewingShipment.containerShipment === "Air Freight" ? "Flight Details" : "Carrier"}
                        </p>
                        <p className="text-base">{viewingShipment.vesselName}</p>
                      </div>
                    )}
                    {viewingShipment.portOfArrival && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {viewingShipment.containerShipment === "Container Shipment" ? "Port Of Arrival" :
                           viewingShipment.containerShipment === "Air Freight" ? "Arrival Airport" : "Destination"}
                        </p>
                        <p className="text-base">{viewingShipment.portOfArrival}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-lg text-green-900 dark:text-green-100">Important Dates</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {viewingShipment.collectionDate && (
                      <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-xs text-muted-foreground mb-1">Collection Date</p>
                        <p className="font-semibold text-sm">{formatDate(viewingShipment.collectionDate)}</p>
                      </div>
                    )}
                    {viewingShipment.deliveryDate && (
                      <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-xs text-muted-foreground mb-1">Delivery Date</p>
                        <p className="font-semibold text-sm">{formatDate(viewingShipment.deliveryDate)}</p>
                      </div>
                    )}
                    {viewingShipment.etaPortDate && (
                      <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-xs text-muted-foreground mb-1">ETA Customs</p>
                        <p className="font-semibold text-sm">{formatDate(viewingShipment.etaPortDate)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Box className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <h3 className="font-semibold text-lg text-green-900 dark:text-green-100">Cargo</h3>
                    </div>
                    <div className="space-y-3">
                      {viewingShipment.goodsDescription && (
                        <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-xs text-muted-foreground mb-1">Goods Description</p>
                          <p className="font-semibold text-sm text-green-900 dark:text-green-100">{viewingShipment.goodsDescription}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {viewingShipment.numberOfPieces && (
                          <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-muted-foreground mb-1">Pieces</p>
                            <p className="font-semibold text-sm text-green-900 dark:text-green-100">{viewingShipment.numberOfPieces} {viewingShipment.packaging}</p>
                          </div>
                        )}
                        {viewingShipment.weight && (
                          <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-muted-foreground mb-1">Weight</p>
                            <p className="font-semibold text-sm text-green-900 dark:text-green-100">{viewingShipment.weight} kgs</p>
                          </div>
                        )}
                        {viewingShipment.cube && (
                          <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800 col-span-2">
                            <p className="text-xs text-muted-foreground mb-1">Cube</p>
                            <p className="font-semibold text-sm text-green-900 dark:text-green-100">{viewingShipment.cube}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Truck className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <h3 className="font-semibold text-lg text-green-900 dark:text-green-100">Haulier Information</h3>
                    </div>
                    <div className="space-y-3">
                      {viewingShipment.haulierName && (
                        <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-xs text-muted-foreground mb-1">Haulier</p>
                          <p className="font-semibold text-sm text-green-900 dark:text-green-100">{viewingShipment.haulierName}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {viewingShipment.haulierContactName && viewingShipment.haulierContactName.length > 0 && (
                          <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-muted-foreground mb-1">Contact Name</p>
                            <p className="font-semibold text-sm text-green-900 dark:text-green-100">{viewingShipment.haulierContactName.join(", ")}</p>
                          </div>
                        )}
                        {viewingShipment.haulierTelephone && (
                          <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-muted-foreground mb-1">Telephone</p>
                            <p className="font-semibold text-sm text-green-900 dark:text-green-100">{viewingShipment.haulierTelephone}</p>
                          </div>
                        )}
                      </div>
                      {viewingShipment.haulierEmail && viewingShipment.haulierEmail.length > 0 && (
                        <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-xs text-muted-foreground mb-1">Email</p>
                          <div className="flex flex-col gap-1">
                            {viewingShipment.haulierEmail.map((email, idx) => (
                              <a 
                                key={idx} 
                                href={`mailto:${email}`} 
                                className="font-semibold text-sm text-green-600 dark:text-green-400 hover:underline"
                              >
                                {email}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="font-semibold text-lg text-purple-900 dark:text-purple-100">Customs Clearance</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {viewingShipment.exportClearanceAgent && (
                      <div className="bg-white dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground mb-1">Export Clearance Agent</p>
                        <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">{viewingShipment.exportClearanceAgent}</p>
                      </div>
                    )}
                    {viewingShipment.arrivalClearanceAgent && (
                      <div className="bg-white dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground mb-1">Arrival Clearance Agent</p>
                        <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">{viewingShipment.arrivalClearanceAgent}</p>
                      </div>
                    )}
                    {viewingShipment.clearanceType && (
                      <div className="bg-white dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground mb-1">Clearance Type</p>
                        <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">{viewingShipment.clearanceType}</p>
                      </div>
                    )}
                    {viewingShipment.value && (
                      <div className="bg-white dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground mb-1">Invoice Value</p>
                        <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">{formatCurrency(viewingShipment.currency || "GBP")}{viewingShipment.value}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <PoundSterling className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <h3 className="font-semibold text-lg text-green-900 dark:text-green-100">R.S Charges / Income</h3>
                      {(() => {
                        const total = [
                          viewingShipment.freightRateOut,
                          viewingShipment.clearanceCharge,
                          viewingShipment.arrivalClearanceCost,
                          viewingShipment.additionalCommodityCodeCharge,
                          ...(viewingShipment.expensesToChargeOut || []).map((e: { amount: string }) => e.amount)
                        ]
                          .filter(Boolean)
                          .reduce((sum, val) => sum + (parseFloat(val as string) || 0), 0);
                        
                        return total > 0 ? (
                          <Badge variant="outline" className="ml-auto text-xs border-green-300 dark:border-green-700">
                            {formatCurrency(viewingShipment.currency || "GBP")}{total.toFixed(2)}
                          </Badge>
                        ) : null;
                      })()}
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        {viewingShipment.freightRateOut && (
                          <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-muted-foreground mb-1">Freight Rate</p>
                            <p className="font-semibold text-sm text-green-900 dark:text-green-100 text-right">{formatCurrency(viewingShipment.currency || "GBP")}{viewingShipment.freightRateOut}</p>
                          </div>
                        )}
                        {viewingShipment.exportClearanceAgent === "R.S" && viewingShipment.clearanceCharge && (
                          <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-muted-foreground mb-1">Export Clearance</p>
                            <p className="font-semibold text-sm text-green-900 dark:text-green-100 text-right">{formatCurrency(viewingShipment.currency || "GBP")}{viewingShipment.clearanceCharge}</p>
                          </div>
                        )}
                        {viewingShipment.arrivalClearanceCost && (
                          <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-muted-foreground mb-1">Destination Clearance</p>
                            <p className="font-semibold text-sm text-green-900 dark:text-green-100 text-right">{formatCurrency(viewingShipment.currency || "GBP")}{viewingShipment.arrivalClearanceCost}</p>
                          </div>
                        )}
                      </div>
                      {viewingShipment.additionalCommodityCodes !== null && viewingShipment.additionalCommodityCodes > 1 && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-muted-foreground mb-1">Total Commodity Codes</p>
                            <p className="font-semibold text-sm text-green-900 dark:text-green-100 text-right">{viewingShipment.additionalCommodityCodes}</p>
                          </div>
                          {viewingShipment.additionalCommodityCodeCharge && (
                            <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                              <p className="text-xs text-muted-foreground mb-1">Additional HS Code Charge</p>
                              <p className="font-semibold text-sm text-green-900 dark:text-green-100 text-right">
                                {formatCurrency(viewingShipment.currency || "GBP")}{((viewingShipment.additionalCommodityCodes - 1) * parseFloat(viewingShipment.additionalCommodityCodeCharge)).toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {viewingShipment.expensesToChargeOut && viewingShipment.expensesToChargeOut.length > 0 && (
                        <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-xs text-muted-foreground mb-2">Additional Charges Out</p>
                          <div className="space-y-1">
                            {viewingShipment.expensesToChargeOut.map((expense: { description: string; amount: string }, idx: number) => (
                              <div key={idx} className="flex justify-between items-center">
                                <span className="text-sm text-green-900 dark:text-green-100">{expense.description}</span>
                                <span className="font-semibold text-sm text-green-900 dark:text-green-100 text-right">{formatCurrency(viewingShipment.currency || "GBP")}{expense.amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <PoundSterling className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      <h3 className="font-semibold text-lg text-orange-900 dark:text-orange-100">Job Expenses</h3>
                      {(() => {
                        const total = [
                          viewingShipment.haulierFreightRateIn,
                          viewingShipment.exportClearanceChargeIn,
                          viewingShipment.destinationClearanceCostIn,
                          ...(viewingShipment.additionalExpensesIn || []).map((e: { amount: string }) => e.amount)
                        ]
                          .filter(Boolean)
                          .reduce((sum, val) => sum + (parseFloat(val as string) || 0), 0);
                        
                        return total > 0 ? (
                          <Badge variant="outline" className="ml-auto text-xs border-orange-300 dark:border-orange-700">
                            {formatCurrency(viewingShipment.currencyIn || "GBP")}{total.toFixed(2)}
                          </Badge>
                        ) : null;
                      })()}
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        {viewingShipment.haulierFreightRateIn && (
                          <div className="bg-white dark:bg-orange-950/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                            <p className="text-xs text-muted-foreground mb-1">Haulier Freight</p>
                            <p className="font-semibold text-sm text-orange-900 dark:text-orange-100 text-right">{formatCurrency(viewingShipment.currencyIn || "GBP")}{viewingShipment.haulierFreightRateIn}</p>
                          </div>
                        )}
                        {viewingShipment.exportClearanceChargeIn && (
                          <div className="bg-white dark:bg-orange-950/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                            <p className="text-xs text-muted-foreground mb-1">Export Clearance</p>
                            <p className="font-semibold text-sm text-orange-900 dark:text-orange-100 text-right">{formatCurrency(viewingShipment.currencyIn || "GBP")}{viewingShipment.exportClearanceChargeIn}</p>
                          </div>
                        )}
                        {viewingShipment.destinationClearanceCostIn && (
                          <div className="bg-white dark:bg-orange-950/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                            <p className="text-xs text-muted-foreground mb-1">Destination Clearance</p>
                            <p className="font-semibold text-sm text-orange-900 dark:text-orange-100 text-right">{formatCurrency(viewingShipment.currencyIn || "GBP")}{viewingShipment.destinationClearanceCostIn}</p>
                          </div>
                        )}
                      </div>
                      {viewingShipment.additionalExpensesIn && viewingShipment.additionalExpensesIn.length > 0 && (
                        <div className="bg-white dark:bg-orange-950/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                          <p className="text-xs text-muted-foreground mb-2">Additional Expenses In</p>
                          <div className="space-y-1">
                            {viewingShipment.additionalExpensesIn.map((expense: { description: string; amount: string }, idx: number) => (
                              <div key={idx} className="flex justify-between items-center">
                                <span className="text-sm text-orange-900 dark:text-orange-100">{expense.description}</span>
                                <span className="font-semibold text-sm text-orange-900 dark:text-orange-100 text-right">{formatCurrency(viewingShipment.currencyIn || "GBP")}{expense.amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {viewingShipment.additionalNotes && (
                <Card className="bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <ClipboardList className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <h3 className="font-semibold text-lg text-yellow-900 dark:text-yellow-100">Additional Notes</h3>
                    </div>
                    <div className="bg-white dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900">
                      <p className="whitespace-pre-wrap text-sm">{viewingShipment.additionalNotes}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Invoice Form Dialog - Create */}
      <CustomerInvoiceForm
        job={invoiceShipment}
        jobType="export"
        open={!!invoiceShipment}
        onOpenChange={(open) => !open && setInvoiceShipment(null)}
      />

      {/* Customer Invoice Form Dialog - Edit */}
      <CustomerInvoiceForm
        job={editingInvoice?.shipment || null}
        jobType="export"
        open={!!editingInvoice}
        onOpenChange={(open) => !open && setEditingInvoice(null)}
        existingInvoice={editingInvoice?.invoice || null}
      />

      {/* Invoice Selection Dialog */}
      <Dialog open={!!invoiceSelectionDialog} onOpenChange={(open) => !open && setInvoiceSelectionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Invoices to Attach</DialogTitle>
            <DialogDescription>Choose which invoices to attach to the email</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {invoiceSelectionDialog?.invoices.map((invoice) => {
              const isCredit = invoice.type === 'credit_note'
              const prefix = isCredit ? 'CR' : 'INV'
              const colorClass = isCredit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
              return (
                <div key={invoice.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`invoice-${invoice.id}`}
                    checked={selectedInvoices.includes(invoice.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedInvoices([...selectedInvoices, invoice.id])
                      } else {
                        setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id))
                      }
                    }}
                    data-testid={`checkbox-invoice-${invoice.id}`}
                  />
                  <label
                    htmlFor={`invoice-${invoice.id}`}
                    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${colorClass}`}
                  >
                    {prefix} {invoice.invoiceNumber} - £{invoice.total.toFixed(2)}
                  </label>
                </div>
              )
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setInvoiceSelectionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmInvoiceSelection} data-testid="confirm-invoice-selection">
              Attach Selected
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Confirmation Dialog */}
      <AlertDialog open={!!deletingInvoice} onOpenChange={(open) => !open && setDeletingInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice #{deletingInvoice?.invoiceNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingInvoice && deleteInvoice.mutate(deletingInvoice.id)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="confirm-delete-invoice"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
