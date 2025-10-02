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
import { Plus, Pencil, Trash2, Truck, RefreshCw, Paperclip, StickyNote, X } from "lucide-react"
import { ExportShipmentForm } from "@/components/export-shipment-form"
import type { ExportShipment, InsertExportShipment, ExportReceiver, ExportCustomer } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"

export default function ExportShipments() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingShipment, setEditingShipment] = useState<ExportShipment | null>(null)
  const [deletingShipmentId, setDeletingShipmentId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [notesShipmentId, setNotesShipmentId] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState("")
  const { toast } = useToast()

  const { data: allShipments = [], isLoading } = useQuery<ExportShipment[]>({
    queryKey: ["/api/export-shipments"],
  })

  const shipments = statusFilter === "ALL" 
    ? allShipments 
    : allShipments.filter(s => s.status === statusFilter)

  const { data: exportReceivers = [] } = useQuery<ExportReceiver[]>({
    queryKey: ["/api/export-receivers"],
  })

  const { data: exportCustomers = [] } = useQuery<ExportCustomer[]>({
    queryKey: ["/api/export-customers"],
  })

  const createShipment = useMutation({
    mutationFn: async (data: InsertExportShipment) => {
      return apiRequest("POST", "/api/export-shipments", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      setIsFormOpen(false)
      setEditingShipment(null)
      toast({ title: "Export shipment created successfully" })
    },
  })

  const updateShipment = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertExportShipment }) => {
      return apiRequest("PATCH", `/api/export-shipments/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      setIsFormOpen(false)
      setEditingShipment(null)
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
    setEditingShipment(null)
    setIsFormOpen(true)
  }

  const handleEdit = (shipment: ExportShipment) => {
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

  const handleFormSubmit = (data: InsertExportShipment) => {
    if (editingShipment) {
      updateShipment.mutate({ id: editingShipment.id, data })
    } else {
      createShipment.mutate(data)
    }
  }

  const getReceiverName = (receiverId: string | null) => {
    if (!receiverId) return "N/A"
    const receiver = exportReceivers.find(r => r.id === receiverId)
    return receiver?.companyName || "N/A"
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Export Shipments</h1>
          <p className="text-muted-foreground">
            Manage outgoing shipments and export clearances
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
            New Export Shipment
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
                        #{shipment.jobRef}
                      </h3>
                      <Badge className={getStatusColor(shipment.status)} data-testid={`badge-status-${shipment.id}`}>
                        {shipment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-receiver-${shipment.id}`}>
                      {getReceiverName(shipment.receiverId)}
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
                <div className="space-y-1 text-sm">
                  {shipment.loadDate && (
                    <p data-testid={`text-date-${shipment.id}`}>
                      <span className="font-medium">Load Date:</span> {shipment.loadDate}
                    </p>
                  )}
                  {shipment.incoterms && (
                    <p data-testid={`text-incoterms-${shipment.id}`}>
                      <span className="font-medium">Incoterms:</span> {shipment.incoterms}
                    </p>
                  )}
                  {shipment.goodsDescription && (
                    <p className="text-muted-foreground line-clamp-2" data-testid={`text-description-${shipment.id}`}>
                      {shipment.goodsDescription}
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
              {editingShipment ? "Edit Export Shipment" : "New Export Shipment"}
            </DialogTitle>
          </DialogHeader>
          <ExportShipmentForm
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
