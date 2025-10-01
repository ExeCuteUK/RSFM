import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Truck } from "lucide-react"
import { ExportShipmentForm } from "@/components/export-shipment-form"
import type { ExportShipment, InsertExportShipment, ExportReceiver, ExportCustomer } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"

export default function ExportShipments() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingShipment, setEditingShipment] = useState<ExportShipment | null>(null)
  const { toast } = useToast()

  const { data: shipments = [], isLoading } = useQuery<ExportShipment[]>({
    queryKey: ["/api/export-shipments"],
  })

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
      toast({ title: "Export shipment deleted successfully" })
    },
  })

  const handleCreateNew = () => {
    setEditingShipment(null)
    setIsFormOpen(true)
  }

  const handleEdit = (shipment: ExportShipment) => {
    setEditingShipment(shipment)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteShipment.mutate(id)
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
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-receiver-${shipment.id}`}>
                      {getReceiverName(shipment.receiverId)}
                    </p>
                  </div>
                  <div className="flex gap-1">
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
                  {shipment.description && (
                    <p className="text-muted-foreground line-clamp-2" data-testid={`text-description-${shipment.id}`}>
                      {shipment.description}
                    </p>
                  )}
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
    </div>
  )
}
