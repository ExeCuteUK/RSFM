import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, FileCheck, Paperclip } from "lucide-react"
import { CustomClearanceForm } from "@/components/custom-clearance-form"
import type { CustomClearance, InsertCustomClearance, ImportCustomer, ExportReceiver } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"

export default function CustomClearances() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingClearance, setEditingClearance] = useState<CustomClearance | null>(null)
  const { toast } = useToast()

  const { data: clearances = [], isLoading } = useQuery<CustomClearance[]>({
    queryKey: ["/api/custom-clearances"],
  })

  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })

  const { data: exportReceivers = [] } = useQuery<ExportReceiver[]>({
    queryKey: ["/api/export-receivers"],
  })

  const createClearance = useMutation({
    mutationFn: async (data: InsertCustomClearance) => {
      return apiRequest("POST", "/api/custom-clearances", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      setIsFormOpen(false)
      setEditingClearance(null)
      toast({ title: "Custom clearance created successfully" })
    },
  })

  const updateClearance = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertCustomClearance }) => {
      return apiRequest("PATCH", `/api/custom-clearances/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      setIsFormOpen(false)
      setEditingClearance(null)
      toast({ title: "Custom clearance updated successfully" })
    },
  })

  const deleteClearance = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/custom-clearances/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      toast({ title: "Custom clearance deleted successfully" })
    },
  })

  const handleCreateNew = () => {
    setEditingClearance(null)
    setIsFormOpen(true)
  }

  const handleEdit = (clearance: CustomClearance) => {
    setEditingClearance(clearance)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteClearance.mutate(id)
  }

  const handleFormSubmit = (data: InsertCustomClearance) => {
    if (editingClearance) {
      updateClearance.mutate({ id: editingClearance.id, data })
    } else {
      createClearance.mutate(data)
    }
  }

  const getCustomerName = (clearance: CustomClearance) => {
    if (clearance.jobType === "import" && clearance.importCustomerId) {
      const customer = importCustomers.find(c => c.id === clearance.importCustomerId)
      return customer?.companyName || "N/A"
    } else if (clearance.jobType === "export" && clearance.receiverId) {
      const receiver = exportReceivers.find(r => r.id === clearance.receiverId)
      return receiver?.companyName || "N/A"
    }
    return "N/A"
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
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Custom Clearances</h1>
          <p className="text-muted-foreground">
            Manage customs clearance operations for import and export shipments
          </p>
        </div>
        <Button data-testid="button-new-clearance" onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Customs Clearance
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : clearances.length === 0 ? (
        <div className="text-center py-12" data-testid="empty-state">
          <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No custom clearances yet</p>
          <Button variant="outline" className="mt-4" onClick={handleCreateNew} data-testid="button-create-first">
            Create your first custom clearance
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clearances.map((clearance) => (
            <Card key={clearance.id} data-testid={`card-clearance-${clearance.id}`} className="bg-purple-50/50 dark:bg-purple-950/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <h3 className="font-semibold text-lg" data-testid={`text-job-ref-${clearance.id}`}>
                        #{clearance.jobRef}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                        {clearance.jobType}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-customer-${clearance.id}`}>
                      {getCustomerName(clearance)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(clearance)}
                      data-testid={`button-edit-${clearance.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(clearance.id)}
                      data-testid={`button-delete-${clearance.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {clearance.portOfArrival && (
                    <p data-testid={`text-port-${clearance.id}`}>
                      <span className="font-medium">Port:</span> {clearance.portOfArrival}
                    </p>
                  )}
                  {clearance.importDateEtaPort && (
                    <p data-testid={`text-date-${clearance.id}`}>
                      <span className="font-medium">ETA:</span> {clearance.importDateEtaPort}
                    </p>
                  )}
                  {clearance.goodsDescription && (
                    <p className="text-muted-foreground line-clamp-2" data-testid={`text-description-${clearance.id}`}>
                      {clearance.goodsDescription}
                    </p>
                  )}
                  {(() => {
                    const files = parseAttachments(clearance.attachments)
                    if (files.length > 0) {
                      return (
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t" data-testid={`attachments-${clearance.id}`}>
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
              {editingClearance ? "Edit Custom Clearance" : "New Custom Clearance"}
            </DialogTitle>
          </DialogHeader>
          <CustomClearanceForm
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
            defaultValues={editingClearance || undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
