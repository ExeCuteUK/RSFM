import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Plus, Pencil, Trash2, Truck, RefreshCw, Paperclip, StickyNote, X, Search, ChevronDown, CalendarCheck, PackageCheck, FileCheck, DollarSign, FileText } from "lucide-react"
import { ExportShipmentForm } from "@/components/export-shipment-form"
import type { ExportShipment, InsertExportShipment, ExportReceiver, ExportCustomer, CustomClearance } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"
import { useWindowManager } from "@/contexts/WindowManagerContext"

export default function ExportShipments() {
  const { openWindow } = useWindowManager()
  const [deletingShipmentId, setDeletingShipmentId] = useState<string | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["Awaiting Collection", "Dispatched", "Delivered"])
  const [searchText, setSearchText] = useState("")
  const [notesShipmentId, setNotesShipmentId] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState("")
  const [dragOver, setDragOver] = useState<{ shipmentId: string; type: "attachment" | "pod" } | null>(null)
  const { toast} = useToast()
  const [, setLocation] = useLocation()

  // Read search parameter from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const searchParam = params.get('search')
    if (searchParam) {
      setSearchText(searchParam)
      setSelectedStatuses([]) // Select "All" filter
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

  const shipments = searchText.trim() === ""
    ? filteredByStatus
    : filteredByStatus.filter(s => {
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

  const updateBookingConfirmedStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/export-shipments/${id}/booking-confirmed-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
    },
  })

  const updateTransportArrangedStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/export-shipments/${id}/transport-arranged-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
    },
  })

  const updateCustomsSubmittedStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/export-shipments/${id}/customs-submitted-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
    },
  })

  const updateInvoiceCustomerStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/export-shipments/${id}/invoice-customer-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
    },
  })

  const updateSendDocsStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/export-shipments/${id}/send-docs-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
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
    if (confirm("Are you sure you want to delete this file?")) {
      deleteFile.mutate({ id, filePath, fileType })
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
    if (status === "Fully Cleared") {
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

  const getBookingConfirmedStatusColor = (status: number | null) => {
    if (status === 1 || status === null) return "text-yellow-700 dark:text-yellow-400"
    if (status === 2) return "text-orange-600 dark:text-orange-400"
    if (status === 3) return "text-green-600 dark:text-green-400"
    if (status === 4) return "text-red-600 dark:text-red-400"
    return "text-muted-foreground"
  }

  const getTransportArrangedStatusColor = (status: number | null) => {
    if (status === 1 || status === null) return "text-yellow-700 dark:text-yellow-400"
    if (status === 2) return "text-orange-600 dark:text-orange-400"
    if (status === 3) return "text-green-600 dark:text-green-400"
    if (status === 4) return "text-red-600 dark:text-red-400"
    return "text-muted-foreground"
  }

  const getCustomsSubmittedStatusColor = (status: number | null) => {
    if (status === 1 || status === null) return "text-yellow-700 dark:text-yellow-400"
    if (status === 2) return "text-orange-600 dark:text-orange-400"
    if (status === 3) return "text-green-600 dark:text-green-400"
    if (status === 4) return "text-red-600 dark:text-red-400"
    return "text-muted-foreground"
  }

  const getInvoiceCustomerStatusColor = (status: number | null) => {
    if (status === 1 || status === null) return "text-yellow-700 dark:text-yellow-400"
    if (status === 2) return "text-orange-600 dark:text-orange-400"
    if (status === 3) return "text-green-600 dark:text-green-400"
    if (status === 4) return "text-red-600 dark:text-red-400"
    return "text-muted-foreground"
  }

  const getSendDocsStatusColor = (status: number | null) => {
    if (status === 1 || status === null) return "text-yellow-700 dark:text-yellow-400"
    if (status === 2) return "text-orange-600 dark:text-orange-400"
    if (status === 3) return "text-green-600 dark:text-green-400"
    if (status === 4) return "text-red-600 dark:text-red-400"
    return "text-muted-foreground"
  }

  const handleBookingConfirmedStatusUpdate = (id: string, status: number) => {
    updateBookingConfirmedStatus.mutate({ id, status })
  }

  const handleTransportArrangedStatusUpdate = (id: string, status: number) => {
    updateTransportArrangedStatus.mutate({ id, status })
  }

  const handleCustomsSubmittedStatusUpdate = (id: string, status: number) => {
    updateCustomsSubmittedStatus.mutate({ id, status })
  }

  const handleInvoiceCustomerStatusUpdate = (id: string, status: number) => {
    updateInvoiceCustomerStatus.mutate({ id, status })
  }

  const handleSendDocsStatusUpdate = (id: string, status: number) => {
    updateSendDocsStatus.mutate({ id, status })
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
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
                      <h3 className="font-semibold text-lg" data-testid={`text-job-ref-${shipment.id}`}>
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
                          <span>ETA Customs:</span>{' '}
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
                  {shipment.haulierName && (
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
                  
                  <div className="pt-2 mt-2 border-t">
                    <h3 className="font-semibold text-lg mb-2" data-testid={`text-todo-title-${shipment.id}`}>
                      To-Do List
                    </h3>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className={`text-xs font-medium ${getBookingConfirmedStatusColor(shipment.bookingConfirmedStatusIndicator)}`} data-testid={`text-booking-confirmed-${shipment.id}`}>
                          Confirm Booking
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleBookingConfirmedStatusUpdate(shipment.id, 1)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.bookingConfirmedStatusIndicator === 1 || shipment.bookingConfirmedStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover-elevate'
                          }`}
                          data-testid={`button-booking-status-yellow-${shipment.id}`}
                          title="To Do"
                        />
                        <button
                          onClick={() => handleBookingConfirmedStatusUpdate(shipment.id, 2)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.bookingConfirmedStatusIndicator === 2
                              ? 'bg-orange-400 border-orange-500 scale-110'
                              : 'bg-orange-200 border-orange-300 hover-elevate'
                          }`}
                          data-testid={`button-booking-status-orange-${shipment.id}`}
                          title="Waiting for Reply"
                        />
                        <button
                          onClick={() => handleBookingConfirmedStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.bookingConfirmedStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover-elevate'
                          }`}
                          data-testid={`button-booking-status-green-${shipment.id}`}
                          title="Completed"
                        />
                        <button
                          onClick={() => handleBookingConfirmedStatusUpdate(shipment.id, 4)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.bookingConfirmedStatusIndicator === 4
                              ? 'bg-red-400 border-red-500 scale-110'
                              : 'bg-red-200 border-red-300 hover-elevate'
                          }`}
                          data-testid={`button-booking-status-red-${shipment.id}`}
                          title="Issue, Check Notes?"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <PackageCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className={`text-xs font-medium ${getTransportArrangedStatusColor(shipment.transportArrangedStatusIndicator)}`} data-testid={`text-transport-arranged-${shipment.id}`}>
                          Arrange Transport
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTransportArrangedStatusUpdate(shipment.id, 1)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.transportArrangedStatusIndicator === 1 || shipment.transportArrangedStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover-elevate'
                          }`}
                          data-testid={`button-transport-status-yellow-${shipment.id}`}
                          title="To Do"
                        />
                        <button
                          onClick={() => handleTransportArrangedStatusUpdate(shipment.id, 2)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.transportArrangedStatusIndicator === 2
                              ? 'bg-orange-400 border-orange-500 scale-110'
                              : 'bg-orange-200 border-orange-300 hover-elevate'
                          }`}
                          data-testid={`button-transport-status-orange-${shipment.id}`}
                          title="Waiting for Reply"
                        />
                        <button
                          onClick={() => handleTransportArrangedStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.transportArrangedStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover-elevate'
                          }`}
                          data-testid={`button-transport-status-green-${shipment.id}`}
                          title="Completed"
                        />
                        <button
                          onClick={() => handleTransportArrangedStatusUpdate(shipment.id, 4)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.transportArrangedStatusIndicator === 4
                              ? 'bg-red-400 border-red-500 scale-110'
                              : 'bg-red-200 border-red-300 hover-elevate'
                          }`}
                          data-testid={`button-transport-status-red-${shipment.id}`}
                          title="Issue, Check Notes?"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className={`text-xs font-medium ${getCustomsSubmittedStatusColor(shipment.customsSubmittedStatusIndicator)}`} data-testid={`text-customs-submitted-${shipment.id}`}>
                          Submit Customs
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCustomsSubmittedStatusUpdate(shipment.id, 1)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.customsSubmittedStatusIndicator === 1 || shipment.customsSubmittedStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover-elevate'
                          }`}
                          data-testid={`button-customs-status-yellow-${shipment.id}`}
                          title="To Do"
                        />
                        <button
                          onClick={() => handleCustomsSubmittedStatusUpdate(shipment.id, 2)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.customsSubmittedStatusIndicator === 2
                              ? 'bg-orange-400 border-orange-500 scale-110'
                              : 'bg-orange-200 border-orange-300 hover-elevate'
                          }`}
                          data-testid={`button-customs-status-orange-${shipment.id}`}
                          title="Waiting for Reply"
                        />
                        <button
                          onClick={() => handleCustomsSubmittedStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.customsSubmittedStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover-elevate'
                          }`}
                          data-testid={`button-customs-status-green-${shipment.id}`}
                          title="Completed"
                        />
                        <button
                          onClick={() => handleCustomsSubmittedStatusUpdate(shipment.id, 4)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.customsSubmittedStatusIndicator === 4
                              ? 'bg-red-400 border-red-500 scale-110'
                              : 'bg-red-200 border-red-300 hover-elevate'
                          }`}
                          data-testid={`button-customs-status-red-${shipment.id}`}
                          title="Issue, Check Notes?"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className={`text-xs font-medium ${getInvoiceCustomerStatusColor(shipment.invoiceCustomerStatusIndicator)}`} data-testid={`text-invoice-customer-${shipment.id}`}>
                          Invoice Customer
                        </p>
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
                          onClick={() => handleInvoiceCustomerStatusUpdate(shipment.id, 2)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.invoiceCustomerStatusIndicator === 2
                              ? 'bg-orange-400 border-orange-500 scale-110'
                              : 'bg-orange-200 border-orange-300 hover-elevate'
                          }`}
                          data-testid={`button-invoice-status-orange-${shipment.id}`}
                          title="Waiting for Reply"
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
                        <button
                          onClick={() => handleInvoiceCustomerStatusUpdate(shipment.id, 4)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.invoiceCustomerStatusIndicator === 4
                              ? 'bg-red-400 border-red-500 scale-110'
                              : 'bg-red-200 border-red-300 hover-elevate'
                          }`}
                          data-testid={`button-invoice-status-red-${shipment.id}`}
                          title="Issue, Check Notes?"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className={`text-xs font-medium ${getSendDocsStatusColor(shipment.sendDocsToCustomerStatusIndicator)}`} data-testid={`text-send-docs-${shipment.id}`}>
                          Send Docs to Customer
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSendDocsStatusUpdate(shipment.id, 1)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.sendDocsToCustomerStatusIndicator === 1 || shipment.sendDocsToCustomerStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover-elevate'
                          }`}
                          data-testid={`button-send-docs-status-yellow-${shipment.id}`}
                          title="To Do"
                        />
                        <button
                          onClick={() => handleSendDocsStatusUpdate(shipment.id, 2)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.sendDocsToCustomerStatusIndicator === 2
                              ? 'bg-orange-400 border-orange-500 scale-110'
                              : 'bg-orange-200 border-orange-300 hover-elevate'
                          }`}
                          data-testid={`button-send-docs-status-orange-${shipment.id}`}
                          title="Waiting for Reply"
                        />
                        <button
                          onClick={() => handleSendDocsStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.sendDocsToCustomerStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover-elevate'
                          }`}
                          data-testid={`button-send-docs-status-green-${shipment.id}`}
                          title="Completed"
                        />
                        <button
                          onClick={() => handleSendDocsStatusUpdate(shipment.id, 4)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.sendDocsToCustomerStatusIndicator === 4
                              ? 'bg-red-400 border-red-500 scale-110'
                              : 'bg-red-200 border-red-300 hover-elevate'
                          }`}
                          data-testid={`button-send-docs-status-red-${shipment.id}`}
                          title="Issue, Check Notes?"
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
                      </div>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
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
    </div>
  )
}
