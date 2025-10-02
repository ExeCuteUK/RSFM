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
import { Plus, Pencil, Trash2, Package, RefreshCw, Paperclip, StickyNote, X, FileText, Truck, Container, Plane } from "lucide-react"
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
                      <h3 className="font-semibold text-lg" data-testid={`text-job-ref-${shipment.id}`}>
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
                    <p data-testid={`text-truck-container-${shipment.id}`}>
                      {shipment.trailerOrContainerNumber}
                      {shipment.containerShipment === "Container Shipment" && shipment.shippingLine && ` / ${shipment.shippingLine}`}
                    </p>
                  )}
                  {shipment.containerShipment === "Container Shipment" && shipment.vesselName && (
                    <p data-testid={`text-vessel-name-${shipment.id}`}>
                      {shipment.vesselName}
                    </p>
                  )}
                  {shipment.portOfArrival && (
                    <p data-testid={`text-port-${shipment.id}`}>
                      <span>Port Of Arrival:</span> {shipment.portOfArrival}
                    </p>
                  )}
                  <p data-testid={`text-eta-port-${shipment.id}`}>
                    <span>ETA Port:</span>{' '}
                    {formatDate(shipment.importDateEtaPort) || (
                      <span className="text-red-700 dark:text-red-600">TBA</span>
                    )}
                  </p>
                  <p data-testid={`text-delivery-date-${shipment.id}`}>
                    <span>Delivery Date:</span>{' '}
                    {formatDate(shipment.deliveryDate) || (
                      <span className="text-red-700 dark:text-red-600">TBA</span>
                    )}
                  </p>
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
                  {shipment.rsToClear && (
                    <div className="pt-2 mt-2 border-t">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className={`text-xs ${getClearanceStatusColor(shipment.clearanceStatusIndicator)} font-medium`} data-testid={`text-rs-to-clear-${shipment.id}`}>
                          Advise Clearance to Agent
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleClearanceStatusUpdate(shipment.id, 1)}
                            className={`h-5 w-5 rounded border-2 transition-all ${
                              shipment.clearanceStatusIndicator === 1
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
                  )}
                  <div className={shipment.rsToClear ? "mt-1" : "pt-2 mt-2 border-t"}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className={`text-xs font-medium ${getDeliveryBookedStatusColor(shipment.deliveryBookedStatusIndicator)}`} data-testid={`text-delivery-booked-${shipment.id}`}>
                        Book Delivery Customer
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeliveryBookedStatusUpdate(shipment.id, 2)}
                          className={`h-5 w-5 rounded border-2 transition-all ${
                            shipment.deliveryBookedStatusIndicator === 2
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
                            shipment.haulierBookingStatusIndicator === 2
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
                              shipment.containerReleaseStatusIndicator === 2
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
                            shipment.invoiceCustomerStatusIndicator === 2
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
                  {(() => {
                    const attachmentFiles = parseAttachments(shipment.attachments)
                    const podFiles = parseAttachments(shipment.proofOfDelivery)
                    if (attachmentFiles.length > 0 || podFiles.length > 0) {
                      return (
                        <div className="mt-2 pt-2 border-t">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Documents</p>
                              {attachmentFiles.length > 0 ? (
                                <div className="space-y-0.5">
                                  {attachmentFiles.map((filePath, idx) => {
                                    const fileName = filePath.split('/').pop() || filePath
                                    return (
                                      <div key={idx} className="flex items-center gap-1">
                                        <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        <a
                                          href={`/objects/${filePath}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary hover:underline truncate"
                                          title={fileName}
                                        >
                                          {fileName}
                                        </a>
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
                                    return (
                                      <div key={idx} className="flex items-center gap-1">
                                        <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        <a
                                          href={`/objects/${filePath}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary hover:underline truncate"
                                          title={fileName}
                                        >
                                          {fileName}
                                        </a>
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
                    }
                    return null
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
