import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
import { Plus, Pencil, Trash2, FileCheck, Paperclip, Search, StickyNote, FileText, ListTodo, ClipboardCheck, Send, Receipt, Mail, X, ChevronDown } from "lucide-react"
import { PDFViewer } from "@/components/pdf-viewer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CustomClearanceForm } from "@/components/custom-clearance-form"
import type { CustomClearance, InsertCustomClearance, ImportCustomer, ExportReceiver, JobFileGroup } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"

export default function CustomClearances() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingClearance, setEditingClearance] = useState<CustomClearance | null>(null)
  const [deletingClearanceId, setDeletingClearanceId] = useState<string | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["Awaiting Entry", "Waiting Arrival", "P.H Hold", "Customs Issue"])
  const [searchText, setSearchText] = useState("")
  const [notesClearanceId, setNotesClearanceId] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState("")
  const [dragOver, setDragOver] = useState<{ clearanceId: string; type: "transport" | "clearance" } | null>(null)
  const [viewingPdf, setViewingPdf] = useState<{ url: string; name: string } | null>(null)
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

  // Fetch shared documents for all clearances
  const jobRefs = clearances.map(c => c.jobRef).filter((ref): ref is number => ref !== undefined)
  const { data: sharedDocsMap = {} } = useQuery<Record<number, string[]>>({
    queryKey: ["/api/job-file-groups/batch", jobRefs],
    queryFn: async () => {
      const map: Record<number, string[]> = {}
      
      // Fetch job file groups for each unique jobRef
      const uniqueRefs = Array.from(new Set(jobRefs))
      await Promise.all(
        uniqueRefs.map(async (jobRef) => {
          try {
            const response = await fetch(`/api/job-file-groups/${jobRef}`)
            if (response.ok) {
              const data: JobFileGroup = await response.json()
              map[jobRef] = data.documents || []
            }
          } catch (error) {
            // Ignore errors - jobRef might not have shared docs yet
          }
        })
      )
      
      return map
    },
    enabled: jobRefs.length > 0,
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

  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return apiRequest("PATCH", `/api/custom-clearances/${id}`, { additionalNotes: notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      setNotesClearanceId(null)
      toast({ title: "Notes updated successfully" })
    },
  })

  const updateAdviseAgentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/custom-clearances/${id}/advise-agent-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
    },
  })

  const updateSendEntryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/custom-clearances/${id}/send-entry-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
    },
  })

  const updateInvoiceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/custom-clearances/${id}/invoice-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
    },
  })

  const updateSendClearedEntryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/custom-clearances/${id}/send-cleared-entry-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
    },
  })

  const updateClearanceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/custom-clearances/${id}`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
    },
  })

  const uploadFile = useMutation({
    mutationFn: async ({ id, file, fileType }: { id: string; file: File; fileType: "transport" | "clearance" }) => {
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
      
      // Update clearance with new file
      const clearance = clearances.find(c => c.id === id)
      if (!clearance) throw new Error("Clearance not found")
      
      const currentFiles = fileType === "transport" ? (clearance.transportDocuments || []) : (clearance.clearanceDocuments || [])
      const updatedFiles = [...currentFiles, filePath]
      
      const res = await apiRequest("PATCH", `/api/custom-clearances/${id}`, {
        ...clearance,
        [fileType === "transport" ? "transportDocuments" : "clearanceDocuments"]: updatedFiles
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      queryClient.invalidateQueries({ queryKey: ["/api/job-file-groups"] })
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      toast({ title: "File uploaded successfully" })
    },
    onError: () => {
      toast({ title: "File upload failed", variant: "destructive" })
    }
  })

  const deleteFile = useMutation({
    mutationFn: async ({ id, filePath, fileType }: { id: string; filePath: string; fileType: "transport" | "clearance" }) => {
      const clearance = clearances.find(c => c.id === id)
      if (!clearance) throw new Error("Clearance not found")
      
      const currentFiles = fileType === "transport" ? (clearance.transportDocuments || []) : (clearance.clearanceDocuments || [])
      const updatedFiles = currentFiles.filter(f => f !== filePath)
      
      const res = await apiRequest("PATCH", `/api/custom-clearances/${id}`, {
        ...clearance,
        [fileType === "transport" ? "transportDocuments" : "clearanceDocuments"]: updatedFiles
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      queryClient.invalidateQueries({ queryKey: ["/api/job-file-groups"] })
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      toast({ title: "File deleted successfully" })
    },
    onError: () => {
      toast({ title: "File deletion failed", variant: "destructive" })
    }
  })

  const handleAdviseAgentStatusUpdate = (id: string, status: number) => {
    updateAdviseAgentStatus.mutate({ id, status })
  }

  const handleSendEntryStatusUpdate = (id: string, status: number) => {
    updateSendEntryStatus.mutate({ id, status })
  }

  const handleInvoiceStatusUpdate = (id: string, status: number) => {
    updateInvoiceStatus.mutate({ id, status })
  }

  const handleSendClearedEntryStatusUpdate = (id: string, status: number) => {
    updateSendClearedEntryStatus.mutate({ id, status })
  }

  const handleFileDragOver = (e: React.DragEvent, clearanceId: string, type: "transport" | "clearance") => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver({ clearanceId, type })
  }

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)
  }

  const handleFileDrop = async (e: React.DragEvent, clearanceId: string, type: "transport" | "clearance") => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    for (const file of files) {
      uploadFile.mutate({ id: clearanceId, file, fileType: type })
    }
  }

  const handleOpenNotes = (clearance: CustomClearance) => {
    setNotesClearanceId(clearance.id)
    setNotesValue(clearance.additionalNotes || "")
  }

  const handleCloseNotes = () => {
    setNotesClearanceId(null)
    setNotesValue("")
  }

  const handleSaveNotes = () => {
    if (!notesClearanceId) return
    updateNotes.mutate({ id: notesClearanceId, notes: notesValue })
  }

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

  const normalizeFilePath = (filePath: string): string => {
    if (filePath.startsWith('https://storage.googleapis.com/')) {
      const url = new URL(filePath)
      const pathname = decodeURIComponent(url.pathname)
      const match = pathname.match(/\/.private\/(.+)$/)
      if (match) {
        return `/objects/${match[1]}`
      }
    }
    return filePath.startsWith('http://') || filePath.startsWith('https://') 
      ? filePath 
      : filePath.startsWith('/') ? filePath : `/objects/${filePath}`
  }

  const handleFileClick = (e: React.MouseEvent, filePath: string) => {
    const fileName = filePath.split('/').pop() || filePath
    const fileExtension = fileName.split('.').pop()?.toLowerCase()
    
    if (fileExtension === 'pdf') {
      e.preventDefault()
      const downloadPath = normalizeFilePath(filePath)
      setViewingPdf({ url: downloadPath, name: fileName })
    }
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

  const getStatusColor = (indicator: number | null) => {
    switch (indicator) {
      case 1:
      case null:
      default: return "text-yellow-600 dark:text-yellow-400"
      case 2: return "text-orange-600 dark:text-orange-400"
      case 3: return "text-green-600 dark:text-green-400"
      case 4: return "text-red-600 dark:text-red-400"
    }
  }

  const getClearanceStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Fully Cleared":
        return "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
      case "Waiting Arrival":
        return "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
      case "P.H Hold":
      case "Customs Issue":
        return "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
      default:
        return "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
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
            // Use shared documents from job_file_groups if available, otherwise fall back to clearance's own documents
            const sharedDocs = clearance.jobRef ? (sharedDocsMap[clearance.jobRef] || []) : []
            const transportDocs = sharedDocs.length > 0 ? sharedDocs : parseAttachments(clearance.transportDocuments || null)
            const clearanceDocs = parseAttachments(clearance.clearanceDocuments || null)
            const totalFiles = transportDocs.length + clearanceDocs.length
            const hasNotes = clearance.additionalNotes && clearance.additionalNotes.trim().length > 0

            return (
              <Card key={clearance.id} data-testid={`card-clearance-${clearance.id}`} className="bg-purple-50/50 dark:bg-purple-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <h3 className="font-semibold text-lg" data-testid={`text-job-ref-${clearance.id}`}>
                          {clearance.jobRef}
                        </h3>
                        <div className="flex -space-x-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenNotes(clearance)}
                            data-testid={`button-notes-${clearance.id}`}
                            title={clearance.additionalNotes || "Additional Notes"}
                            className="h-7 w-7"
                          >
                            <StickyNote className={`h-4 w-4 ${clearance.additionalNotes ? 'text-yellow-600 dark:text-yellow-400' : ''}`} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(clearance)}
                            data-testid={`button-edit-${clearance.id}`}
                            className="h-7 w-7"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(clearance.id)}
                            data-testid={`button-delete-${clearance.id}`}
                            className="h-7 w-7"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-customer-${clearance.id}`}>
                        {getCustomerName(clearance)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className={`${getClearanceStatusBadgeColor(clearance.status)} inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer hover:opacity-80`}
                            data-testid={`badge-status-${clearance.id}`}
                          >
                            {clearance.status}
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => updateClearanceStatus.mutate({ id: clearance.id, status: "Awaiting Entry" })}>
                            Awaiting Entry
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateClearanceStatus.mutate({ id: clearance.id, status: "Waiting Arrival" })}>
                            Waiting Arrival
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateClearanceStatus.mutate({ id: clearance.id, status: "P.H Hold" })}>
                            P.H Hold
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateClearanceStatus.mutate({ id: clearance.id, status: "Customs Issue" })}>
                            Customs Issue
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateClearanceStatus.mutate({ id: clearance.id, status: "Fully Cleared" })}>
                            Fully Cleared
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                        {clearance.jobType}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    {clearance.trailerOrContainerNumber && (
                      <p className="text-lg font-semibold" data-testid={`text-trailer-${clearance.id}`}>
                        {clearance.trailerOrContainerNumber}
                      </p>
                    )}
                    {clearance.clearanceType && (
                      <p data-testid={`text-clearance-type-${clearance.id}`}>
                        {clearance.clearanceType}
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

                    {/* To-Do List */}
                    <div className="pt-2 mt-2 border-t">
                      <h3 className="font-semibold text-lg mb-2" data-testid={`text-todo-title-${clearance.id}`}>
                        To-Do List
                      </h3>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
                            <p className={`text-xs ${getStatusColor(clearance.adviseAgentStatusIndicator)} font-medium`} data-testid={`todo-advise-agent-${clearance.id}`}>
                              Advise Clearance To Agent
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleAdviseAgentStatusUpdate(clearance.id, 2)}
                              className={`h-5 w-5 rounded border-2 transition-all ${
                                clearance.adviseAgentStatusIndicator === 2 || clearance.adviseAgentStatusIndicator === null
                                  ? 'bg-yellow-400 border-yellow-500 scale-110'
                                  : 'bg-yellow-200 border-yellow-300 hover-elevate'
                              }`}
                              data-testid={`button-advise-yellow-${clearance.id}`}
                              title="Yellow Status"
                            />
                            <button
                              onClick={() => handleAdviseAgentStatusUpdate(clearance.id, 3)}
                              className={`h-5 w-5 rounded border-2 transition-all ${
                                clearance.adviseAgentStatusIndicator === 3
                                  ? 'bg-green-400 border-green-500 scale-110'
                                  : 'bg-green-200 border-green-300 hover-elevate'
                              }`}
                              data-testid={`button-advise-green-${clearance.id}`}
                              title="Green Status"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Send className="h-3.5 w-3.5 text-muted-foreground" />
                            <p className={`text-xs ${getStatusColor(clearance.sendEntryToCustomerStatusIndicator)} font-medium`} data-testid={`todo-send-entry-${clearance.id}`}>
                              {clearance.jobType === "import" ? "Send Import Entry to Customer" : "Send Export Entry to Customer"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSendEntryStatusUpdate(clearance.id, 2)}
                              className={`h-5 w-5 rounded border-2 transition-all ${
                                clearance.sendEntryToCustomerStatusIndicator === 2 || clearance.sendEntryToCustomerStatusIndicator === null
                                  ? 'bg-yellow-400 border-yellow-500 scale-110'
                                  : 'bg-yellow-200 border-yellow-300 hover-elevate'
                              }`}
                              data-testid={`button-entry-yellow-${clearance.id}`}
                              title="Yellow Status"
                            />
                            <button
                              onClick={() => handleSendEntryStatusUpdate(clearance.id, 3)}
                              className={`h-5 w-5 rounded border-2 transition-all ${
                                clearance.sendEntryToCustomerStatusIndicator === 3
                                  ? 'bg-green-400 border-green-500 scale-110'
                                  : 'bg-green-200 border-green-300 hover-elevate'
                              }`}
                              data-testid={`button-entry-green-${clearance.id}`}
                              title="Green Status"
                            />
                          </div>
                        </div>

                        {!clearance.createdFromId && (
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className={`text-xs ${getStatusColor(clearance.invoiceCustomerStatusIndicator)} font-medium`} data-testid={`todo-invoice-${clearance.id}`}>
                                Invoice Customer
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleInvoiceStatusUpdate(clearance.id, 2)}
                                className={`h-5 w-5 rounded border-2 transition-all ${
                                  clearance.invoiceCustomerStatusIndicator === 2 || clearance.invoiceCustomerStatusIndicator === null
                                    ? 'bg-yellow-400 border-yellow-500 scale-110'
                                    : 'bg-yellow-200 border-yellow-300 hover-elevate'
                                }`}
                                data-testid={`button-invoice-yellow-${clearance.id}`}
                                title="Yellow Status"
                              />
                              <button
                                onClick={() => handleInvoiceStatusUpdate(clearance.id, 3)}
                                className={`h-5 w-5 rounded border-2 transition-all ${
                                  clearance.invoiceCustomerStatusIndicator === 3
                                    ? 'bg-green-400 border-green-500 scale-110'
                                    : 'bg-green-200 border-green-300 hover-elevate'
                                }`}
                                data-testid={`button-invoice-green-${clearance.id}`}
                                title="Green Status"
                              />
                            </div>
                          </div>
                        )}

                        {clearance.jobType === "import" && (
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className={`text-xs ${getStatusColor(clearance.sendClearedEntryStatusIndicator)} font-medium`} data-testid={`todo-cleared-entry-${clearance.id}`}>
                                Send Cleared Entry to Customer
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSendClearedEntryStatusUpdate(clearance.id, 2)}
                                className={`h-5 w-5 rounded border-2 transition-all ${
                                  clearance.sendClearedEntryStatusIndicator === 2 || clearance.sendClearedEntryStatusIndicator === null
                                    ? 'bg-yellow-400 border-yellow-500 scale-110'
                                    : 'bg-yellow-200 border-yellow-300 hover-elevate'
                                }`}
                                data-testid={`button-cleared-yellow-${clearance.id}`}
                                title="Yellow Status"
                              />
                              <button
                                onClick={() => handleSendClearedEntryStatusUpdate(clearance.id, 3)}
                                className={`h-5 w-5 rounded border-2 transition-all ${
                                  clearance.sendClearedEntryStatusIndicator === 3
                                    ? 'bg-green-400 border-green-500 scale-110'
                                    : 'bg-green-200 border-green-300 hover-elevate'
                                }`}
                                data-testid={`button-cleared-green-${clearance.id}`}
                                title="Green Status"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Files Section */}
                    <div className="pt-2 mt-2 border-t" data-testid={`files-section-${clearance.id}`}>
                      <div className="grid grid-cols-2 gap-2">
                        <div 
                          className="space-y-1"
                          onDragOver={(e) => handleFileDragOver(e, clearance.id, "transport")}
                          onDragLeave={handleFileDragLeave}
                          onDrop={(e) => handleFileDrop(e, clearance.id, "transport")}
                        >
                          <p className="text-xs font-medium text-muted-foreground">Transport Documents</p>
                          <div className={`min-h-[2.5rem] p-1.5 rounded border-2 border-dashed transition-colors ${
                            dragOver?.clearanceId === clearance.id && dragOver?.type === "transport"
                              ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
                              : "border-transparent"
                          }`}>
                            {transportDocs.length > 0 ? (
                              <div className="space-y-0.5">
                                {transportDocs.map((filePath, idx) => {
                                  const fileName = filePath.split('/').pop() || filePath
                                  const downloadPath = normalizeFilePath(filePath)
                                  return (
                                    <div key={idx} className="flex items-center gap-1 group">
                                      <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <a
                                        href={downloadPath}
                                        onClick={(e) => handleFileClick(e, filePath)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs truncate hover:text-primary flex-1 cursor-pointer"
                                        title={fileName}
                                        data-testid={`link-transport-doc-${clearance.id}-${idx}`}
                                      >
                                        {fileName}
                                      </a>
                                      <button
                                        onClick={() => deleteFile.mutate({ id: clearance.id, filePath, fileType: "transport" })}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        data-testid={`button-delete-transport-${clearance.id}-${idx}`}
                                      >
                                        <X className="h-3 w-3 text-destructive hover:text-destructive/80" />
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">Drop files here</p>
                            )}
                          </div>
                        </div>
                        <div 
                          className="space-y-1"
                          onDragOver={(e) => handleFileDragOver(e, clearance.id, "clearance")}
                          onDragLeave={handleFileDragLeave}
                          onDrop={(e) => handleFileDrop(e, clearance.id, "clearance")}
                        >
                          <p className="text-xs font-medium text-muted-foreground">Clearance Documents</p>
                          <div className={`min-h-[2.5rem] p-1.5 rounded border-2 border-dashed transition-colors ${
                            dragOver?.clearanceId === clearance.id && dragOver?.type === "clearance"
                              ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                              : "border-transparent"
                          }`}>
                            {clearanceDocs.length > 0 ? (
                              <div className="space-y-0.5">
                                {clearanceDocs.map((filePath, idx) => {
                                  const fileName = filePath.split('/').pop() || filePath
                                  const downloadPath = normalizeFilePath(filePath)
                                  return (
                                    <div key={idx} className="flex items-center gap-1 group">
                                      <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <a
                                        href={downloadPath}
                                        onClick={(e) => handleFileClick(e, filePath)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs truncate hover:text-primary flex-1 cursor-pointer"
                                        title={fileName}
                                        data-testid={`link-clearance-doc-${clearance.id}-${idx}`}
                                      >
                                        {fileName}
                                      </a>
                                      <button
                                        onClick={() => deleteFile.mutate({ id: clearance.id, filePath, fileType: "clearance" })}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        data-testid={`button-delete-clearance-${clearance.id}-${idx}`}
                                      >
                                        <X className="h-3 w-3 text-destructive hover:text-destructive/80" />
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">Drop files here</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
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

      <Dialog open={!!notesClearanceId} onOpenChange={(open) => !open && handleCloseNotes()}>
        <DialogContent className="max-w-3xl h-[400px] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Additional Notes</DialogTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCloseNotes}
              className="h-6 w-6"
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
              placeholder="Add notes for this custom clearance..."
              data-testid="textarea-notes"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              onClick={handleCloseNotes}
              data-testid="button-cancel-notes"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={updateNotes.isPending}
              data-testid="button-save-notes"
            >
              {updateNotes.isPending ? "Saving..." : "Save Notes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingPdf} onOpenChange={(open) => !open && setViewingPdf(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewingPdf?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 px-6 pb-6 overflow-hidden">
            {viewingPdf && <PDFViewer url={viewingPdf.url} filename={viewingPdf.name} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
