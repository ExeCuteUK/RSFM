import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
import { Plus, Pencil, Trash2, Package, RefreshCw, Paperclip, StickyNote, X, FileText, Truck, Container, Plane, User, Ship, Calendar, Box, MapPin, PoundSterling, Shield, ClipboardList, ClipboardCheck, CalendarCheck, Unlock, Receipt, Send, Search, ChevronDown, MapPinned, Check, ChevronLeft, ChevronRight, Mail, Download } from "lucide-react"
import { ImportShipmentForm } from "@/components/import-shipment-form"
import { PDFViewer } from "@/components/pdf-viewer"
import { OCRDialog } from "@/components/ocr-dialog"
import type { ImportShipment, InsertImportShipment, ImportCustomer, CustomClearance, JobFileGroup, ClearanceAgent, Invoice } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"
import { useEmail } from "@/contexts/EmailContext"
import { useWindowManager } from "@/contexts/WindowManagerContext"
import { format } from "date-fns"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export default function ImportShipments() {
  const { openEmailComposer } = useEmail()
  const { openWindow } = useWindowManager()
  const [deletingShipmentId, setDeletingShipmentId] = useState<string | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["Awaiting Collection", "Dispatched", "Delivered"])
  const [selectedShipmentTypes, setSelectedShipmentTypes] = useState<string[]>(["Container Shipment", "Road Shipment", "Air Freight"])
  const [searchText, setSearchText] = useState("")
  const [notesShipmentId, setNotesShipmentId] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState("")
  const [viewingShipment, setViewingShipment] = useState<ImportShipment | null>(null)
  const [statusPrompt, setStatusPrompt] = useState<{ show: boolean; newStatus: string; message: string }>({ show: false, newStatus: '', message: '' })
  const [trackingShipment, setTrackingShipment] = useState<ImportShipment | null>(null)
  const [trackingData, setTrackingData] = useState<any>(null)
  const [etaUpdateDialog, setEtaUpdateDialog] = useState<{ show: boolean; newEta: string; daysDiff: number; shipmentId: string } | null>(null)
  const [etdUpdateDialog, setEtdUpdateDialog] = useState<{ show: boolean; newEtd: string; daysDiff: number; shipmentId: string } | null>(null)
  const [vesselUpdateDialog, setVesselUpdateDialog] = useState<{ show: boolean; newVessel: string; shipmentId: string } | null>(null)
  const [portUpdateDialog, setPortUpdateDialog] = useState<{ show: boolean; newPort: string; shipmentId: string } | null>(null)
  const [dragOver, setDragOver] = useState<{ shipmentId: string; type: "attachment" | "pod" } | null>(null)
  const [viewingPdf, setViewingPdf] = useState<{ url: string; name: string } | null>(null)
  const [clearanceAgentDialog, setClearanceAgentDialog] = useState<{ show: boolean; shipmentId: string } | null>(null)
  const [deletingFile, setDeletingFile] = useState<{ id: string; filePath: string; fileType: "attachment" | "pod"; fileName: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null)
  const [invoiceSelectionDialog, setInvoiceSelectionDialog] = useState<{ shipment: ImportShipment; invoices: Invoice[] } | null>(null)
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const { toast } = useToast()
  const [location, setLocation] = useLocation()
  
  const ITEMS_PER_PAGE = 30

  // Read search parameter from URL or localStorage on mount or when URL changes
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
  }, [location])

  const { data: allShipments = [], isLoading } = useQuery<ImportShipment[]>({
    queryKey: ["/api/import-shipments"],
  })

  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
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

  // Fetch shared documents for all import shipments
  const jobRefs = allShipments.map(s => s.jobRef).filter((ref): ref is number => ref !== undefined)
  const { data: sharedDocsMap = {} } = useQuery<Record<number, string[]>>({
    queryKey: ["/api/job-file-groups/batch", jobRefs],
    queryFn: async () => {
      const map: Record<number, string[]> = {}
      
      // Fetch job file groups for each unique jobRef
      const uniqueRefs = Array.from(new Set(jobRefs))
      await Promise.all(
        uniqueRefs.map(async (jobRef) => {
          try {
            const response = await fetch(`/api/job-file-groups/${jobRef}`)
            if (response.ok) {
              const data: JobFileGroup = await response.json()
              map[jobRef] = data.documents || []
            }
          } catch (error) {
            // Ignore errors - jobRef might not have shared docs yet
          }
        })
      )
      
      return map
    },
    enabled: jobRefs.length > 0,
  })

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "N/A"
    const customer = importCustomers.find(c => c.id === customerId)
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
        const customerName = getCustomerName(s.importCustomerId).toLowerCase()
        const jobRef = s.jobRef.toString()
        const trailer = (s.trailerOrContainerNumber || "").toLowerCase()
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
    mutationFn: async (data: InsertImportShipment) => {
      return apiRequest("POST", "/api/import-shipments", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      toast({ title: "Import shipment created successfully" })
    },
  })

  const updateShipment = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertImportShipment }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      toast({ title: "Import shipment updated successfully" })
    },
  })

  const deleteShipment = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/import-shipments/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      toast({ title: "Import shipment deleted successfully" })
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      toast({ title: "Status updated successfully" })
    },
  })

  const updateClearanceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}/clearance-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
    },
  })

  const updateDeliveryBookedStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}/delivery-booked-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
    },
  })

  const updateHaulierBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}/haulier-booking-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
    },
  })

  const updateContainerReleaseStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}/container-release-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
    },
  })

  const updateInvoiceCustomerStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number | null }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}/invoice-customer-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
    },
  })

  const updateSendPodToCustomerStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number | null }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}/send-pod-to-customer-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
    },
  })

  const updateSendHaulierEadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number | null }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}/send-haulier-ead-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
    },
  })

  const updateSendCustomerGvmsStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number | null }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}/send-customer-gvms-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
    },
  })

  const deleteFile = useMutation({
    mutationFn: async ({ id, filePath, fileType }: { id: string; filePath: string; fileType: "attachment" | "pod" }) => {
      return apiRequest("DELETE", `/api/import-shipments/${id}/files`, { filePath, fileType })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/job-file-groups"], refetchType: "all" })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      toast({ title: "File deleted successfully" })
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
      
      const res = await apiRequest("PATCH", `/api/import-shipments/${id}`, {
        ...shipment,
        [fileType === "attachment" ? "attachments" : "proofOfDelivery"]: updatedFiles
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/job-file-groups"] })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      toast({ title: "File uploaded successfully" })
    },
    onError: () => {
      toast({ title: "File upload failed", variant: "destructive" })
    }
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

  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}`, { additionalNotes: notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      setNotesShipmentId(null)
      setNotesValue("")
      toast({ title: "Notes updated successfully" })
    },
  })

  const trackContainer = useMutation({
    mutationFn: async ({ containerNumber, shippingLine }: { containerNumber: string; shippingLine?: string }) => {
      const res = await apiRequest("POST", "/api/terminal49/track", { containerNumber, shippingLine })
      return res.json()
    },
    onSuccess: (response: any) => {
      const status = response?.data?.attributes?.status
      const shipmentId = response?.data?.relationships?.tracked_object?.data?.id
      
      if (status === "view_on_terminal49") {
        // API limitations - direct to Terminal49 website
        const terminal49Url = response?.data?.meta?.terminal49_url || "https://app.terminal49.com"
        setTrackingShipment(null)
        window.open(terminal49Url, '_blank')
        toast({ 
          title: "Opening Terminal49", 
          description: "Tracking data is available on Terminal49's website. A new tab has been opened."
        })
      } else if (shipmentId) {
        // Shipment found, fetch tracking data
        toast({ 
          title: "Loading Tracking Data", 
          description: "Retrieving container tracking information..." 
        })
        fetchTrackingData.mutate(shipmentId)
      } else {
        // Tracking request created
        toast({ 
          title: "Container Tracking Request Created", 
          description: status === "pending" 
            ? "Terminal49 is searching for your container. This may take a few moments."
            : "Container tracking in progress." 
        })
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.details?.errors?.[0]?.detail || "Failed to track container"
      toast({ 
        title: error?.error || "Container Tracking Error", 
        description: errorMessage,
        variant: "destructive" 
      })
    },
  })

  const fetchTrackingData = useMutation({
    mutationFn: async (shipmentId: string) => {
      const res = await apiRequest("GET", `/api/terminal49/shipments/${shipmentId}`)
      return res.json()
    },
    onSuccess: (data) => {
      setTrackingData(data)
      
      // Compare tracking ETA with job ETA
      if (trackingShipment && data?.data?.attributes?.pod_eta_at) {
        const trackingEta = data.data.attributes.pod_eta_at.split('T')[0] // Get YYYY-MM-DD
        const jobEta = trackingShipment.importDateEtaPort
        
        if (jobEta && trackingEta !== jobEta) {
          // Calculate difference in days
          const trackingDate = new Date(trackingEta)
          const jobDate = new Date(jobEta)
          const diffTime = trackingDate.getTime() - jobDate.getTime()
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
          
          setEtaUpdateDialog({
            show: true,
            newEta: trackingEta,
            daysDiff: diffDays,
            shipmentId: trackingShipment.id
          })
        }
      }
      
      // Compare tracking ETD with job dispatch date
      if (trackingShipment && data?.data?.attributes?.pol_atd_at) {
        const trackingEtd = data.data.attributes.pol_atd_at.split('T')[0] // Get YYYY-MM-DD
        const jobDispatch = trackingShipment.dispatchDate
        
        if (jobDispatch && trackingEtd !== jobDispatch) {
          // Calculate difference in days
          const trackingDate = new Date(trackingEtd)
          const jobDate = new Date(jobDispatch)
          const diffTime = trackingDate.getTime() - jobDate.getTime()
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
          
          setEtdUpdateDialog({
            show: true,
            newEtd: trackingEtd,
            daysDiff: diffDays,
            shipmentId: trackingShipment.id
          })
        }
      }
      
      // Compare tracking vessel name with job vessel name
      if (trackingShipment && data?.data?.attributes?.pod_vessel_name) {
        const trackingVessel = data.data.attributes.pod_vessel_name
        const jobVessel = trackingShipment.vesselName
        
        if (jobVessel && trackingVessel !== jobVessel) {
          setVesselUpdateDialog({
            show: true,
            newVessel: trackingVessel,
            shipmentId: trackingShipment.id
          })
        }
      }
      
      // Compare tracking port of discharge with job port of arrival
      if (trackingShipment && data?.data?.attributes?.port_of_discharge_name) {
        const trackingPort = data.data.attributes.port_of_discharge_name
        const jobPort = trackingShipment.portOfArrival
        
        if (jobPort && trackingPort !== jobPort) {
          setPortUpdateDialog({
            show: true,
            newPort: trackingPort,
            shipmentId: trackingShipment.id
          })
        }
      }
    },
    onError: (error: any) => {
      // Don't show toast for 404 - the dialog will show a helpful message
      if (error?.details?.errors?.[0]?.status !== "404") {
        toast({ 
          title: "Tracking Error", 
          description: error?.message || "Failed to fetch tracking data",
          variant: "destructive" 
        })
      }
    },
  })

  const updateEta = useMutation({
    mutationFn: async ({ id, eta }: { id: string; eta: string }) => {
      const shipment = allShipments.find(s => s.id === id)
      if (!shipment) throw new Error("Shipment not found")
      
      const res = await apiRequest("PATCH", `/api/import-shipments/${id}`, {
        ...shipment,
        importDateEtaPort: eta
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      toast({ title: "ETA updated successfully" })
      setEtaUpdateDialog(null)
    },
  })

  const updateEtd = useMutation({
    mutationFn: async ({ id, etd }: { id: string; etd: string }) => {
      const shipment = allShipments.find(s => s.id === id)
      if (!shipment) throw new Error("Shipment not found")
      
      const res = await apiRequest("PATCH", `/api/import-shipments/${id}`, {
        ...shipment,
        dispatchDate: etd
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      toast({ title: "Dispatch date updated successfully" })
      setEtdUpdateDialog(null)
    },
  })

  const updateVessel = useMutation({
    mutationFn: async ({ id, vessel }: { id: string; vessel: string }) => {
      const shipment = allShipments.find(s => s.id === id)
      if (!shipment) throw new Error("Shipment not found")
      
      const res = await apiRequest("PATCH", `/api/import-shipments/${id}`, {
        ...shipment,
        vesselName: vessel
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      toast({ title: "Vessel name updated successfully" })
      setVesselUpdateDialog(null)
    },
  })

  const updatePort = useMutation({
    mutationFn: async ({ id, port }: { id: string; port: string }) => {
      const shipment = allShipments.find(s => s.id === id)
      if (!shipment) throw new Error("Shipment not found")
      
      const res = await apiRequest("PATCH", `/api/import-shipments/${id}`, {
        ...shipment,
        portOfArrival: port
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      toast({ title: "Port of arrival updated successfully" })
      setPortUpdateDialog(null)
    },
  })


  const formatCurrency = (currency: string | null | undefined) => {
    if (!currency) return ""
    if (currency === "GBP") return "£"
    return currency
  }

  const handleOpenNotes = (shipment: ImportShipment) => {
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

  const handleTrackContainer = (shipment: ImportShipment) => {
    if (!shipment.trailerOrContainerNumber) {
      toast({ title: "No container number available", variant: "destructive" })
      return
    }
    setTrackingShipment(shipment)
    setTrackingData(null)
    trackContainer.mutate({
      containerNumber: shipment.trailerOrContainerNumber,
      shippingLine: shipment.shippingLine || undefined,
    })
  }

  const handleCreateNew = () => {
    openWindow({
      id: `import-shipment-new-${Date.now()}`,
      type: 'import-shipment',
      title: 'New Import Shipment',
      payload: { 
        mode: 'create' as const,
        defaultValues: {} 
      }
    })
  }

  const handleEdit = (shipment: ImportShipment) => {
    openWindow({
      id: `import-shipment-${shipment.id}`,
      type: 'import-shipment',
      title: `Edit Import Shipment #${shipment.jobRef}`,
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

  const getCustomer = (customerId: string | null) => {
    if (!customerId) return null
    return importCustomers.find(c => c.id === customerId) || null
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

  const handleClearanceStatusUpdate = (id: string, status: number) => {
    updateClearanceStatus.mutate({ id, status })
  }

  const handleDeliveryBookedStatusUpdate = (id: string, status: number) => {
    updateDeliveryBookedStatus.mutate({ id, status })
  }

  const handleHaulierBookingStatusUpdate = (id: string, status: number) => {
    updateHaulierBookingStatus.mutate({ id, status })
  }

  const handleContainerReleaseStatusUpdate = (id: string, status: number) => {
    updateContainerReleaseStatus.mutate({ id, status })
  }

  const handleInvoiceCustomerStatusUpdate = (id: string, status: number) => {
    updateInvoiceCustomerStatus.mutate({ id, status })
  }

  const handleSendPodToCustomerStatusUpdate = (id: string, status: number) => {
    updateSendPodToCustomerStatus.mutate({ id, status })
  }

  const handleSendHaulierEadStatusUpdate = (id: string, status: number) => {
    updateSendHaulierEadStatus.mutate({ id, status })
  }

  const handleSendCustomerGvmsStatusUpdate = (id: string, status: number) => {
    updateSendCustomerGvmsStatus.mutate({ id, status })
  }

  const handleSendHaulierGvmsEmail = (shipment: ImportShipment) => {
    try {
      // Get haulier email(s) - support both array and legacy string format
      const haulierEmailField = shipment.haulierEmail
      const haulierEmails = Array.isArray(haulierEmailField)
        ? haulierEmailField.filter(Boolean)
        : typeof haulierEmailField === 'string' && haulierEmailField
          ? haulierEmailField.split(',').map(e => e.trim()).filter(Boolean)
          : []

      // Get haulier contact name(s) - support both array and legacy string format
      const haulierContactField = shipment.haulierContactName
      const haulierContacts = Array.isArray(haulierContactField)
        ? haulierContactField.filter(Boolean)
        : typeof haulierContactField === 'string' && haulierContactField
          ? haulierContactField.split('/').map(c => c.trim()).filter(Boolean)
          : []

      // Build "Hi" greeting line with proper grammar
      let greeting = "Hi there"
      if (haulierContacts.length === 1) {
        greeting = `Hi ${haulierContacts[0]}`
      } else if (haulierContacts.length === 2) {
        greeting = `Hi ${haulierContacts[0]} and ${haulierContacts[1]}`
      } else if (haulierContacts.length > 2) {
        const lastContact = haulierContacts[haulierContacts.length - 1]
        const otherContacts = haulierContacts.slice(0, -1).join(', ')
        greeting = `Hi ${otherContacts}, and ${lastContact}`
      }

      // Build subject
      let subject = `Import Job Update - Import GVMS Document / Our Ref: ${shipment.jobRef}`
      
      // Add trailer/container/flight number if available with correct label based on shipment type
      if (shipment.trailerOrContainerNumber) {
        let numberLabel = "Trailer Number"
        if (shipment.containerShipment === "Air Freight") {
          numberLabel = "Flight Number"
        } else if (shipment.containerShipment === "Container Shipment") {
          numberLabel = "Container Number"
        }
        subject += ` / ${numberLabel}: ${shipment.trailerOrContainerNumber}`
      }
      
      // Add haulier reference if available
      if (shipment.haulierReference) {
        subject += ` / Your Ref: ${shipment.haulierReference}`
      }

      // Build email body
      const body = `${greeting},\n\nPlease find attached Import Entry for this shipment.\n\nHope all is OK.`

      // Get attachments from linked clearance if available
      const linkedClearance = customClearances.find((c: any) => c.jobRef === shipment.jobRef)
      const attachments = linkedClearance?.clearanceDocuments || []

      // Open email composer with clearance documents
      openEmailComposer({
        id: `email-${Date.now()}`,
        to: haulierEmails.join(', '),
        cc: '',
        bcc: '',
        subject,
        body,
        attachments,
        metadata: {
          source: 'send-haulier-ead',
          shipmentId: shipment.id,
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

  const handleSendCustomerGvmsEmail = (shipment: ImportShipment) => {
    try {
      // Get customer details
      const customer = importCustomers.find(c => c.id === shipment.importCustomerId)
      
      // Get customer email(s) - support both array and legacy string format
      const customerEmailField = customer?.email
      const customerEmails = Array.isArray(customerEmailField)
        ? customerEmailField.filter(Boolean)
        : typeof customerEmailField === 'string' && customerEmailField
          ? customerEmailField.split(',').map((e: any) => e.trim()).filter(Boolean)
          : []

      // Get customer contact name(s) - support both array and legacy string format
      const customerContactField = customer?.contactName
      const customerContacts = Array.isArray(customerContactField)
        ? customerContactField.filter(Boolean)
        : typeof customerContactField === 'string' && customerContactField
          ? customerContactField.split('/').map((c: any) => c.trim()).filter(Boolean)
          : []

      // Build "Hi" greeting line with proper grammar
      let greeting = "Hi there"
      if (customerContacts.length === 1) {
        greeting = `Hi ${customerContacts[0]}`
      } else if (customerContacts.length === 2) {
        greeting = `Hi ${customerContacts[0]} and ${customerContacts[1]}`
      } else if (customerContacts.length > 2) {
        const lastContact = customerContacts[customerContacts.length - 1]
        const otherContacts = customerContacts.slice(0, -1).join(', ')
        greeting = `Hi ${otherContacts}, and ${lastContact}`
      }

      // Build subject
      let subject = `Import Job Update - Import GVMS Document / Our Ref: ${shipment.jobRef}`
      
      // Add trailer/container/flight number if available with correct label based on shipment type
      if (shipment.trailerOrContainerNumber) {
        let numberLabel = "Trailer Number"
        if (shipment.containerShipment === "Air Freight") {
          numberLabel = "Flight Number"
        } else if (shipment.containerShipment === "Container Shipment") {
          numberLabel = "Container Number"
        }
        subject += ` / ${numberLabel}: ${shipment.trailerOrContainerNumber}`
      }
      
      // Add customer reference if available
      if (shipment.customerReferenceNumber) {
        subject += ` / Your Ref: ${shipment.customerReferenceNumber}`
      }

      // Build email body
      const body = `${greeting},\n\nPlease find attached Import Entry for this shipment.\n\nHope all is OK.`

      // Get attachments from linked clearance if available
      const linkedClearance = customClearances.find((c: any) => c.jobRef === shipment.jobRef)
      const attachments = linkedClearance?.clearanceDocuments || []

      // Open email composer with clearance documents
      openEmailComposer({
        id: `email-${Date.now()}`,
        to: customerEmails.join(', '),
        cc: '',
        bcc: '',
        subject,
        body,
        attachments,
        metadata: {
          source: 'send-customer-gvms',
          shipmentId: shipment.id,
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

  const handleBookDeliveryCustomerEmail = (shipment: ImportShipment) => {
    try {
      // Get customer and agent email
      const customer = importCustomers.find(c => c.id === shipment.importCustomerId)
      const agentEmail = customer?.agentEmail && customer.agentEmail.length > 0 ? customer.agentEmail[0] : ""
      
      // Build subject
      const customerRef = shipment.customerReferenceNumber
      const jobRef = shipment.jobRef || "N/A"
      const containerNumber = shipment.trailerOrContainerNumber || "TBA"
      const eta = formatDate(shipment.importDateEtaPort) || "TBA"
      
      let truckContainerFlight = ""
      if (shipment.containerShipment === "Container Shipment") {
        truckContainerFlight = `Container ${containerNumber}`
      } else if (shipment.containerShipment === "Road Shipment") {
        truckContainerFlight = `Truck ${containerNumber}`
      } else if (shipment.containerShipment === "Air Freight") {
        truckContainerFlight = `Flight ${containerNumber}`
      }
      
      const subject = customerRef 
        ? `Import Delivery Booking / Your Ref : ${customerRef} / Our Ref : ${jobRef} / ${truckContainerFlight} / ETA : ${eta}`
        : `Import Delivery Booking / Our Ref : ${jobRef} / ${truckContainerFlight} / ETA : ${eta}`
      
      // Build message body
      let body = `Hi,\n\nPlease find below details of an import job due to be delivered to yourselves. If you can advise on the below that would be great.\n\n`
      
      // Container/Truck/Flight info
      if (shipment.containerShipment === "Container Shipment") {
        body += `Container Number: ${containerNumber}\n`
      } else if (shipment.containerShipment === "Road Shipment") {
        body += `Truck Number: ${containerNumber}\n`
      } else if (shipment.containerShipment === "Air Freight") {
        body += `Flight Number: ${containerNumber}\n`
      }
      
      body += `ETA Port : ${eta}\n`
      body += `${shipment.goodsDescription || ""}, ${shipment.numberOfPieces || ""} ${shipment.packaging || ""}, ${shipment.weight || ""}kgs\n`
      
      // Customer reference if present
      if (customerRef) {
        body += `Your Reference : ${customerRef}\n`
      }
      
      // Delivery address - show "Please advise" if blank
      const deliveryAddress = shipment.deliveryAddress || "Please advise"
      body += `\nDelivery Address :-\n${deliveryAddress}\n\n`
      
      // Get delivery date
      const deliveryDate = formatDate(shipment.deliveryDate) || "DD/MM/YY"
      body += `We have been advised that delivery can be made on ${deliveryDate}\n\n`
      
      // Confirmation message based on whether delivery address is present
      if (shipment.deliveryAddress) {
        body += `If you can advise if this date/delivery address is OK and any other information required such as delivery time, references that would be great.\n`
      } else {
        body += `If you can advise if this date is OK and any other information required such as delivery time, references that would be great.\n\n`
        body += `Please also note we do not seem to have the delivery address noted on this job file. If you can confirm the delivery address for this shipment Ill get the job file updated.\n`
      }
      
      // Open email composer
      openEmailComposer({
        id: `email-${Date.now()}`,
        to: agentEmail || "",
        cc: "",
        bcc: "",
        subject: subject,
        body: body,
        attachments: [],
        metadata: {
          source: 'book-delivery-customer',
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

  const handleSendInvoiceToCustomerEmail = (shipment: ImportShipment) => {
    try {
      // Get all invoices for this shipment
      const shipmentInvoices = allInvoices.filter(inv => 
        inv.jobRef === shipment.jobRef && inv.jobType === 'import' && inv.jobId === shipment.id
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
        setSelectedInvoices(shipmentInvoices.map(inv => inv.id))
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
      
      // Build personalized greeting
      const jobContactNameArray = Array.isArray(shipment.jobContactName)
        ? shipment.jobContactName.filter(Boolean)
        : (shipment.jobContactName ? shipment.jobContactName.split('/').map(n => n.trim()).filter(Boolean) : [])
      
      let greeting = "Hi there"
      if (jobContactNameArray.length === 1) {
        greeting = `Hi ${jobContactNameArray[0]}`
      } else if (jobContactNameArray.length === 2) {
        greeting = `Hi ${jobContactNameArray[0]} and ${jobContactNameArray[1]}`
      } else if (jobContactNameArray.length >= 3) {
        const lastContact = jobContactNameArray[jobContactNameArray.length - 1]
        const otherContacts = jobContactNameArray.slice(0, -1).join(', ')
        greeting = `Hi ${otherContacts}, and ${lastContact}`
      }
      
      // Determine document type text
      const hasInvoices = shipmentInvoices.some(inv => inv.type === 'invoice')
      const hasCredits = shipmentInvoices.some(inv => inv.type === 'credit_note')
      let documentText = "Invoice"
      
      if (hasInvoices && hasCredits) {
        if (shipmentInvoices.filter(inv => inv.type === 'invoice').length > 1 && shipmentInvoices.filter(inv => inv.type === 'credit_note').length > 1) {
          documentText = "Invoices and Credit Notes"
        } else if (shipmentInvoices.filter(inv => inv.type === 'invoice').length > 1) {
          documentText = "Invoices and Credit Note"
        } else if (shipmentInvoices.filter(inv => inv.type === 'credit_note').length > 1) {
          documentText = "Invoice and Credit Notes"
        } else {
          documentText = "Invoice and Credit Note"
        }
      } else if (hasCredits) {
        documentText = shipmentInvoices.length > 1 ? "Credit Notes" : "Credit Note"
      } else {
        documentText = shipmentInvoices.length > 1 ? "Invoices" : "Invoice"
      }
      
      // Build body with agent information if present
      let body = `${greeting},\n\nPlease find attached our ${documentText}.`
      
      // Add agent information if present
      const agentContactNameArray = Array.isArray(shipment.agentContactName)
        ? shipment.agentContactName.filter(Boolean)
        : (shipment.agentContactName ? shipment.agentContactName.split('/').map(n => n.trim()).filter(Boolean) : [])
      const agentEmailArray = Array.isArray(shipment.agentEmail)
        ? shipment.agentEmail.filter(Boolean)
        : (shipment.agentEmail ? shipment.agentEmail.split(',').map(e => e.trim()).filter(Boolean) : [])
      
      if (agentContactNameArray.length > 0 && agentEmailArray.length > 0) {
        body += `\n\nFor any queries, please contact:\n${agentContactNameArray[0]} - ${agentEmailArray[0]}`
      }
      
      // Get invoice PDF paths with proper filenames
      const invoiceFiles = shipmentInvoices.map(invoice => ({
        url: `/api/invoices/${invoice.id}/pdf`,
        name: `${invoice.type === 'credit_note' ? 'RS Credit' : 'RS Invoice'} - ${invoice.jobRef}.pdf`
      }))
      
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
    
    // Build personalized greeting
    const jobContactNameArray = Array.isArray(shipment.jobContactName)
      ? shipment.jobContactName.filter(Boolean)
      : (shipment.jobContactName ? shipment.jobContactName.split('/').map(n => n.trim()).filter(Boolean) : [])
    
    let greeting = "Hi there"
    if (jobContactNameArray.length === 1) {
      greeting = `Hi ${jobContactNameArray[0]}`
    } else if (jobContactNameArray.length === 2) {
      greeting = `Hi ${jobContactNameArray[0]} and ${jobContactNameArray[1]}`
    } else if (jobContactNameArray.length >= 3) {
      const lastContact = jobContactNameArray[jobContactNameArray.length - 1]
      const otherContacts = jobContactNameArray.slice(0, -1).join(', ')
      greeting = `Hi ${otherContacts}, and ${lastContact}`
    }
    
    // Determine document type text
    const hasInvoices = selectedInvoiceObjects.some(inv => inv.type === 'invoice')
    const hasCredits = selectedInvoiceObjects.some(inv => inv.type === 'credit_note')
    let documentText = "Invoice"
    
    if (hasInvoices && hasCredits) {
      if (selectedInvoiceObjects.filter(inv => inv.type === 'invoice').length > 1 && selectedInvoiceObjects.filter(inv => inv.type === 'credit_note').length > 1) {
        documentText = "Invoices and Credit Notes"
      } else if (selectedInvoiceObjects.filter(inv => inv.type === 'invoice').length > 1) {
        documentText = "Invoices and Credit Note"
      } else if (selectedInvoiceObjects.filter(inv => inv.type === 'credit_note').length > 1) {
        documentText = "Invoice and Credit Notes"
      } else {
        documentText = "Invoice and Credit Note"
      }
    } else if (hasCredits) {
      documentText = selectedInvoiceObjects.length > 1 ? "Credit Notes" : "Credit Note"
    } else {
      documentText = selectedInvoiceObjects.length > 1 ? "Invoices" : "Invoice"
    }
    
    // Build body with agent information if present
    let body = `${greeting},\n\nPlease find attached our ${documentText}.`
    
    // Add agent information if present
    const agentContactNameArray = Array.isArray(shipment.agentContactName)
      ? shipment.agentContactName.filter(Boolean)
      : (shipment.agentContactName ? shipment.agentContactName.split('/').map(n => n.trim()).filter(Boolean) : [])
    const agentEmailArray = Array.isArray(shipment.agentEmail)
      ? shipment.agentEmail.filter(Boolean)
      : (shipment.agentEmail ? shipment.agentEmail.split(',').map(e => e.trim()).filter(Boolean) : [])
    
    if (agentContactNameArray.length > 0 && agentEmailArray.length > 0) {
      body += `\n\nFor any queries, please contact:\n${agentContactNameArray[0]} - ${agentEmailArray[0]}`
    }
    
    // Get invoice PDF paths with proper filenames
    const invoiceFiles = selectedInvoiceObjects.map(invoice => ({
      url: `/api/invoices/${invoice.id}/pdf`,
      name: `${invoice.type === 'credit_note' ? 'RS Credit' : 'RS Invoice'} - ${invoice.jobRef}.pdf`
    }))
    
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

  const handleSendPodToCustomerEmail = (shipment: ImportShipment) => {
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
      const containerNumber = shipment.trailerOrContainerNumber || "N/A"
      const eta = formatDate(shipment.importDateEtaPort) || "N/A"
      
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
      const yourRefPart = customerRef ? `Your Ref : ${customerRef} / ` : ""
      const subject = `Import Delivery Update / ${yourRefPart}Our Ref : ${jobRef} / ${truckContainerFlight} / ETA : ${eta}`
      
      // Build message body - handle multiple contact names (handle both array and legacy string formats)
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
      
      // Conditionally include "your ref" only if customerRef exists
      const yourRefText = customerRef ? `, your ref ${customerRef}` : ""
      const body = `${greeting},

Please find enclosed Proof Of Delivery attached for this shipment${yourRefText}.

Hope all is OK.`
      
      // Get POD file paths and normalize them
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
          source: 'send-pod-customer',
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

  useEffect(() => {
    if (!viewingShipment) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (viewingShipment.deliveryDate && (viewingShipment.status === "Dispatched" || viewingShipment.status === "Awaiting Collection")) {
      const deliveryDate = new Date(viewingShipment.deliveryDate)
      deliveryDate.setHours(0, 0, 0, 0)
      
      if (deliveryDate < today) {
        setStatusPrompt({
          show: true,
          newStatus: "Completed",
          message: "The Delivery Date has passed. Would you like to update the job status to 'Completed'?"
        })
        return
      }
    }

    if (viewingShipment.dispatchDate && viewingShipment.status === "Awaiting Collection") {
      const dispatchDate = new Date(viewingShipment.dispatchDate)
      dispatchDate.setHours(0, 0, 0, 0)
      
      if (dispatchDate < today) {
        setStatusPrompt({
          show: true,
          newStatus: "Dispatched",
          message: "The Dispatch Date has passed. Would you like to update the job status to 'Dispatched'?"
        })
      }
    }
  }, [viewingShipment])

  const handleStatusPromptConfirm = () => {
    if (viewingShipment && statusPrompt.newStatus) {
      updateStatus.mutate({ id: viewingShipment.id, status: statusPrompt.newStatus })
      setStatusPrompt({ show: false, newStatus: '', message: '' })
      setViewingShipment(null)
    }
  }

  const handleStatusPromptCancel = () => {
    setStatusPrompt({ show: false, newStatus: '', message: '' })
  }

  const getClearanceStatusColor = (status: number | null) => {
    switch (status) {
      case 2: return "text-orange-600 dark:text-orange-400"
      case 3: return "text-green-600 dark:text-green-400"
      case 4: return "text-red-600 dark:text-red-400"
      case 1:
      case null:
      default: return "text-yellow-600 dark:text-yellow-400"
    }
  }

  const getDeliveryBookedStatusColor = (status: number | null) => {
    switch (status) {
      case 1:
      case null:
      default: return "text-yellow-600 dark:text-yellow-400"
      case 2: return "text-orange-600 dark:text-orange-400"
      case 3: return "text-green-600 dark:text-green-400"
      case 4: return "text-red-600 dark:text-red-400"
    }
  }

  const getHaulierBookingStatusColor = (status: number | null) => {
    switch (status) {
      case 1:
      case null:
      default: return "text-yellow-600 dark:text-yellow-400"
      case 2: return "text-orange-600 dark:text-orange-400"
      case 3: return "text-green-600 dark:text-green-400"
      case 4: return "text-red-600 dark:text-red-400"
    }
  }

  const getContainerReleaseStatusColor = (status: number | null) => {
    switch (status) {
      case 1:
      case null:
      default: return "text-yellow-600 dark:text-yellow-400"
      case 2: return "text-orange-600 dark:text-orange-400"
      case 3: return "text-green-600 dark:text-green-400"
      case 4: return "text-red-600 dark:text-red-400"
    }
  }

  const getInvoiceCustomerStatusColor = (status: number | null) => {
    switch (status) {
      case 1:
      case null:
      default: return "text-yellow-600 dark:text-yellow-400"
      case 2: return "text-orange-600 dark:text-orange-400"
      case 3: return "text-green-600 dark:text-green-400"
      case 4: return "text-red-600 dark:text-red-400"
    }
  }

  const getSendPodToCustomerStatusColor = (status: number | null) => {
    switch (status) {
      case 1: return "text-yellow-600 dark:text-yellow-400"
      case 2:
      case null:
      default: return "text-yellow-600 dark:text-yellow-400"
      case 3: return "text-green-600 dark:text-green-400"
      case 4: return "text-red-600 dark:text-red-400"
    }
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
    if (!attachments || !Array.isArray(attachments)) return []
    return attachments
  }

  const normalizeFilePath = (filePath: string): string => {
    if (filePath.startsWith('https://storage.googleapis.com/')) {
      const url = new URL(filePath)
      const pathname = decodeURIComponent(url.pathname)
      const match = pathname.match(/\/.private\/(.+)$/)
      if (match) {
        return `/objects/${match[1]}`
      }
    }
    return filePath.startsWith('http://') || filePath.startsWith('https://') 
      ? filePath 
      : filePath.startsWith('/') ? filePath : `/objects/${filePath}`
  }

  const handleFileClick = (e: React.MouseEvent, filePath: string) => {
    const fileName = filePath.split('/').pop() || filePath
    const fileExtension = fileName.split('.').pop()?.toLowerCase()
    
    if (fileExtension === 'pdf') {
      e.preventDefault()
      const downloadPath = normalizeFilePath(filePath)
      setViewingPdf({ url: downloadPath, name: fileName })
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    try {
      const date = new Date(dateStr)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = String(date.getFullYear()).slice(-2)
      return `${day}/${month}/${year}`
    } catch {
      return dateStr
    }
  }

  const handleClearanceAgentSelected = (agent: ClearanceAgent) => {
    try {
      if (!clearanceAgentDialog) return
      
      const shipment = allShipments.find(s => s.id === clearanceAgentDialog.shipmentId)
      if (!shipment) return
      
      const customer = importCustomers.find(c => c.id === shipment.importCustomerId)
      const customerName = customer?.companyName || "N/A"
      const vatPaymentMethod = customer?.vatPaymentMethod || "N/A"
      
      // Build email subject
      const truckContainerFlight = shipment.trailerOrContainerNumber || "TBA"
      const eta = formatDate(shipment.importDateEtaPort) || "TBA"
      const subject = `Import Clearance / ${customerName} / Our Ref : ${shipment.jobRef} / ${truckContainerFlight} / ETA : ${eta}`
      
      // Build email body
      let body = `Hi Team,\n\nPlease could you arrange clearance on the below shipment. Our Ref : ${shipment.jobRef}\n\n`
      body += `Consignment will arrive on Trailer : ${shipment.trailerOrContainerNumber || "TBA"} Into ${shipment.portOfArrival || "TBA"} on ${formatDate(shipment.importDateEtaPort) || "TBA"}.\n\n`
      body += `${customerName}\n`
      body += `${shipment.numberOfPieces || ""} ${shipment.packaging || ""}.\n`
      body += `${shipment.goodsDescription || ""}\n`
      body += `${shipment.weight || ""}, Invoice value ${shipment.currency || ""} ${shipment.invoiceValue || ""}\n`
      
      if (shipment.freightCharge) {
        body += `Transport Costs : ${shipment.freightCharge}\n`
      }
      
      // Replace "R.S Deferment" with "Via Your Deferment"
      const displayVatMethod = vatPaymentMethod === "R.S Deferment" ? "Via Your Deferment" : vatPaymentMethod
      body += `\nVAT Payment Method : ${displayVatMethod}\n`
      
      if (shipment.vatZeroRated) {
        body += `VAT Zero Rated\n`
      }
      
      body += `Clearance Type : ${shipment.clearanceType || "N/A"}\n`
      
      // Get agent's import email (first one if multiple)
      const agentEmail = agent.agentImportEmail && agent.agentImportEmail.length > 0 
        ? agent.agentImportEmail[0] 
        : ""
      
      // Get transport documents - ensure it's always an array
      const transportDocs = parseAttachments(shipment.attachments || null).map(normalizeFilePath).filter(Boolean)
      
      // Open email composer with validated data
      openEmailComposer({
        id: `email-${Date.now()}`,
        to: agentEmail || "",
        cc: "",
        bcc: "",
        subject: subject || "Import Clearance",
        body: body || "",
        attachments: transportDocs || [],
        metadata: {
          source: 'advise-clearance-agent-import',
          shipmentId: shipment.id
        }
      })
      
      setClearanceAgentDialog(null)
    } catch (error) {
      console.error('Error opening email composer:', error)
      toast({
        title: "Failed to open email",
        description: "Please try again",
        variant: "destructive",
      })
      setClearanceAgentDialog(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Import Shipments</h1>
          <p className="text-muted-foreground">
            Manage incoming shipments and customs clearances
          </p>
        </div>
        <Button data-testid="button-new-shipment" onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Import Shipment
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by job ref, customer, trailer, vessel..."
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
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No import shipments yet</p>
          <Button variant="outline" className="mt-4" onClick={handleCreateNew} data-testid="button-create-first">
            Create your first import shipment
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shipments.map((shipment) => (
            <Card key={shipment.id} data-testid={`card-shipment-${shipment.id}`} className="bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {shipment.containerShipment === "Road Shipment" ? (
                        <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : shipment.containerShipment === "Container Shipment" ? (
                        <Container className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : shipment.containerShipment === "Air Freight" ? (
                        <Plane className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                      <h3 
                        className="font-semibold text-lg text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" 
                        onClick={() => setViewingShipment(shipment)}
                        data-testid={`text-job-ref-${shipment.id}`}
                      >
                        {shipment.jobRef}
                      </h3>
                      <div className="flex -space-x-1">
                        {shipment.trailerOrContainerNumber && shipment.containerShipment === "Container Shipment" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleTrackContainer(shipment)}
                            data-testid={`button-track-${shipment.id}`}
                            title="Track Container"
                            className="h-7 w-7"
                          >
                            <MapPinned className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </Button>
                        )}
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
                    <p className="text-sm text-muted-foreground" data-testid={`text-customer-${shipment.id}`}>
                      {getCustomerName(shipment.importCustomerId)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
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
                  {shipment.trailerOrContainerNumber && (
                    <>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-semibold text-lg" data-testid={`text-truck-container-${shipment.id}`}>
                          {shipment.trailerOrContainerNumber}
                        </p>
                        <p className="font-semibold text-lg" data-testid={`text-eta-port-${shipment.id}`}>
                          <span>ETA Port:</span>{' '}
                          {formatDate(shipment.importDateEtaPort) || (
                            <span className="text-yellow-700 dark:text-yellow-400">TBA</span>
                          )}
                        </p>
                      </div>
                      {shipment.containerShipment !== "Air Freight" && shipment.containerShipment === "Container Shipment" && shipment.shippingLine && (
                        <p className="font-semibold text-lg" data-testid={`text-shipping-line-${shipment.id}`}>
                          {shipment.shippingLine}
                        </p>
                      )}
                      {shipment.containerShipment !== "Air Freight" && shipment.containerShipment === "Road Shipment" && shipment.haulierName && (
                        <p className="font-semibold text-lg" data-testid={`text-haulier-name-${shipment.id}`}>
                          {shipment.haulierName}
                        </p>
                      )}
                    </>
                  )}
                  {shipment.containerShipment === "Container Shipment" && shipment.vesselName && (
                    <p data-testid={`text-vessel-name-${shipment.id}`}>
                      {shipment.vesselName}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p data-testid={`text-delivery-date-${shipment.id}`}>
                      <span>Delivery Date:</span>{' '}
                      {formatDate(shipment.deliveryDate) || (
                        <span className="text-yellow-700 dark:text-yellow-400">TBA</span>
                      )}
                    </p>
                    {shipment.portOfArrival && (
                      <p data-testid={`text-port-${shipment.id}`}>
                        <span>Port Of Arrival:</span> {shipment.portOfArrival}
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
                  <div className="pt-2 mt-2 border-t">
                    <h3 className="font-semibold text-lg mb-2" data-testid={`text-todo-title-${shipment.id}`}>
                      To-Do List
                    </h3>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setClearanceAgentDialog({ show: true, shipmentId: shipment.id })}
                          data-testid={`button-advise-clearance-${shipment.id}`}
                          title="Send clearance details to agent"
                          className="p-0 border-0 bg-transparent shrink-0"
                        >
                          <ClipboardCheck className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-blue-500 transition-colors" />
                        </button>
                        <p className={`text-xs ${getClearanceStatusColor(shipment.clearanceStatusIndicator)} font-medium flex items-center gap-1`} data-testid={`text-rs-to-clear-${shipment.id}`}>
                          {shipment.rsToClear ? 'Advise Clearance to Agent' : 'Send Customs Arrival Info to Customer'}
                          {shipment.clearanceStatusIndicator === 3 && <Check className="h-3 w-3" />}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleClearanceStatusUpdate(shipment.id, 1)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.clearanceStatusIndicator === 1 || shipment.clearanceStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                          }`}
                          data-testid={`button-status-yellow-${shipment.id}`}
                          title="To Do"
                        />
                        <div className="h-5 w-5 rounded border-2 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 relative" title="Not Available">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-0.5 bg-red-500 rotate-45 origin-center"></div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleClearanceStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.clearanceStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                          }`}
                          data-testid={`button-status-green-${shipment.id}`}
                          title="Completed"
                        />
                      </div>
                    </div>
                  </div>
                  {shipment.containerShipment === "Road Shipment" && !shipment.rsToClear && (
                    <div className="mt-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Mail 
                            className="h-4 w-4 text-muted-foreground hover:text-blue-500 shrink-0 cursor-pointer hover-elevate active-elevate-2 transition-colors" 
                            onClick={() => handleSendHaulierGvmsEmail(shipment)}
                            data-testid={`button-send-haulier-gvms-email-${shipment.id}`}
                          />
                          <p className={`text-xs ${getSendPodToCustomerStatusColor(shipment.sendHaulierEadStatusIndicator)} font-medium flex items-center gap-1`} data-testid={`text-send-haulier-gvms-${shipment.id}`}>
                            Send Haulier GVMS
                            {shipment.sendHaulierEadStatusIndicator === 3 && <Check className="h-3 w-3" />}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSendHaulierEadStatusUpdate(shipment.id, 2)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.sendHaulierEadStatusIndicator === 2 || shipment.sendHaulierEadStatusIndicator === null
                                ? 'bg-yellow-400 border-yellow-500 scale-110'
                                : 'bg-yellow-200 border-yellow-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                            }`}
                            data-testid={`button-send-haulier-gvms-yellow-${shipment.id}`}
                            title="To Do"
                          />
                          <div className="h-5 w-5 rounded border-2 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 relative" title="Not Available">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-full h-0.5 bg-red-500 rotate-45 origin-center"></div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSendHaulierEadStatusUpdate(shipment.id, 3)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.sendHaulierEadStatusIndicator === 3
                                ? 'bg-green-400 border-green-500 scale-110'
                                : 'bg-green-200 border-green-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                            }`}
                            data-testid={`button-send-haulier-gvms-green-${shipment.id}`}
                            title="Completed"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {shipment.containerShipment === "Road Shipment" && !shipment.rsToClear && (
                    <div className="mt-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Mail 
                            className="h-4 w-4 text-muted-foreground hover:text-blue-500 shrink-0 cursor-pointer hover-elevate active-elevate-2 transition-colors" 
                            onClick={() => handleSendCustomerGvmsEmail(shipment)}
                            data-testid={`button-send-customer-gvms-email-${shipment.id}`}
                          />
                          <p className={`text-xs ${getSendPodToCustomerStatusColor(shipment.sendCustomerGvmsStatusIndicator)} font-medium flex items-center gap-1`} data-testid={`text-send-customer-gvms-${shipment.id}`}>
                            Send Customer GVMS
                            {shipment.sendCustomerGvmsStatusIndicator === 3 && <Check className="h-3 w-3" />}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSendCustomerGvmsStatusUpdate(shipment.id, 2)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.sendCustomerGvmsStatusIndicator === 2 || shipment.sendCustomerGvmsStatusIndicator === null
                                ? 'bg-yellow-400 border-yellow-500 scale-110'
                                : 'bg-yellow-200 border-yellow-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                            }`}
                            data-testid={`button-send-customer-gvms-yellow-${shipment.id}`}
                            title="To Do"
                          />
                          <div className="h-5 w-5 rounded border-2 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 relative" title="Not Available">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-full h-0.5 bg-red-500 rotate-45 origin-center"></div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSendCustomerGvmsStatusUpdate(shipment.id, 3)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.sendCustomerGvmsStatusIndicator === 3
                                ? 'bg-green-400 border-green-500 scale-110'
                                : 'bg-green-200 border-green-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                            }`}
                            data-testid={`button-send-customer-gvms-green-${shipment.id}`}
                            title="Completed"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleBookDeliveryCustomerEmail(shipment)}
                          className="hover-elevate active-elevate-2 p-0 rounded shrink-0"
                          data-testid={`button-book-delivery-email-${shipment.id}`}
                          title="Send booking email to customer"
                        >
                          <CalendarCheck className="h-4 w-4 text-muted-foreground hover:text-blue-500 transition-colors" />
                        </button>
                        <p className={`text-xs font-medium ${getDeliveryBookedStatusColor(shipment.deliveryBookedStatusIndicator)} flex items-center gap-1`} data-testid={`text-delivery-booked-${shipment.id}`}>
                          Book Delivery With Customer
                          {shipment.deliveryBookedStatusIndicator === 3 && <Check className="h-3 w-3" />}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeliveryBookedStatusUpdate(shipment.id, 1)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.deliveryBookedStatusIndicator === 1 || shipment.deliveryBookedStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                          }`}
                          data-testid={`button-delivery-status-yellow-${shipment.id}`}
                          title="To Do"
                        />
                        <button
                          onClick={() => handleDeliveryBookedStatusUpdate(shipment.id, 2)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.deliveryBookedStatusIndicator === 2
                              ? 'bg-orange-400 border-orange-500 scale-110'
                              : 'bg-orange-200 border-orange-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                          }`}
                          data-testid={`button-delivery-status-orange-${shipment.id}`}
                          title="Waiting for Reply"
                        />
                        <button
                          onClick={() => handleDeliveryBookedStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.deliveryBookedStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                          }`}
                          data-testid={`button-delivery-status-green-${shipment.id}`}
                          title="Completed"
                        />
                      </div>
                    </div>
                  </div>
                  {shipment.containerShipment === "Container Shipment" && (
                    <div className="mt-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Unlock className="h-4 w-4 text-muted-foreground hover:text-blue-500 shrink-0 transition-colors" />
                          <p className={`text-xs font-medium ${getContainerReleaseStatusColor(shipment.containerReleaseStatusIndicator)}`} data-testid={`text-container-release-${shipment.id}`}>
                            {shipment.deliveryRelease === "Line" 
                              ? "Pay Line for Delivery" 
                              : `Release Container to : ${shipment.deliveryRelease || "N/A"}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleContainerReleaseStatusUpdate(shipment.id, 1)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.containerReleaseStatusIndicator === 1 || shipment.containerReleaseStatusIndicator === null
                                ? 'bg-yellow-400 border-yellow-500 scale-110'
                                : 'bg-yellow-200 border-yellow-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                            }`}
                            data-testid={`button-container-status-yellow-${shipment.id}`}
                            title="To Do"
                          />
                          <button
                            onClick={() => handleContainerReleaseStatusUpdate(shipment.id, 2)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.containerReleaseStatusIndicator === 2
                                ? 'bg-orange-400 border-orange-500 scale-110'
                                : 'bg-orange-200 border-orange-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                            }`}
                            data-testid={`button-container-status-orange-${shipment.id}`}
                            title="Waiting for Reply"
                          />
                          <button
                            onClick={() => handleContainerReleaseStatusUpdate(shipment.id, 3)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.containerReleaseStatusIndicator === 3
                                ? 'bg-green-400 border-green-500 scale-110'
                                : 'bg-green-200 border-green-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                            }`}
                            data-testid={`button-container-status-green-${shipment.id}`}
                            title="Completed"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSendInvoiceToCustomerEmail(shipment)}
                          className="hover-elevate active-elevate-2 p-0 rounded shrink-0"
                          data-testid={`button-send-invoice-email-${shipment.id}`}
                          title="Send invoice email to customer"
                        >
                          <PoundSterling className="h-4 w-4 text-muted-foreground hover:text-blue-500 transition-colors" />
                        </button>
                        <button
                          onClick={() => openWindow({ 
                            type: 'customer-invoice', 
                            id: `invoice-${shipment.id}-${Date.now()}`, 
                            payload: { job: shipment, jobType: 'import' } 
                          })}
                          className={`text-xs font-medium ${getInvoiceCustomerStatusColor(shipment.invoiceCustomerStatusIndicator)} hover:underline cursor-pointer flex items-center gap-1`}
                          data-testid={`button-invoice-customer-${shipment.id}`}
                        >
                          Send Invoice/Credit to Customer
                          {shipment.invoiceCustomerStatusIndicator === 3 && <Check className="h-3 w-3" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateInvoiceCustomerStatus.mutate({ id: shipment.id, status: null })}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.invoiceCustomerStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                          }`}
                          data-testid={`button-invoice-status-yellow-${shipment.id}`}
                          title="To Do"
                        />
                        <div className="h-5 w-5 rounded border-2 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 relative" title="Not Available">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-0.5 bg-red-500 rotate-45 origin-center"></div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleInvoiceCustomerStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.invoiceCustomerStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
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
                          <Mail className="h-4 w-4 text-muted-foreground hover:text-blue-500 transition-colors" />
                        </button>
                        <p className={`text-xs font-medium ${getSendPodToCustomerStatusColor(shipment.sendPodToCustomerStatusIndicator)} flex items-center gap-1`} data-testid={`text-send-pod-customer-${shipment.id}`}>
                          Send POD To Customer
                          {shipment.sendPodToCustomerStatusIndicator === 3 && <Check className="h-3 w-3" />}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateSendPodToCustomerStatus.mutate({ id: shipment.id, status: null })}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.sendPodToCustomerStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                          }`}
                          data-testid={`button-send-pod-status-yellow-${shipment.id}`}
                          title="To Do"
                        />
                        <div className="h-5 w-5 rounded border-2 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 relative" title="Not Available">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-0.5 bg-red-500 rotate-45 origin-center"></div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSendPodToCustomerStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.sendPodToCustomerStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover:bg-blue-300 hover:border-blue-400 transition-colors'
                          }`}
                          data-testid={`button-send-pod-status-green-${shipment.id}`}
                          title="Completed"
                        />
                      </div>
                    </div>
                  </div>
                  {(() => {
                    // Use shared documents from job_file_groups if available, otherwise fall back to shipment's own attachments
                    const sharedDocs = shipment.jobRef ? (sharedDocsMap[shipment.jobRef] || []) : []
                    const attachmentFiles = sharedDocs.length > 0 ? sharedDocs : parseAttachments(shipment.attachments)
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
                                ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
                                : "border-transparent"
                            }`}>
                              {attachmentFiles.length > 0 ? (
                                <div className="space-y-0.5">
                                  {attachmentFiles.map((filePath, idx) => {
                                    const fileName = filePath.split('/').pop() || filePath
                                    const downloadPath = normalizeFilePath(filePath)
                                    return (
                                      <div key={idx} className="flex items-center gap-1 group">
                                        <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        <a
                                          href={downloadPath}
                                          onClick={(e) => handleFileClick(e, filePath)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary hover:underline truncate flex-1 cursor-pointer"
                                          title={fileName}
                                        >
                                          {fileName}
                                        </a>
                                        {/* OCR hidden - backend system remains available for future use */}
                                        {/* <OCRDialog filePath={filePath} fileName={fileName} /> */}
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
                                    ? "text-blue-600 dark:text-blue-400"
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
                                  {podFiles.map((filePath, idx) => {
                                    const fileName = filePath.split('/').pop() || filePath
                                    const downloadPath = normalizeFilePath(filePath)
                                    return (
                                      <div key={idx} className="flex items-center gap-1 group">
                                        <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        <a
                                          href={downloadPath}
                                          onClick={(e) => handleFileClick(e, filePath)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary hover:underline truncate flex-1 cursor-pointer"
                                          title={fileName}
                                        >
                                          {fileName}
                                        </a>
                                        {/* OCR hidden - backend system remains available for future use */}
                                        {/* <OCRDialog filePath={filePath} fileName={fileName} /> */}
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
                                onClick={() => openWindow({ 
                                  type: 'customer-invoice', 
                                  id: `invoice-${shipment.id}-${Date.now()}`, 
                                  payload: { job: shipment, jobType: 'import' } 
                                })}
                                data-testid={`button-create-invoice-${shipment.id}`}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                <span className="text-xs">Invoice</span>
                              </Button>
                            </div>
                            {(() => {
                              const shipmentInvoices = allInvoices.filter(inv => 
                                inv.jobRef === shipment.jobRef && inv.jobType === 'import' && inv.jobId === shipment.id
                              )
                              return shipmentInvoices.length > 0 ? (
                                <div className="grid grid-cols-2 gap-1">
                                  {shipmentInvoices.map((invoice) => {
                                    const isCredit = invoice.type === 'credit_note'
                                    const prefix = isCredit ? 'CR' : 'INV'
                                    const colorClass = isCredit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                    return (
                                    <div key={invoice.id} className="flex items-center gap-1 group">
                                      <span
                                        className={`text-xs ${colorClass} hover:underline cursor-pointer truncate flex-1`}
                                        title={`${prefix} ${invoice.invoiceNumber} - £${invoice.total.toFixed(2)}`}
                                      >
                                        {prefix} {invoice.invoiceNumber} - £{invoice.total.toFixed(2)}
                                      </span>
                                      <button
                                        onClick={() => openWindow({ 
                                          type: 'customer-invoice', 
                                          id: `invoice-edit-${invoice.id}-${Date.now()}`, 
                                          payload: { job: shipment, jobType: 'import', existingInvoice: invoice } 
                                        })}
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
                                        <Download className="h-3 w-3 text-primary hover:text-primary/80" />
                                      </a>
                                    </div>
                                  )})}
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
              This action cannot be undone. This will permanently delete this import shipment.
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
        <DialogContent className="max-w-3xl h-[400px] flex flex-col" aria-describedby="notes-description">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Additional Notes</DialogTitle>
            <p id="notes-description" className="sr-only">Add or edit additional notes for this shipment</p>
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
              className="h-full resize-none !border-2 !border-yellow-500 dark:!border-yellow-600 focus-visible:!ring-yellow-500"
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

      <Dialog open={!!trackingShipment} onOpenChange={(open) => !open && setTrackingShipment(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="tracking-description">
          <DialogHeader>
            <DialogTitle>Container Tracking - {trackingShipment?.trailerOrContainerNumber}</DialogTitle>
            <p id="tracking-description" className="sr-only">View real-time tracking information for this container</p>
          </DialogHeader>
          <div className="space-y-4">
            {trackContainer.isPending || fetchTrackingData.isPending ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <p className="ml-3 text-muted-foreground">Loading tracking data...</p>
              </div>
            ) : trackingData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Container Number</p>
                    <p className="text-lg">{trackingData.data?.attributes?.bill_of_lading_number || trackingShipment?.trailerOrContainerNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Shipping Line</p>
                    <p className="text-lg">{trackingData.data?.attributes?.shipping_line_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Port of Loading</p>
                    <p className="text-lg">{trackingData.data?.attributes?.port_of_lading_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Port of Discharge</p>
                    <p className="text-lg">{trackingData.data?.attributes?.port_of_discharge_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Vessel Name</p>
                    <p className="text-lg">{trackingData.data?.attributes?.pod_vessel_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Voyage Number</p>
                    <p className="text-lg">{trackingData.data?.attributes?.pod_voyage_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">ETD (Actual)</p>
                    <p className="text-lg">{trackingData.data?.attributes?.pol_atd_at ? format(new Date(trackingData.data.attributes.pol_atd_at), 'MMM dd, yyyy HH:mm') : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">ETA</p>
                    <p className="text-lg">{trackingData.data?.attributes?.pod_eta_at ? format(new Date(trackingData.data.attributes.pod_eta_at), 'MMM dd, yyyy HH:mm') : 'N/A'}</p>
                  </div>
                </div>
                
                {trackingData.included && trackingData.included.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Transport Events</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {trackingData.included
                        .filter((item: any) => item.type === 'transport_event')
                        .map((event: any, index: number) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex justify-between">
                              <p className="font-semibold">{event.attributes?.event}</p>
                              <p className="text-sm text-muted-foreground">
                                {event.attributes?.timestamp ? format(new Date(event.attributes.timestamp), 'MMM dd, yyyy HH:mm') : ''}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground">{event.attributes?.location}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <p className="text-muted-foreground">Container tracking is in progress</p>
                <p className="text-sm text-muted-foreground">
                  Terminal49 is searching for tracking data. This usually takes a few minutes.
                  <br />
                  Please try again shortly.
                </p>
              </div>
            )}
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
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                ) : viewingShipment?.containerShipment === "Container Shipment" ? (
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Container className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                ) : viewingShipment?.containerShipment === "Air Freight" ? (
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Plane className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                ) : (
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div>
                  <DialogTitle className="text-2xl leading-none">
                    R.S Import Shipment {viewingShipment?.jobRef}
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
                        id: `import-shipment-${viewingShipment.id}`,
                        type: 'import-shipment',
                        title: `Edit Import Shipment #${viewingShipment.jobRef}`,
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
              <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100">Customer Information</h3>
                  </div>
                  {(() => {
                    const customer = getCustomer(viewingShipment.importCustomerId)
                    const hasAgent = customer?.agentName
                    
                    return (
                      <div className="space-y-4">
                        <div className={hasAgent ? "grid grid-cols-1 gap-4" : "grid grid-cols-4 gap-4"}>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Customer</p>
                            <p className="font-semibold text-base">{getCustomerName(viewingShipment.importCustomerId)}</p>
                          </div>
                          {!hasAgent && viewingShipment.jobContactName && viewingShipment.jobContactName.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Contact Name</p>
                              <p className="text-base">{viewingShipment.jobContactName.join(', ')}</p>
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
                                    className="text-base text-blue-600 dark:text-blue-400 hover:underline"
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
                        
                        {!hasAgent && viewingShipment.customerReferenceNumber && (
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Customer Reference</p>
                              <p className="text-base">{viewingShipment.customerReferenceNumber}</p>
                            </div>
                          </div>
                        )}
                        
                        {hasAgent && (
                          <>
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Agent Name</p>
                                <p className="text-base">{customer.agentName}</p>
                              </div>
                              {viewingShipment.jobContactName && viewingShipment.jobContactName.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Contact Name</p>
                                  <p className="text-base">{viewingShipment.jobContactName.join(', ')}</p>
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
                                        className="text-base text-blue-600 dark:text-blue-400 hover:underline"
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
                            
                            {viewingShipment.customerReferenceNumber && (
                              <div className="grid grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Customer Reference</p>
                                  <p className="text-base">{viewingShipment.customerReferenceNumber}</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                          {viewingShipment.supplierName && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Supplier Name</p>
                              <p className="text-base">{viewingShipment.supplierName}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>

              <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Ship className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100">Shipment Details</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {viewingShipment.containerShipment && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Shipment Type</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.containerShipment}</p>
                      </div>
                    )}
                    {viewingShipment.trailerOrContainerNumber && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">
                          {viewingShipment.containerShipment === 'Container Shipment' ? 'Container Number' : 
                           viewingShipment.containerShipment === 'Road Shipment' ? 'Trailer Number' : 
                           viewingShipment.containerShipment === 'Air Freight' ? 'Flight Number' : 
                           'Container/Trailer #'}
                        </p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.trailerOrContainerNumber}</p>
                      </div>
                    )}
                    {viewingShipment.vesselName && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Vessel Name</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.vesselName}</p>
                      </div>
                    )}
                    {viewingShipment.shippingLine && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Shipping Line</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.shippingLine}</p>
                      </div>
                    )}
                    {viewingShipment.departureCountry && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Departure Country</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.departureCountry}</p>
                      </div>
                    )}
                    {viewingShipment.portOfArrival && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Port of Arrival</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.portOfArrival}</p>
                      </div>
                    )}
                    {viewingShipment.incoterms && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Incoterms</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.incoterms}</p>
                      </div>
                    )}
                    {viewingShipment.deliveryRelease && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Delivery Release</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.deliveryRelease}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100">Important Dates</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {viewingShipment.bookingDate && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Booking Date</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{formatDate(viewingShipment.bookingDate)}</p>
                      </div>
                    )}
                    {viewingShipment.collectionDate && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Collection Date</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{formatDate(viewingShipment.collectionDate)}</p>
                      </div>
                    )}
                    {viewingShipment.dispatchDate && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Dispatch Date</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{formatDate(viewingShipment.dispatchDate)}</p>
                      </div>
                    )}
                    {viewingShipment.importDateEtaPort && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">ETA Port</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{formatDate(viewingShipment.importDateEtaPort)}</p>
                      </div>
                    )}
                    {viewingShipment.deliveryDate && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Delivery Date</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{formatDate(viewingShipment.deliveryDate)}</p>
                      </div>
                    )}
                    {viewingShipment.deliveryTime && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Delivery Time</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.deliveryTime}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {(viewingShipment.collectionAddress || viewingShipment.collectionContactName || viewingShipment.collectionContactTelephone || viewingShipment.collectionContactEmail || viewingShipment.collectionReference || viewingShipment.collectionNotes || viewingShipment.deliveryAddress || viewingShipment.deliveryReference || viewingShipment.deliveryTimeNotes) && (
                <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100">Collection & Delivery Information</h3>
                    </div>
                    <div className="space-y-3">
                      {viewingShipment.collectionAddress && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-muted-foreground mb-1">Collection Address</p>
                          <p className="font-semibold text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">{viewingShipment.collectionAddress}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-3">
                        {viewingShipment.collectionContactName && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Collection Contact Name</p>
                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.collectionContactName}</p>
                          </div>
                        )}
                        {viewingShipment.collectionContactTelephone && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Collection Contact Telephone</p>
                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.collectionContactTelephone}</p>
                          </div>
                        )}
                        {viewingShipment.collectionContactEmail && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Collection Contact Email</p>
                            <a 
                              href={`mailto:${viewingShipment.collectionContactEmail}`} 
                              className="font-semibold text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {viewingShipment.collectionContactEmail}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {viewingShipment.collectionReference && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Collection Reference</p>
                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.collectionReference}</p>
                          </div>
                        )}
                        {viewingShipment.collectionNotes && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Collection Notes</p>
                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">{viewingShipment.collectionNotes}</p>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-blue-200 dark:border-blue-800 my-3"></div>
                      {viewingShipment.deliveryAddress && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-muted-foreground mb-1">Delivery Address</p>
                          <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.deliveryAddress}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {viewingShipment.deliveryReference && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Delivery Reference</p>
                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.deliveryReference}</p>
                          </div>
                        )}
                        {viewingShipment.deliveryTimeNotes && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Delivery Notes</p>
                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">{viewingShipment.deliveryTimeNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Box className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100">Cargo</h3>
                    </div>
                    <div className="space-y-3">
                      {viewingShipment.goodsDescription && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-muted-foreground mb-1">Goods Description</p>
                          <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.goodsDescription}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {viewingShipment.numberOfPieces && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Pieces</p>
                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.numberOfPieces} {viewingShipment.packaging}</p>
                          </div>
                        )}
                        {viewingShipment.weight && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Weight</p>
                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.weight} kgs</p>
                          </div>
                        )}
                        {viewingShipment.cube && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800 col-span-2">
                            <p className="text-xs text-muted-foreground mb-1">Cube</p>
                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.cube}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100">Haulier Information</h3>
                    </div>
                    <div className="space-y-3">
                      {viewingShipment.haulierName && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-muted-foreground mb-1">Haulier</p>
                          <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.haulierName}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {viewingShipment.haulierContactName && viewingShipment.haulierContactName.length > 0 && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Haulier Contact Name</p>
                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.haulierContactName.join(", ")}</p>
                          </div>
                        )}
                        {viewingShipment.haulierTelephone && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Telephone</p>
                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.haulierTelephone}</p>
                          </div>
                        )}
                      </div>
                      {viewingShipment.haulierEmail && viewingShipment.haulierEmail.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-muted-foreground mb-1">Hauliers Email</p>
                          <div className="flex flex-col gap-1">
                            {viewingShipment.haulierEmail.map((email, idx) => {
                              const subject = `Our Ref : ${viewingShipment.jobRef} / Your Ref : ${viewingShipment.haulierReference || ''} / ${getCustomerName(viewingShipment.importCustomerId)} / ${viewingShipment.numberOfPieces || ''} ${viewingShipment.packaging || ''}, ${viewingShipment.weight || ''} kgs`;
                              return (
                                <a 
                                  key={idx} 
                                  href={`mailto:${email}?subject=${encodeURIComponent(subject)}`} 
                                  className="font-semibold text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  {email}
                                </a>
                              );
                            })}
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
                    <div className="bg-white dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-xs text-muted-foreground mb-1">R.S To Clear</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={viewingShipment.rsToClear ? "default" : "secondary"} className="text-xs">
                          {viewingShipment.rsToClear ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-xs text-muted-foreground mb-1">VAT Zero Rated</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={viewingShipment.vatZeroRated ? "default" : "secondary"} className="text-xs">
                          {viewingShipment.vatZeroRated ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                    {viewingShipment.clearanceType && (
                      <div className="bg-white dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground mb-1">Clearance Type</p>
                        <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">{viewingShipment.clearanceType}</p>
                      </div>
                    )}
                    {viewingShipment.invoiceValue && (
                      <div className="bg-white dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground mb-1">Invoice Value</p>
                        <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">{formatCurrency(viewingShipment.currency)}{viewingShipment.invoiceValue}</p>
                      </div>
                    )}
                    {viewingShipment.freightCharge && (
                      <div className="bg-white dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground mb-1">Transport Costs</p>
                        <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">{formatCurrency(viewingShipment.currency)}{viewingShipment.freightCharge}</p>
                      </div>
                    )}
                    {viewingShipment.customsClearanceAgent && (
                      <div className="bg-white dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground mb-1">Customs Agent</p>
                        <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">{viewingShipment.customsClearanceAgent}</p>
                      </div>
                    )}
                    {viewingShipment.additionalCommodityCodes !== null && (
                      <div className="bg-white dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground mb-1">Additional Commodity Codes</p>
                        <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">{viewingShipment.additionalCommodityCodes}</p>
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
                          viewingShipment.exportCustomsClearanceCharge,
                          viewingShipment.additionalCommodityCodeCharge,
                          ...(viewingShipment.expensesToChargeOut || []).map((e: { amount: string }) => e.amount)
                        ]
                          .filter(Boolean)
                          .reduce((sum, val) => sum + (parseFloat(val as string) || 0), 0);
                        
                        return total > 0 ? (
                          <Badge variant="outline" className="ml-auto text-xs border-green-300 dark:border-green-700">
                            {formatCurrency(viewingShipment.currency)}{total.toFixed(2)}
                          </Badge>
                        ) : null;
                      })()}
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        {viewingShipment.freightRateOut && (
                          <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-muted-foreground mb-1">Freight Rate</p>
                            <p className="font-semibold text-sm text-green-900 dark:text-green-100 text-right">{formatCurrency(viewingShipment.currency)}{viewingShipment.freightRateOut}</p>
                          </div>
                        )}
                        {viewingShipment.rsToClear && viewingShipment.clearanceCharge && (
                          <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-muted-foreground mb-1">Import Clearance</p>
                            <p className="font-semibold text-sm text-green-900 dark:text-green-100 text-right">{formatCurrency(viewingShipment.currency)}{viewingShipment.clearanceCharge}</p>
                          </div>
                        )}
                        {viewingShipment.exportCustomsClearanceCharge && (
                          <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-muted-foreground mb-1">Export Clearance</p>
                            <p className="font-semibold text-sm text-green-900 dark:text-green-100 text-right">{formatCurrency(viewingShipment.currency)}{viewingShipment.exportCustomsClearanceCharge}</p>
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
                                £{((viewingShipment.additionalCommodityCodes - 1) * parseFloat(viewingShipment.additionalCommodityCodeCharge)).toFixed(2)}
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
                                <span className="font-semibold text-sm text-green-900 dark:text-green-100 text-right">{formatCurrency(viewingShipment.currency)}{expense.amount}</span>
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
                            <p className="text-xs text-muted-foreground mb-1">Haulier Freight Rate</p>
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
                            <p className="text-xs text-muted-foreground mb-1">Import Clearance</p>
                            <p className="font-semibold text-sm text-orange-900 dark:text-orange-100 text-right">{formatCurrency(viewingShipment.currencyIn || "GBP")}{viewingShipment.destinationClearanceCostIn}</p>
                          </div>
                        )}
                      </div>
                      {viewingShipment.additionalExpensesIn && viewingShipment.additionalExpensesIn.length > 0 && (
                        <div className="bg-white dark:bg-orange-950/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                          <p className="text-xs text-muted-foreground mb-2">Additional Charges In</p>
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

              {(() => {
                const attachmentFiles = parseAttachments(viewingShipment.attachments)
                const podFiles = parseAttachments(viewingShipment.proofOfDelivery)
                if (attachmentFiles.length > 0 || podFiles.length > 0) {
                  return (
                    <Card>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <Paperclip className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <h3 className="font-semibold text-lg">Attachments</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Documents</p>
                            {attachmentFiles.length > 0 ? (
                              <div className="space-y-2">
                                {attachmentFiles.map((filePath, idx) => {
                                  const fileName = filePath.split('/').pop() || filePath
                                  const downloadPath = normalizeFilePath(filePath)
                                  return (
                                    <div key={idx} className="flex items-center gap-2 p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors group">
                                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                      </div>
                                      <a
                                        href={downloadPath}
                                        onClick={(e) => handleFileClick(e, filePath)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm truncate flex-1 group-hover:text-primary cursor-pointer"
                                        title={fileName}
                                      >
                                        {fileName}
                                      </a>
                                      {/* OCR hidden - backend system remains available for future use */}
                                      {/* <OCRDialog filePath={filePath} fileName={fileName} /> */}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic p-3 bg-muted/20 rounded-lg">No documents</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Proof of Delivery</p>
                            {podFiles.length > 0 ? (
                              <div className="space-y-2">
                                {podFiles.map((filePath, idx) => {
                                  const fileName = filePath.split('/').pop() || filePath
                                  const downloadPath = normalizeFilePath(filePath)
                                  return (
                                    <div key={idx} className="flex items-center gap-2 p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors group">
                                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-md">
                                        <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                                      </div>
                                      <a
                                        href={downloadPath}
                                        onClick={(e) => handleFileClick(e, filePath)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm truncate flex-1 group-hover:text-primary cursor-pointer"
                                        title={fileName}
                                      >
                                        {fileName}
                                      </a>
                                      {/* OCR hidden - backend system remains available for future use */}
                                      {/* <OCRDialog filePath={filePath} fileName={fileName} /> */}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic p-3 bg-muted/20 rounded-lg">No POD files</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                }
                return null
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={statusPrompt.show} onOpenChange={(open) => !open && handleStatusPromptCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Status</AlertDialogTitle>
            <AlertDialogDescription>
              {statusPrompt.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStatusPromptCancel}>No, keep current status</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusPromptConfirm}>Yes, update status</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={etaUpdateDialog?.show || false} onOpenChange={(open) => !open && setEtaUpdateDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update ETA Date?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {etaUpdateDialog && (
                <div>
                  <div>The tracking system shows a different ETA date than what's recorded in the job.</div>
                  <div className="mt-4 space-y-2">
                    <div className="font-medium">Current Job ETA: {trackingShipment?.importDateEtaPort ? format(new Date(trackingShipment.importDateEtaPort), 'dd MMM yyyy') : 'Not set'}</div>
                    <div className="font-medium">Tracking ETA: {format(new Date(etaUpdateDialog.newEta), 'dd MMM yyyy')}</div>
                    <div className="text-sm text-muted-foreground">
                      {etaUpdateDialog.daysDiff > 0 
                        ? `The new ETA is ${etaUpdateDialog.daysDiff} day${etaUpdateDialog.daysDiff === 1 ? '' : 's'} later than expected.`
                        : `The new ETA is ${Math.abs(etaUpdateDialog.daysDiff)} day${Math.abs(etaUpdateDialog.daysDiff) === 1 ? '' : 's'} earlier than expected.`
                      }
                    </div>
                  </div>
                  <div className="mt-4">Would you like to update the job with the new ETA date?</div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEtaUpdateDialog(null)}>No, keep current ETA</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (etaUpdateDialog) {
                updateEta.mutate({ id: etaUpdateDialog.shipmentId, eta: etaUpdateDialog.newEta })
              }
            }}>Yes, update ETA</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={etdUpdateDialog?.show || false} onOpenChange={(open) => !open && setEtdUpdateDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Dispatch Date?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {etdUpdateDialog && (
                <div>
                  <div>The tracking system shows a different actual departure date than the dispatch date recorded in the job.</div>
                  <div className="mt-4 space-y-2">
                    <div className="font-medium">Current Job Dispatch Date: {trackingShipment?.dispatchDate ? format(new Date(trackingShipment.dispatchDate), 'dd MMM yyyy') : 'Not set'}</div>
                    <div className="font-medium">Tracking Departure Date: {format(new Date(etdUpdateDialog.newEtd), 'dd MMM yyyy')}</div>
                    <div className="text-sm text-muted-foreground">
                      {etdUpdateDialog.daysDiff > 0 
                        ? `The actual departure was ${etdUpdateDialog.daysDiff} day${etdUpdateDialog.daysDiff === 1 ? '' : 's'} later than recorded.`
                        : `The actual departure was ${Math.abs(etdUpdateDialog.daysDiff)} day${Math.abs(etdUpdateDialog.daysDiff) === 1 ? '' : 's'} earlier than recorded.`
                      }
                    </div>
                  </div>
                  <div className="mt-4">Would you like to update the job with the actual dispatch date?</div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEtdUpdateDialog(null)}>No, keep current date</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (etdUpdateDialog) {
                updateEtd.mutate({ id: etdUpdateDialog.shipmentId, etd: etdUpdateDialog.newEtd })
              }
            }}>Yes, update dispatch date</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={vesselUpdateDialog?.show || false} onOpenChange={(open) => !open && setVesselUpdateDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Vessel Name?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {vesselUpdateDialog && (
                <div>
                  <div>The tracking system shows a different vessel name than what's recorded in the job.</div>
                  <div className="mt-4 space-y-2">
                    <div className="font-medium">Current Job Vessel: {trackingShipment?.vesselName || 'Not set'}</div>
                    <div className="font-medium">Tracking Vessel: {vesselUpdateDialog.newVessel}</div>
                  </div>
                  <div className="mt-4">Would you like to update the job with the tracking vessel name?</div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVesselUpdateDialog(null)}>No, keep current vessel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (vesselUpdateDialog) {
                updateVessel.mutate({ id: vesselUpdateDialog.shipmentId, vessel: vesselUpdateDialog.newVessel })
              }
            }}>Yes, update vessel name</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={portUpdateDialog?.show || false} onOpenChange={(open) => !open && setPortUpdateDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Port of Arrival?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {portUpdateDialog && (
                <div>
                  <div>The tracking system shows a different port of arrival than what's recorded in the job.</div>
                  <div className="mt-4 space-y-2">
                    <div className="font-medium">Current Job Port: {trackingShipment?.portOfArrival || 'Not set'}</div>
                    <div className="font-medium">Tracking Port: {portUpdateDialog.newPort}</div>
                  </div>
                  <div className="mt-4">Would you like to update the job with the tracking port of arrival?</div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPortUpdateDialog(null)}>No, keep current port</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (portUpdateDialog) {
                updatePort.mutate({ id: portUpdateDialog.shipmentId, port: portUpdateDialog.newPort })
              }
            }}>Yes, update port of arrival</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewingPdf} onOpenChange={(open) => !open && setViewingPdf(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0" aria-describedby="pdf-viewer-description">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewingPdf?.name}
            </DialogTitle>
            <p id="pdf-viewer-description" className="sr-only">PDF document viewer</p>
          </DialogHeader>
          <div className="flex-1 px-6 pb-6 overflow-hidden">
            {viewingPdf && <PDFViewer url={viewingPdf.url} filename={viewingPdf.name} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Clearance Agent Selection Dialog */}
      <Dialog open={clearanceAgentDialog?.show || false} onOpenChange={(open) => !open && setClearanceAgentDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Clearance Agent</DialogTitle>
            <DialogDescription>Choose a clearance agent to email about this shipment</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {clearanceAgents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No clearance agents available</p>
            ) : (
              clearanceAgents.map((agent) => (
                <Card 
                  key={agent.id} 
                  className="cursor-pointer hover-elevate transition-all"
                  onClick={() => handleClearanceAgentSelected(agent)}
                  data-testid={`clearance-agent-${agent.id}`}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg">{agent.agentName}</h3>
                    {agent.agentImportEmail && agent.agentImportEmail.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {agent.agentImportEmail[0]}
                      </p>
                    )}
                    {agent.agentTelephone && (
                      <p className="text-sm text-muted-foreground">{agent.agentTelephone}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>


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
