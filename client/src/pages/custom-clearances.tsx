import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
import { Plus, Pencil, Trash2, FileCheck, Paperclip, Search, StickyNote, FileText, ListTodo } from "lucide-react"
import { CustomClearanceForm } from "@/components/custom-clearance-form"
import type { CustomClearance, InsertCustomClearance, ImportCustomer, ExportReceiver } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"

export default function CustomClearances() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingClearance, setEditingClearance] = useState<CustomClearance | null>(null)
  const [deletingClearanceId, setDeletingClearanceId] = useState<string | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["Awaiting Entry", "Waiting Arrival", "P.H Hold", "Customs Issue"])
  const [searchText, setSearchText] = useState("")
  const { toast } = useToast()
  const [location] = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const searchParam = params.get('search')
    if (searchParam) {
      setSearchText(searchParam)
      setSelectedStatuses([])
    }
  }, [location])

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
    setDeletingClearanceId(id)
  }

  const confirmDelete = () => {
    if (!deletingClearanceId) return
    deleteClearance.mutate(deletingClearanceId)
    setDeletingClearanceId(null)
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

  const parseAttachments = (attachments: string[] | null) => {
    if (!attachments) return []
    return attachments
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = String(date.getFullYear()).slice(-2)
      return `${day}/${month}/${year}`
    } catch {
      return dateString
    }
  }

  const getStatusIndicatorLabel = (value: number) => {
    switch(value) {
      case 1: return "pending"
      case 2: return "in-progress"
      case 3: return "completed"
      default: return "pending"
    }
  }

  const handleAllClick = () => {
    setSelectedStatuses([])
  }

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status)
      } else {
        return [...prev, status]
      }
    })
  }

  const filteredByStatus = selectedStatuses.length === 0
    ? clearances 
    : clearances.filter(c => selectedStatuses.includes(c.status))

  const filteredClearances = searchText.trim() === ""
    ? filteredByStatus
    : filteredByStatus.filter(c => {
        const searchLower = searchText.toLowerCase()
        const customerName = getCustomerName(c).toLowerCase()
        const jobRef = c.jobRef.toString()
        const trailer = (c.trailerOrContainerNumber || "").toLowerCase()
        const vessel = (c.vesselName || "").toLowerCase()
        
        return jobRef.includes(searchLower) ||
               customerName.includes(searchLower) ||
               trailer.includes(searchLower) ||
               vessel.includes(searchLower)
      })

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
        <div className="flex gap-2 flex-wrap" data-testid="status-filters">
        <Button
          variant={selectedStatuses.length === 0 ? "default" : "outline"}
          size="sm"
          onClick={handleAllClick}
          data-testid="filter-all"
        >
          All
        </Button>
        <Button
          variant={selectedStatuses.includes("Awaiting Entry") ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusToggle("Awaiting Entry")}
          data-testid="filter-awaiting-entry"
        >
          Awaiting Entry
        </Button>
        <Button
          variant={selectedStatuses.includes("Waiting Arrival") ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusToggle("Waiting Arrival")}
          data-testid="filter-waiting-arrival"
        >
          Waiting Arrival
        </Button>
        <Button
          variant={selectedStatuses.includes("P.H Hold") ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusToggle("P.H Hold")}
          data-testid="filter-ph-hold"
        >
          P.H Hold
        </Button>
        <Button
          variant={selectedStatuses.includes("Customs Issue") ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusToggle("Customs Issue")}
          data-testid="filter-customs-issue"
        >
          Customs Issue
        </Button>
        <Button
          variant={selectedStatuses.includes("Fully Cleared") ? "default" : "outline"}
          size="sm"
          onClick={() => handleStatusToggle("Fully Cleared")}
          data-testid="filter-fully-cleared"
        >
          Fully Cleared
        </Button>
        </div>
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
      ) : filteredClearances.length === 0 ? (
        <div className="text-center py-12" data-testid="empty-filtered-state">
          <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No clearances match the selected filter</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredClearances.map((clearance) => {
            const transportDocs = parseAttachments(clearance.transportDocuments || null)
            const clearanceDocs = parseAttachments(clearance.clearanceDocuments || null)
            const totalFiles = transportDocs.length + clearanceDocs.length
            const hasNotes = clearance.additionalNotes && clearance.additionalNotes.trim().length > 0

            return (
              <Card key={clearance.id} data-testid={`card-clearance-${clearance.id}`} className="bg-purple-50/50 dark:bg-purple-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <FileCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <h3 className="font-semibold text-lg" data-testid={`text-job-ref-${clearance.id}`}>
                          {clearance.jobRef}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                          {clearance.jobType}
                        </span>
                        <span 
                          className={`text-xs px-2 py-0.5 rounded ${
                            clearance.status === "Fully Cleared" 
                              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                              : clearance.status === "Waiting Arrival"
                              ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                              : clearance.status === "P.H Hold" || clearance.status === "Customs Issue"
                              ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                              : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          }`}
                          data-testid={`text-status-${clearance.id}`}
                        >
                          {clearance.status}
                        </span>
                        {hasNotes && (
                          <StickyNote className="h-4 w-4 text-yellow-600 dark:text-yellow-400" data-testid={`icon-notes-${clearance.id}`} />
                        )}
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
                  <div className="space-y-2 text-sm">
                    {clearance.trailerOrContainerNumber && (
                      <p data-testid={`text-trailer-${clearance.id}`}>
                        <span className="font-medium">Container/Trailer:</span> {clearance.trailerOrContainerNumber}
                      </p>
                    )}
                    {clearance.clearanceType && (
                      <p data-testid={`text-clearance-type-${clearance.id}`}>
                        <span className="font-medium">Type:</span> {clearance.clearanceType}
                      </p>
                    )}
                    {clearance.portOfArrival && (
                      <p data-testid={`text-port-${clearance.id}`}>
                        <span className="font-medium">Port:</span> {clearance.portOfArrival}
                      </p>
                    )}
                    {clearance.etaPort && (
                      <p data-testid={`text-date-${clearance.id}`}>
                        <span className="font-medium">ETA:</span> {formatDate(clearance.etaPort)}
                      </p>
                    )}
                    {clearance.goodsDescription && (
                      <p className="text-muted-foreground line-clamp-2" data-testid={`text-description-${clearance.id}`}>
                        {clearance.goodsDescription}
                      </p>
                    )}

                    {/* To Do List */}
                    <div className="pt-2 mt-2 border-t">
                      <div className="flex items-center gap-1 mb-2">
                        <ListTodo className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">To Do</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2" data-testid={`todo-advise-agent-${clearance.id}`}>
                          <div className={`h-2 w-2 rounded-full ${
                            clearance.adviseAgentStatusIndicator === 3 ? "bg-green-500" :
                            clearance.adviseAgentStatusIndicator === 2 ? "bg-yellow-500" : "bg-gray-300"
                          }`} />
                          <span className={clearance.adviseAgentStatusIndicator === 3 ? "line-through text-muted-foreground" : ""}>
                            Advise Clearance To Agent
                          </span>
                        </div>
                        <div className="flex items-center gap-2" data-testid={`todo-send-entry-${clearance.id}`}>
                          <div className={`h-2 w-2 rounded-full ${
                            clearance.sendEntryToCustomerStatusIndicator === 3 ? "bg-green-500" :
                            clearance.sendEntryToCustomerStatusIndicator === 2 ? "bg-yellow-500" : "bg-gray-300"
                          }`} />
                          <span className={clearance.sendEntryToCustomerStatusIndicator === 3 ? "line-through text-muted-foreground" : ""}>
                            Send Entry/EAD to Customer
                          </span>
                        </div>
                        <div className="flex items-center gap-2" data-testid={`todo-invoice-${clearance.id}`}>
                          <div className={`h-2 w-2 rounded-full ${
                            clearance.invoiceCustomerStatusIndicator === 3 ? "bg-green-500" :
                            clearance.invoiceCustomerStatusIndicator === 2 ? "bg-yellow-500" : "bg-gray-300"
                          }`} />
                          <span className={clearance.invoiceCustomerStatusIndicator === 3 ? "line-through text-muted-foreground" : ""}>
                            Invoice Customer
                          </span>
                        </div>
                        {clearance.jobType === "import" && (
                          <div className="flex items-center gap-2" data-testid={`todo-cleared-entry-${clearance.id}`}>
                            <div className={`h-2 w-2 rounded-full ${
                              clearance.sendClearedEntryStatusIndicator === 3 ? "bg-green-500" :
                              clearance.sendClearedEntryStatusIndicator === 2 ? "bg-yellow-500" : "bg-gray-300"
                            }`} />
                            <span className={clearance.sendClearedEntryStatusIndicator === 3 ? "line-through text-muted-foreground" : ""}>
                              Send Cleared Entry to Customer
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Files Section */}
                    {totalFiles > 0 && (
                      <div className="pt-2 mt-2 border-t" data-testid={`files-section-${clearance.id}`}>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium text-muted-foreground">Transport</span>
                            </div>
                            <span className="text-muted-foreground">
                              {transportDocs.length} {transportDocs.length === 1 ? 'file' : 'files'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium text-muted-foreground">Clearance</span>
                            </div>
                            <span className="text-muted-foreground">
                              {clearanceDocs.length} {clearanceDocs.length === 1 ? 'file' : 'files'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
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

      <AlertDialog open={!!deletingClearanceId} onOpenChange={(open) => !open && setDeletingClearanceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this custom clearance job.
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
