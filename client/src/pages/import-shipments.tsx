import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, Package, RefreshCw, Paperclip, StickyNote, X, FileText, Truck, Container, Plane, User, Ship, Calendar, Box, MapPin, PoundSterling, Shield, ClipboardList } from "lucide-react"
import { ImportShipmentForm } from "@/components/import-shipment-form"
import type { ImportShipment, InsertImportShipment, ImportCustomer } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"

export default function ImportShipments() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingShipment, setEditingShipment] = useState<ImportShipment | null>(null)
  const [deletingShipmentId, setDeletingShipmentId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [notesShipmentId, setNotesShipmentId] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState("")
  const [viewingShipment, setViewingShipment] = useState<ImportShipment | null>(null)
  const { toast } = useToast()

  const { data: allShipments = [], isLoading } = useQuery<ImportShipment[]>({
    queryKey: ["/api/import-shipments"],
  })

  const shipments = statusFilter === "ALL" 
    ? allShipments 
    : allShipments.filter(s => s.status === statusFilter)

  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })

  const createShipment = useMutation({
    mutationFn: async (data: InsertImportShipment) => {
      return apiRequest("POST", "/api/import-shipments", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      setIsFormOpen(false)
      setEditingShipment(null)
      toast({ title: "Import shipment created successfully" })
    },
  })

  const updateShipment = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertImportShipment }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      setIsFormOpen(false)
      setEditingShipment(null)
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
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}/invoice-customer-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
    },
  })

  const updateSendPodToCustomerStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/import-shipments/${id}/send-pod-to-customer-status`, { status })
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
      toast({ title: "File deleted successfully" })
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

  const handleCreateNew = () => {
    setEditingShipment(null)
    setIsFormOpen(true)
  }

  const handleEdit = (shipment: ImportShipment) => {
    setEditingShipment(shipment)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeletingShipmentId(id)
  }

  const confirmDelete = () => {
    if (!deletingShipmentId) return
    deleteShipment.mutate(deletingShipmentId)
    setDeletingShipmentId(null)
  }

  const handleFormSubmit = (data: InsertImportShipment) => {
    if (editingShipment) {
      updateShipment.mutate({ id: editingShipment.id, data })
    } else {
      createShipment.mutate(data)
    }
  }

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "N/A"
    const customer = importCustomers.find(c => c.id === customerId)
    return customer?.companyName || "N/A"
  }

  const toggleStatus = (currentStatus: string, id: string) => {
    const statusCycle: { [key: string]: string } = {
      "Pending": "In Transit",
      "In Transit": "Delivered",
      "Delivered": "Pending"
    }
    const nextStatus = statusCycle[currentStatus] || "Pending"
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

  const handleDeleteFile = (id: string, filePath: string, fileType: "attachment" | "pod") => {
    if (confirm("Are you sure you want to delete this file?")) {
      deleteFile.mutate({ id, filePath, fileType })
    }
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
      case 1: return "text-orange-600 dark:text-orange-400"
      case 2:
      case null:
      default: return "text-yellow-600 dark:text-yellow-400"
      case 3: return "text-green-600 dark:text-green-400"
      case 4: return "text-red-600 dark:text-red-400"
    }
  }

  const getHaulierBookingStatusColor = (status: number | null) => {
    switch (status) {
      case 1: return "text-orange-600 dark:text-orange-400"
      case 2:
      case null:
      default: return "text-yellow-600 dark:text-yellow-400"
      case 3: return "text-green-600 dark:text-green-400"
      case 4: return "text-red-600 dark:text-red-400"
    }
  }

  const getContainerReleaseStatusColor = (status: number | null) => {
    switch (status) {
      case 1: return "text-orange-600 dark:text-orange-400"
      case 2:
      case null:
      default: return "text-yellow-600 dark:text-yellow-400"
      case 3: return "text-green-600 dark:text-green-400"
      case 4: return "text-red-600 dark:text-red-400"
    }
  }

  const getInvoiceCustomerStatusColor = (status: number | null) => {
    switch (status) {
      case 2:
      case null:
      default: return "text-yellow-600 dark:text-yellow-400"
      case 3: return "text-green-600 dark:text-green-400"
    }
  }

  const getSendPodToCustomerStatusColor = (status: number | null) => {
    switch (status) {
      case 2:
      case null:
      default: return "text-yellow-600 dark:text-yellow-400"
      case 3: return "text-green-600 dark:text-green-400"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
      case "In Transit": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
      case "Delivered": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"
    }
  }

  const parseAttachments = (attachments: string[] | null) => {
    if (!attachments || !Array.isArray(attachments)) return []
    return attachments
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Import Shipments</h1>
          <p className="text-muted-foreground">
            Manage incoming shipments and customs clearances
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" data-testid="filter-all">ALL</SelectItem>
              <SelectItem value="Pending" data-testid="filter-pending">PENDING</SelectItem>
              <SelectItem value="In Transit" data-testid="filter-in-transit">IN TRANSIT</SelectItem>
              <SelectItem value="Delivered" data-testid="filter-delivered">DELIVERED</SelectItem>
            </SelectContent>
          </Select>
          <Button data-testid="button-new-shipment" onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Import Shipment
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
                      <Badge className={getStatusColor(shipment.status)} data-testid={`badge-status-${shipment.id}`}>
                        {shipment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-customer-${shipment.id}`}>
                      {getCustomerName(shipment.importCustomerId)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenNotes(shipment)}
                      data-testid={`button-notes-${shipment.id}`}
                      title={shipment.additionalNotes || "Additional Notes"}
                    >
                      <StickyNote className={`h-4 w-4 ${shipment.additionalNotes ? 'text-yellow-600 dark:text-yellow-400' : ''}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleStatus(shipment.status, shipment.id)}
                      data-testid={`button-toggle-status-${shipment.id}`}
                      title="Toggle status"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(shipment)}
                      data-testid={`button-edit-${shipment.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(shipment.id)}
                      data-testid={`button-delete-${shipment.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  {shipment.trailerOrContainerNumber && (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-lg" data-testid={`text-truck-container-${shipment.id}`}>
                        {shipment.trailerOrContainerNumber}
                        {shipment.containerShipment === "Container Shipment" && shipment.shippingLine && ` / ${shipment.shippingLine}`}
                      </p>
                      <p className="font-semibold text-lg" data-testid={`text-eta-port-${shipment.id}`}>
                        <span>ETA Port:</span>{' '}
                        {formatDate(shipment.importDateEtaPort) || (
                          <span className="text-red-700 dark:text-red-600">TBA</span>
                        )}
                      </p>
                    </div>
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
                        <span className="text-red-700 dark:text-red-600">TBA</span>
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
                      <p className={`text-xs ${getClearanceStatusColor(shipment.clearanceStatusIndicator)} font-medium`} data-testid={`text-rs-to-clear-${shipment.id}`}>
                        Advise Clearance to Agent
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleClearanceStatusUpdate(shipment.id, 1)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.clearanceStatusIndicator === 1 || shipment.clearanceStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover-elevate'
                          }`}
                          data-testid={`button-status-yellow-${shipment.id}`}
                          title="Yellow Status"
                        />
                        <button
                          onClick={() => handleClearanceStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.clearanceStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover-elevate'
                          }`}
                          data-testid={`button-status-green-${shipment.id}`}
                          title="Green Status"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className={`text-xs font-medium ${getDeliveryBookedStatusColor(shipment.deliveryBookedStatusIndicator)}`} data-testid={`text-delivery-booked-${shipment.id}`}>
                        Book Delivery Customer
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeliveryBookedStatusUpdate(shipment.id, 2)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.deliveryBookedStatusIndicator === 2 || shipment.deliveryBookedStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover-elevate'
                          }`}
                          data-testid={`button-delivery-status-yellow-${shipment.id}`}
                          title="Yellow Status"
                        />
                        <button
                          onClick={() => handleDeliveryBookedStatusUpdate(shipment.id, 1)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.deliveryBookedStatusIndicator === 1
                              ? 'bg-orange-400 border-orange-500 scale-110'
                              : 'bg-orange-200 border-orange-300 hover-elevate'
                          }`}
                          data-testid={`button-delivery-status-orange-${shipment.id}`}
                          title="Orange Status"
                        />
                        <button
                          onClick={() => handleDeliveryBookedStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.deliveryBookedStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover-elevate'
                          }`}
                          data-testid={`button-delivery-status-green-${shipment.id}`}
                          title="Green Status"
                        />
                        <button
                          onClick={() => handleDeliveryBookedStatusUpdate(shipment.id, 4)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.deliveryBookedStatusIndicator === 4
                              ? 'bg-red-400 border-red-500 scale-110'
                              : 'bg-red-200 border-red-300 hover-elevate'
                          }`}
                          data-testid={`button-delivery-status-red-${shipment.id}`}
                          title="Red Status"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className={`text-xs font-medium ${getHaulierBookingStatusColor(shipment.haulierBookingStatusIndicator)}`} data-testid={`text-haulier-booking-${shipment.id}`}>
                        Book Delivery Haulier
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleHaulierBookingStatusUpdate(shipment.id, 2)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.haulierBookingStatusIndicator === 2 || shipment.haulierBookingStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover-elevate'
                          }`}
                          data-testid={`button-haulier-status-yellow-${shipment.id}`}
                          title="Yellow Status"
                        />
                        <button
                          onClick={() => handleHaulierBookingStatusUpdate(shipment.id, 1)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.haulierBookingStatusIndicator === 1
                              ? 'bg-orange-400 border-orange-500 scale-110'
                              : 'bg-orange-200 border-orange-300 hover-elevate'
                          }`}
                          data-testid={`button-haulier-status-orange-${shipment.id}`}
                          title="Orange Status"
                        />
                        <button
                          onClick={() => handleHaulierBookingStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.haulierBookingStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover-elevate'
                          }`}
                          data-testid={`button-haulier-status-green-${shipment.id}`}
                          title="Green Status"
                        />
                        <button
                          onClick={() => handleHaulierBookingStatusUpdate(shipment.id, 4)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.haulierBookingStatusIndicator === 4
                              ? 'bg-red-400 border-red-500 scale-110'
                              : 'bg-red-200 border-red-300 hover-elevate'
                          }`}
                          data-testid={`button-haulier-status-red-${shipment.id}`}
                          title="Red Status"
                        />
                      </div>
                    </div>
                  </div>
                  {shipment.containerShipment === "Container Shipment" && (
                    <div className="mt-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className={`text-xs font-medium ${getContainerReleaseStatusColor(shipment.containerReleaseStatusIndicator)}`} data-testid={`text-container-release-${shipment.id}`}>
                          Release Container to : {shipment.deliveryRelease || "N/A"}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleContainerReleaseStatusUpdate(shipment.id, 2)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.containerReleaseStatusIndicator === 2 || shipment.containerReleaseStatusIndicator === null
                                ? 'bg-yellow-400 border-yellow-500 scale-110'
                                : 'bg-yellow-200 border-yellow-300 hover-elevate'
                            }`}
                            data-testid={`button-container-status-yellow-${shipment.id}`}
                            title="Yellow Status"
                          />
                          <button
                            onClick={() => handleContainerReleaseStatusUpdate(shipment.id, 1)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.containerReleaseStatusIndicator === 1
                                ? 'bg-orange-400 border-orange-500 scale-110'
                                : 'bg-orange-200 border-orange-300 hover-elevate'
                            }`}
                            data-testid={`button-container-status-orange-${shipment.id}`}
                            title="Orange Status"
                          />
                          <button
                            onClick={() => handleContainerReleaseStatusUpdate(shipment.id, 3)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.containerReleaseStatusIndicator === 3
                                ? 'bg-green-400 border-green-500 scale-110'
                                : 'bg-green-200 border-green-300 hover-elevate'
                            }`}
                            data-testid={`button-container-status-green-${shipment.id}`}
                            title="Green Status"
                          />
                          <button
                            onClick={() => handleContainerReleaseStatusUpdate(shipment.id, 4)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.containerReleaseStatusIndicator === 4
                                ? 'bg-red-400 border-red-500 scale-110'
                                : 'bg-red-200 border-red-300 hover-elevate'
                            }`}
                            data-testid={`button-container-status-red-${shipment.id}`}
                            title="Red Status"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className={`text-xs font-medium ${getInvoiceCustomerStatusColor(shipment.invoiceCustomerStatusIndicator)}`} data-testid={`text-invoice-customer-${shipment.id}`}>
                        Invoice Customer
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleInvoiceCustomerStatusUpdate(shipment.id, 2)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.invoiceCustomerStatusIndicator === 2 || shipment.invoiceCustomerStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover-elevate'
                          }`}
                          data-testid={`button-invoice-status-yellow-${shipment.id}`}
                          title="Yellow Status"
                        />
                        <button
                          onClick={() => handleInvoiceCustomerStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.invoiceCustomerStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover-elevate'
                          }`}
                          data-testid={`button-invoice-status-green-${shipment.id}`}
                          title="Green Status"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className={`text-xs font-medium ${getSendPodToCustomerStatusColor(shipment.sendPodToCustomerStatusIndicator)}`} data-testid={`text-send-pod-customer-${shipment.id}`}>
                        Send POD to Customer
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSendPodToCustomerStatusUpdate(shipment.id, 2)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.sendPodToCustomerStatusIndicator === 2 || shipment.sendPodToCustomerStatusIndicator === null
                              ? 'bg-yellow-400 border-yellow-500 scale-110'
                              : 'bg-yellow-200 border-yellow-300 hover-elevate'
                          }`}
                          data-testid={`button-send-pod-status-yellow-${shipment.id}`}
                          title="Yellow Status"
                        />
                        <button
                          onClick={() => handleSendPodToCustomerStatusUpdate(shipment.id, 3)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.sendPodToCustomerStatusIndicator === 3
                              ? 'bg-green-400 border-green-500 scale-110'
                              : 'bg-green-200 border-green-300 hover-elevate'
                          }`}
                          data-testid={`button-send-pod-status-green-${shipment.id}`}
                          title="Green Status"
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
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Documents</p>
                            {attachmentFiles.length > 0 ? (
                              <div className="space-y-0.5">
                                {attachmentFiles.map((filePath, idx) => {
                                  const fileName = filePath.split('/').pop() || filePath
                                  const downloadPath = filePath.startsWith('/') ? filePath : `/objects/${filePath}`
                                  return (
                                    <div key={idx} className="flex items-center gap-1 group">
                                      <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <a
                                        href={downloadPath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline truncate flex-1"
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
                              <p className="text-xs text-muted-foreground italic">None</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">POD</p>
                            {podFiles.length > 0 ? (
                              <div className="space-y-0.5">
                                {podFiles.map((filePath, idx) => {
                                  const fileName = filePath.split('/').pop() || filePath
                                  const downloadPath = filePath.startsWith('/') ? filePath : `/objects/${filePath}`
                                  return (
                                    <div key={idx} className="flex items-center gap-1 group">
                                      <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <a
                                        href={downloadPath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline truncate flex-1"
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
                              <p className="text-xs text-muted-foreground italic">None</p>
                            )}
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingShipment ? "Edit Import Shipment" : "New Import Shipment"}
            </DialogTitle>
          </DialogHeader>
          <ImportShipmentForm
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
            defaultValues={editingShipment ? {
              ...editingShipment,
              importCustomerId: editingShipment.importCustomerId || "",
            } : undefined}
          />
        </DialogContent>
      </Dialog>

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

      <Dialog open={!!notesShipmentId} onOpenChange={(open) => !open && handleCloseNotes()}>
        <DialogContent className="max-w-3xl h-[400px] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Additional Notes</DialogTitle>
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

      <Dialog open={!!viewingShipment} onOpenChange={(open) => !open && setViewingShipment(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
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
                  <DialogTitle className="text-2xl">
                    Import Shipment #{viewingShipment?.jobRef}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Created {viewingShipment?.createdAt}
                  </p>
                </div>
              </div>
              {viewingShipment && (
                <Badge className={getStatusColor(viewingShipment.status)} data-testid="badge-detail-status">
                  {viewingShipment.status}
                </Badge>
              )}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Customer</p>
                      <p className="font-semibold text-base">{getCustomerName(viewingShipment.importCustomerId)}</p>
                    </div>
                    {viewingShipment.customerReferenceNumber && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Customer Reference</p>
                        <p className="text-base">{viewingShipment.customerReferenceNumber}</p>
                      </div>
                    )}
                    {viewingShipment.supplierName && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Supplier Name</p>
                        <p className="text-base">{viewingShipment.supplierName}</p>
                      </div>
                    )}
                  </div>
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
                        <p className="text-xs text-muted-foreground mb-1">Container/Trailer #</p>
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
                    {viewingShipment.approxLoadDate && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Approx Load Date</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{formatDate(viewingShipment.approxLoadDate)}</p>
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
                    {viewingShipment.deliveryTimeNotes && (
                      <div className="col-span-3 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground mb-1">Delivery Time Notes</p>
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.deliveryTimeNotes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

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
                      {viewingShipment.deliveryAddress && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-muted-foreground mb-1">Delivery Address</p>
                          <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.deliveryAddress}</p>
                        </div>
                      )}
                      {viewingShipment.deliveryReference && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-muted-foreground mb-1">Delivery Reference</p>
                          <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.deliveryReference}</p>
                        </div>
                      )}
                      {viewingShipment.haulierName && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-muted-foreground mb-1">Haulier</p>
                          <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.haulierName}</p>
                        </div>
                      )}
                      {viewingShipment.haulierContactName && viewingShipment.haulierContactName.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-xs text-muted-foreground mb-1">Haulier Contact Name</p>
                          <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.haulierContactName.join(", ")}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {viewingShipment.haulierEmail && viewingShipment.haulierEmail.length > 0 && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Hauliers Email</p>
                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.haulierEmail.join(", ")}</p>
                          </div>
                        )}
                        {viewingShipment.haulierTelephone && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground mb-1">Telephone</p>
                            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{viewingShipment.haulierTelephone}</p>
                          </div>
                        )}
                      </div>
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
                    {viewingShipment.clearanceType && (
                      <div className="bg-white dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground mb-1">Clearance Type</p>
                        <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">{viewingShipment.clearanceType}</p>
                      </div>
                    )}
                    {viewingShipment.customsClearanceAgent && (
                      <div className="bg-white dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-muted-foreground mb-1">Customs Agent</p>
                        <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">{viewingShipment.customsClearanceAgent}</p>
                      </div>
                    )}
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
                      <h3 className="font-semibold text-lg text-green-900 dark:text-green-100">R.S. Quotation Out</h3>
                      {viewingShipment.currency && (
                        <Badge variant="outline" className="ml-auto text-xs border-green-300 dark:border-green-700">
                          {formatCurrency(viewingShipment.currency)}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {viewingShipment.freightRateOut && (
                        <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-xs text-muted-foreground mb-1">Freight Rate</p>
                          <p className="font-semibold text-sm text-green-900 dark:text-green-100">{formatCurrency(viewingShipment.currency)}{viewingShipment.freightRateOut}</p>
                        </div>
                      )}
                      {viewingShipment.rsToClear && viewingShipment.clearanceCharge && (
                        <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-xs text-muted-foreground mb-1">Import Clearance</p>
                          <p className="font-semibold text-sm text-green-900 dark:text-green-100">{formatCurrency(viewingShipment.currency)}{viewingShipment.clearanceCharge}</p>
                        </div>
                      )}
                      {viewingShipment.exportCustomsClearanceCharge && (
                        <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800 col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Export Customs Clearance</p>
                          <p className="font-semibold text-sm text-green-900 dark:text-green-100">{formatCurrency(viewingShipment.currency)}{viewingShipment.exportCustomsClearanceCharge}</p>
                        </div>
                      )}
                      {viewingShipment.additionalCommodityCodeCharge && (
                        <div className="bg-white dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800 col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Commodity Code Charge</p>
                          <p className="font-semibold text-sm text-green-900 dark:text-green-100">{formatCurrency(viewingShipment.currency)}{viewingShipment.additionalCommodityCodeCharge}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <PoundSterling className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      <h3 className="font-semibold text-lg text-orange-900 dark:text-orange-100">Haulier Quotation In</h3>
                      {viewingShipment.currencyIn && (
                        <Badge variant="outline" className="ml-auto text-xs border-orange-300 dark:border-orange-700">
                          {formatCurrency(viewingShipment.currencyIn)}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {viewingShipment.haulierFreightRateIn && (
                        <div className="bg-white dark:bg-orange-950/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                          <p className="text-xs text-muted-foreground mb-1">Haulier Freight Rate</p>
                          <p className="font-semibold text-sm text-orange-900 dark:text-orange-100">{formatCurrency(viewingShipment.currencyIn)}{viewingShipment.haulierFreightRateIn}</p>
                        </div>
                      )}
                      {viewingShipment.exportClearanceChargeIn && (
                        <div className="bg-white dark:bg-orange-950/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                          <p className="text-xs text-muted-foreground mb-1">Export Clearance Charge</p>
                          <p className="font-semibold text-sm text-orange-900 dark:text-orange-100">{formatCurrency(viewingShipment.currencyIn)}{viewingShipment.exportClearanceChargeIn}</p>
                        </div>
                      )}
                      {viewingShipment.destinationClearanceCostIn && (
                        <div className="bg-white dark:bg-orange-950/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                          <p className="text-xs text-muted-foreground mb-1">Destination Clearance Cost</p>
                          <p className="font-semibold text-sm text-orange-900 dark:text-orange-100">{formatCurrency(viewingShipment.currencyIn)}{viewingShipment.destinationClearanceCostIn}</p>
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
                    <div className="bg-white dark:bg-yellow-950/30 p-4 rounded-lg">
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
                                  const downloadPath = filePath.startsWith('/') ? filePath : `/objects/${filePath}`
                                  return (
                                    <a
                                      key={idx}
                                      href={downloadPath}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors group"
                                      title={fileName}
                                    >
                                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                      </div>
                                      <span className="text-sm truncate flex-1 group-hover:text-primary">
                                        {fileName}
                                      </span>
                                    </a>
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
                                  const downloadPath = filePath.startsWith('/') ? filePath : `/objects/${filePath}`
                                  return (
                                    <a
                                      key={idx}
                                      href={downloadPath}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors group"
                                      title={fileName}
                                    >
                                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-md">
                                        <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                                      </div>
                                      <span className="text-sm truncate flex-1 group-hover:text-primary">
                                        {fileName}
                                      </span>
                                    </a>
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
    </div>
  )
}
