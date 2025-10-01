import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Plus, Pencil, Trash2 } from "lucide-react"
import { ImportCustomerForm } from "@/components/import-customer-form"
import { ExportCustomerForm } from "@/components/export-customer-form"
import { ExportReceiverForm } from "@/components/export-receiver-form"
import type { ImportCustomer, ExportCustomer, ExportReceiver, InsertImportCustomer, InsertExportCustomer, InsertExportReceiver } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"

type CustomerType = "import" | "export" | "receiver"

export default function Customers() {
  const [selectedTab, setSelectedTab] = useState<CustomerType>("import")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<ImportCustomer | ExportCustomer | ExportReceiver | null>(null)
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null)
  const { toast } = useToast()

  // Helper to determine customer type from entity properties
  const getCustomerType = (customer: ImportCustomer | ExportCustomer | ExportReceiver | null): CustomerType => {
    if (!customer) return selectedTab
    if ('rsProcessCustomsClearance' in customer) return "import"
    if ('contactName' in customer && customer.contactName !== undefined) return "export"
    return "receiver"
  }

  // Queries
  const { data: importCustomers = [], isLoading: isLoadingImport } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })

  const { data: exportCustomers = [], isLoading: isLoadingExport } = useQuery<ExportCustomer[]>({
    queryKey: ["/api/export-customers"],
  })

  const { data: exportReceivers = [], isLoading: isLoadingReceivers } = useQuery<ExportReceiver[]>({
    queryKey: ["/api/export-receivers"],
  })

  // Mutations
  const createImportCustomer = useMutation({
    mutationFn: async (data: InsertImportCustomer) => {
      return apiRequest("POST", "/api/import-customers", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-customers"] })
      setIsFormOpen(false)
      setEditingCustomer(null)
      toast({ title: "Import customer created successfully" })
    },
  })

  const createExportCustomer = useMutation({
    mutationFn: async (data: InsertExportCustomer) => {
      return apiRequest("POST", "/api/export-customers", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-customers"] })
      setIsFormOpen(false)
      setEditingCustomer(null)
      toast({ title: "Export customer created successfully" })
    },
  })

  const createExportReceiver = useMutation({
    mutationFn: async (data: InsertExportReceiver) => {
      return apiRequest("POST", "/api/export-receivers", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-receivers"] })
      setIsFormOpen(false)
      setEditingCustomer(null)
      toast({ title: "Export receiver created successfully" })
    },
  })

  const updateImportCustomer = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertImportCustomer }) => {
      return apiRequest("PATCH", `/api/import-customers/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-customers"] })
      setIsFormOpen(false)
      setEditingCustomer(null)
      toast({ title: "Import customer updated successfully" })
    },
  })

  const updateExportCustomer = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertExportCustomer }) => {
      return apiRequest("PATCH", `/api/export-customers/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-customers"] })
      setIsFormOpen(false)
      setEditingCustomer(null)
      toast({ title: "Export customer updated successfully" })
    },
  })

  const updateExportReceiver = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertExportReceiver }) => {
      return apiRequest("PATCH", `/api/export-receivers/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-receivers"] })
      setIsFormOpen(false)
      setEditingCustomer(null)
      toast({ title: "Export receiver updated successfully" })
    },
  })

  const deleteImportCustomer = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/import-customers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-customers"] })
      toast({ title: "Import customer deleted successfully" })
    },
  })

  const deleteExportCustomer = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/export-customers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-customers"] })
      toast({ title: "Export customer deleted successfully" })
    },
  })

  const deleteExportReceiver = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/export-receivers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export-receivers"] })
      toast({ title: "Export receiver deleted successfully" })
    },
  })

  const handleCreateNew = () => {
    setEditingCustomer(null)
    setIsFormOpen(true)
  }

  const handleEdit = (customer: ImportCustomer | ExportCustomer | ExportReceiver) => {
    setEditingCustomer(customer)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeletingCustomerId(id)
  }

  const confirmDelete = () => {
    if (!deletingCustomerId) return
    
    if (selectedTab === "import") {
      deleteImportCustomer.mutate(deletingCustomerId)
    } else if (selectedTab === "export") {
      deleteExportCustomer.mutate(deletingCustomerId)
    } else {
      deleteExportReceiver.mutate(deletingCustomerId)
    }
    setDeletingCustomerId(null)
  }

  const handleFormSubmit = (data: InsertImportCustomer | InsertExportCustomer | InsertExportReceiver) => {
    if (editingCustomer) {
      // Determine type from editingCustomer properties rather than selectedTab
      if ('rsProcessCustomsClearance' in editingCustomer) {
        // Import customer has unique import-specific fields
        updateImportCustomer.mutate({ id: editingCustomer.id, data: data as InsertImportCustomer })
      } else if ('contactName' in editingCustomer && editingCustomer.contactName !== undefined) {
        // Export customer has contactName, receiver doesn't
        updateExportCustomer.mutate({ id: editingCustomer.id, data: data as InsertExportCustomer })
      } else {
        // Export receiver
        updateExportReceiver.mutate({ id: editingCustomer.id, data: data as InsertExportReceiver })
      }
    } else {
      if (selectedTab === "import") {
        createImportCustomer.mutate(data as InsertImportCustomer)
      } else if (selectedTab === "export") {
        createExportCustomer.mutate(data as InsertExportCustomer)
      } else {
        createExportReceiver.mutate(data as InsertExportReceiver)
      }
    }
  }

  const isLoading = isLoadingImport || isLoadingExport || isLoadingReceivers

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Customers</h1>
          <p className="text-muted-foreground">
            Manage import customers, export customers, and export receivers
          </p>
        </div>
        <Button data-testid="button-new-customer" onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New {selectedTab === "import" ? "Import Customer" : selectedTab === "export" ? "Export Customer" : "Receiver"}
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as CustomerType)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="import" data-testid="tab-import-customers">Import Customers</TabsTrigger>
          <TabsTrigger value="export" data-testid="tab-export-customers">Export Customers</TabsTrigger>
          <TabsTrigger value="receiver" data-testid="tab-export-receivers">Export Receivers</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : importCustomers.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <p className="text-lg text-muted-foreground">No import customers yet</p>
              <Button variant="outline" className="mt-4" onClick={handleCreateNew} data-testid="button-create-first">
                Create your first import customer
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {importCustomers.map((customer) => (
                <Card key={customer.id} data-testid={`card-customer-${customer.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg" data-testid={`text-company-name-${customer.id}`}>{customer.companyName}</h3>
                        {customer.contactName && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-contact-name-${customer.id}`}>{customer.contactName}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(customer)}
                          data-testid={`button-edit-${customer.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(customer.id)}
                          data-testid={`button-delete-${customer.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      {customer.email && <p data-testid={`text-email-${customer.id}`}>{customer.email}</p>}
                      {customer.telephone && <p data-testid={`text-telephone-${customer.id}`}>{customer.telephone}</p>}
                      {customer.addressLine1 && (
                        <p className="text-muted-foreground" data-testid={`text-address-${customer.id}`}>
                          {[customer.addressLine1, customer.town, customer.postcode].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : exportCustomers.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <p className="text-lg text-muted-foreground">No export customers yet</p>
              <Button variant="outline" className="mt-4" onClick={handleCreateNew} data-testid="button-create-first">
                Create your first export customer
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {exportCustomers.map((customer) => (
                <Card key={customer.id} data-testid={`card-customer-${customer.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg" data-testid={`text-company-name-${customer.id}`}>{customer.companyName}</h3>
                        {customer.contactName && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-contact-name-${customer.id}`}>{customer.contactName}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(customer)}
                          data-testid={`button-edit-${customer.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(customer.id)}
                          data-testid={`button-delete-${customer.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      {customer.email && <p data-testid={`text-email-${customer.id}`}>{customer.email}</p>}
                      {customer.telephone && <p data-testid={`text-telephone-${customer.id}`}>{customer.telephone}</p>}
                      {customer.addressLine1 && (
                        <p className="text-muted-foreground" data-testid={`text-address-${customer.id}`}>
                          {[customer.addressLine1, customer.town, customer.postcode].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="receiver" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : exportReceivers.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <p className="text-lg text-muted-foreground">No export receivers yet</p>
              <Button variant="outline" className="mt-4" onClick={handleCreateNew} data-testid="button-create-first">
                Create your first export receiver
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {exportReceivers.map((receiver) => (
                <Card key={receiver.id} data-testid={`card-receiver-${receiver.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg" data-testid={`text-company-name-${receiver.id}`}>{receiver.companyName}</h3>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(receiver)}
                          data-testid={`button-edit-${receiver.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(receiver.id)}
                          data-testid={`button-delete-${receiver.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      {receiver.addressLine1 && (
                        <p className="text-muted-foreground" data-testid={`text-address-${receiver.id}`}>
                          {[receiver.addressLine1, receiver.town, receiver.postcode].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit" : "Create New"}{" "}
              {(() => {
                const formType = getCustomerType(editingCustomer)
                return formType === "import" ? "Import Customer" : formType === "export" ? "Export Customer" : "Export Receiver"
              })()}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const formType = getCustomerType(editingCustomer)
            if (formType === "import") {
              return (
                <ImportCustomerForm
                  onSubmit={handleFormSubmit}
                  onCancel={() => setIsFormOpen(false)}
                  defaultValues={editingCustomer as ImportCustomer}
                />
              )
            } else if (formType === "export") {
              return (
                <ExportCustomerForm
                  onSubmit={handleFormSubmit}
                  onCancel={() => setIsFormOpen(false)}
                  defaultValues={editingCustomer as ExportCustomer}
                />
              )
            } else {
              return (
                <ExportReceiverForm
                  onSubmit={handleFormSubmit}
                  onCancel={() => setIsFormOpen(false)}
                  defaultValues={editingCustomer as ExportReceiver}
                />
              )
            }
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCustomerId} onOpenChange={(open) => !open && setDeletingCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {selectedTab === "import" ? "import customer" : selectedTab === "export" ? "export customer" : "export receiver"}.
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