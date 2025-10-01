import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Plus, Pencil, Trash2, Package, RefreshCw, Paperclip } from "lucide-react"
import { ImportShipmentForm } from "@/components/import-shipment-form"
import type { ImportShipment, InsertImportShipment, ImportCustomer } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"

export default function ImportShipments() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingShipment, setEditingShipment] = useState<ImportShipment | null>(null)
  const [deletingShipmentId, setDeletingShipmentId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
      case "In Transit": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
      case "Delivered": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"
    }
  }

  const parseAttachments = (attachments: string | null) => {
    if (!attachments) return []
    try {
      return JSON.parse(attachments)
    } catch {
      return []
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
                      <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-lg" data-testid={`text-job-ref-${shipment.id}`}>
                        #{shipment.jobRef}
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
                <div className="space-y-1 text-sm">
                  {shipment.trailerOrContainerNumber && (
                    <p data-testid={`text-truck-container-${shipment.id}`}>
                      {shipment.trailerOrContainerNumber}
                    </p>
                  )}
                  {shipment.portOfArrival && (
                    <p data-testid={`text-port-${shipment.id}`}>
                      <span className="font-medium">Port Of Arrival:</span> {shipment.portOfArrival}
                    </p>
                  )}
                  <p data-testid={`text-eta-port-${shipment.id}`}>
                    <span className="font-medium">ETA Port:</span>{' '}
                    {formatDate(shipment.importDateEtaPort) || (
                      <span className="text-red-700 dark:text-red-600">TBA</span>
                    )}
                  </p>
                  <p data-testid={`text-delivery-date-${shipment.id}`}>
                    <span className="font-medium">Delivery Date:</span>{' '}
                    {formatDate(shipment.deliveryDate) || (
                      <span className="text-red-700 dark:text-red-600">TBA</span>
                    )}
                  </p>
                  <div className="pt-2 mt-2 border-t">
                    {shipment.goodsDescription && (
                      <p className="text-muted-foreground line-clamp-2" data-testid={`text-description-${shipment.id}`}>
                        {shipment.goodsDescription}
                      </p>
                    )}
                    {(shipment.weight || (shipment.numberOfPieces && shipment.packaging)) && (
                      <p className="text-muted-foreground" data-testid={`text-weight-pieces-${shipment.id}`}>
                        {shipment.weight && <>Weight: {shipment.weight}</>}
                        {shipment.weight && shipment.numberOfPieces && shipment.packaging && ', '}
                        {shipment.numberOfPieces && shipment.packaging && `${shipment.numberOfPieces} ${shipment.packaging}`}
                      </p>
                    )}
                    {shipment.containerShipment && (
                      <p className="underline" data-testid={`text-container-shipment-${shipment.id}`}>
                        Container Shipment
                      </p>
                    )}
                  </div>
                  {shipment.rsToClear && (
                    <p className="text-blue-600 dark:text-blue-400 font-medium" data-testid={`text-rs-to-clear-${shipment.id}`}>
                      R.S Processing Import Clearance
                    </p>
                  )}
                  {(() => {
                    const files = parseAttachments(shipment.attachments)
                    if (files.length > 0) {
                      return (
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t" data-testid={`attachments-${shipment.id}`}>
                          <Paperclip className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {files.length} {files.length === 1 ? 'file' : 'files'} attached
                          </span>
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
            defaultValues={editingShipment || undefined}
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
    </div>
  )
}
