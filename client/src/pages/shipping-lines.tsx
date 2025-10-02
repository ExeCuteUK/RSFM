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
import { Plus, Pencil, Trash2, Ship, Mail, Phone, MapPin } from "lucide-react"
import { ShippingLineForm } from "@/components/shipping-line-form"
import type { ShippingLine, InsertShippingLine } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"

export default function ShippingLines() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingShippingLine, setEditingShippingLine] = useState<ShippingLine | null>(null)
  const [deletingShippingLineId, setDeletingShippingLineId] = useState<string | null>(null)
  const { toast } = useToast()

  const { data: shippingLines = [], isLoading } = useQuery<ShippingLine[]>({
    queryKey: ["/api/shipping-lines"],
  })

  const createShippingLine = useMutation({
    mutationFn: async (data: InsertShippingLine) => {
      return apiRequest("POST", "/api/shipping-lines", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-lines"] })
      setIsFormOpen(false)
      setEditingShippingLine(null)
      toast({ title: "Shipping line created successfully" })
    },
  })

  const updateShippingLine = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertShippingLine }) => {
      return apiRequest("PATCH", `/api/shipping-lines/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-lines"] })
      setIsFormOpen(false)
      setEditingShippingLine(null)
      toast({ title: "Shipping line updated successfully" })
    },
  })

  const deleteShippingLine = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/shipping-lines/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-lines"] })
      toast({ title: "Shipping line deleted successfully" })
    },
  })

  const handleCreateNew = () => {
    setEditingShippingLine(null)
    setIsFormOpen(true)
  }

  const handleEdit = (shippingLine: ShippingLine) => {
    setEditingShippingLine(shippingLine)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeletingShippingLineId(id)
  }

  const confirmDelete = () => {
    if (!deletingShippingLineId) return
    deleteShippingLine.mutate(deletingShippingLineId)
    setDeletingShippingLineId(null)
  }

  const handleFormSubmit = (data: InsertShippingLine) => {
    if (editingShippingLine) {
      updateShippingLine.mutate({ id: editingShippingLine.id, data })
    } else {
      createShippingLine.mutate(data)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Shipping Lines</h1>
            <p className="text-muted-foreground">
              Manage shipping line contacts and information
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Shipping Lines</h1>
          <p className="text-muted-foreground">
            Manage shipping line contacts and information
          </p>
        </div>
        <Button data-testid="button-new-shipping-line" onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Shipping Line
        </Button>
      </div>

      {shippingLines.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ship className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No shipping lines found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first shipping line contact
            </p>
            <Button onClick={handleCreateNew} data-testid="button-create-first-shipping-line">
              <Plus className="h-4 w-4 mr-2" />
              Create Shipping Line
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shippingLines.map((shippingLine) => (
            <Card 
              key={shippingLine.id} 
              className="bg-orange-50/50 dark:bg-orange-950/20 hover-elevate"
              data-testid={`card-shipping-line-${shippingLine.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Ship className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg" data-testid={`text-shipping-line-name-${shippingLine.id}`}>
                        {shippingLine.shippingLineName}
                      </h3>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(shippingLine)}
                      data-testid={`button-edit-${shippingLine.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(shippingLine.id)}
                      data-testid={`button-delete-${shippingLine.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  {shippingLine.shippingLineAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground" data-testid={`text-address-${shippingLine.id}`}>
                        {shippingLine.shippingLineAddress}
                      </span>
                    </div>
                  )}
                  
                  {shippingLine.telephone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                      <span className="text-muted-foreground" data-testid={`text-telephone-${shippingLine.id}`}>
                        {shippingLine.telephone}
                      </span>
                    </div>
                  )}

                  {shippingLine.importEmail && shippingLine.importEmail.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                        <span className="font-medium text-orange-600 dark:text-orange-400">Import:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 ml-6" data-testid={`list-import-emails-${shippingLine.id}`}>
                        {shippingLine.importEmail.map((email, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {shippingLine.exportEmail && shippingLine.exportEmail.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                        <span className="font-medium text-orange-600 dark:text-orange-400">Export:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 ml-6" data-testid={`list-export-emails-${shippingLine.id}`}>
                        {shippingLine.exportEmail.map((email, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {shippingLine.releasesEmail && shippingLine.releasesEmail.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                        <span className="font-medium text-orange-600 dark:text-orange-400">Releases:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 ml-6" data-testid={`list-releases-emails-${shippingLine.id}`}>
                        {shippingLine.releasesEmail.map((email, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {shippingLine.accountingEmail && shippingLine.accountingEmail.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                        <span className="font-medium text-orange-600 dark:text-orange-400">Accounting:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 ml-6" data-testid={`list-accounting-emails-${shippingLine.id}`}>
                        {shippingLine.accountingEmail.map((email, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
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
            <DialogTitle data-testid="text-dialog-title">
              {editingShippingLine ? "Edit Shipping Line" : "New Shipping Line"}
            </DialogTitle>
          </DialogHeader>
          <ShippingLineForm
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsFormOpen(false)
              setEditingShippingLine(null)
            }}
            defaultValues={editingShippingLine || undefined}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingShippingLineId} onOpenChange={() => setDeletingShippingLineId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this shipping line. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
