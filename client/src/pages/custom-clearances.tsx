import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Plus, Pencil, Trash2, FileCheck, Paperclip, Search, StickyNote, FileText, ListTodo, ClipboardCheck, Send, Receipt, Mail, X, ChevronDown, Link2, PoundSterling, Download, ChevronLeft, ChevronRight, Container, Truck, Plane, Check } from "lucide-react"
import { PDFViewer } from "@/components/pdf-viewer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CustomClearanceForm } from "@/components/custom-clearance-form"
import type { CustomClearance, InsertCustomClearance, ImportCustomer, ExportCustomer, ExportReceiver, JobFileGroup, ClearanceAgent, ExportShipment, Invoice } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"
import { useWindowManager } from "@/contexts/WindowManagerContext"
import { useEmail } from "@/contexts/EmailContext"

// Helper functions for file object handling (supports both new {filename, path} and legacy string formats)
const getFileName = (file: any): string => {
  if (typeof file === 'string') return file.split('/').pop() || file;
  return file?.filename || 'Unknown';
};

const getFilePath = (file: any): string => {
  if (typeof file === 'string') return file;
  return file?.path || file;
};

export default function CustomClearances() {
  const { openWindow } = useWindowManager()
  const { openEmailComposer } = useEmail()
  const [deletingClearanceId, setDeletingClearanceId] = useState<string | null>(null)
  const [clearanceAgentDialog, setClearanceAgentDialog] = useState<{ show: boolean; clearanceId: string } | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["Request CC", "Awaiting Entry", "Awaiting Arrival", "Waiting Arrival", "P.H Hold", "Customs Issue"])
  const [selectedShipmentTypes, setSelectedShipmentTypes] = useState<string[]>(["Container Shipment", "Road Shipment", "Air Freight"])
  const [searchText, setSearchText] = useState("")
  const [notesClearanceId, setNotesClearanceId] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState("")
  const [dragOver, setDragOver] = useState<{ clearanceId: string; type: "transport" | "clearance" } | null>(null)
  const [viewingPdf, setViewingPdf] = useState<{ url: string; name: string } | null>(null)
  const [redButtonPrompt, setRedButtonPrompt] = useState<{ clearanceId: string; statusType: string; statusValue: number } | null>(null)
  const [deletingFile, setDeletingFile] = useState<{ id: string; filePath: string; fileType: "transport" | "clearance"; fileName: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null)
  const [invoiceSelectionDialog, setInvoiceSelectionDialog] = useState<{ clearance: CustomClearance; invoices: Invoice[] } | null>(null)
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [mrnConfirmation, setMrnConfirmation] = useState<{ id: string; fileObject: { filename: string; path: string }; mrnNumber: string; clearance: CustomClearance } | null>(null)
  const { toast } = useToast()
  const [location, setLocation] = useLocation()
  
  const ITEMS_PER_PAGE = 30

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

  const { data: exportCustomers = [] } = useQuery<ExportCustomer[]>({
    queryKey: ["/api/export-customers"],
  })

  const { data: exportReceivers = [] } = useQuery<ExportReceiver[]>({
    queryKey: ["/api/export-receivers"],
  })

  const { data: clearanceAgents = [] } = useQuery<ClearanceAgent[]>({
    queryKey: ["/api/clearance-agents"],
  })

  // Fetch all invoices
  const { data: allInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  })

  const { data: hauliers = [] } = useQuery<any[]>({
    queryKey: ["/api/hauliers"],
  })

  const { data: exportShipments = [] } = useQuery<any[]>({
    queryKey: ["/api/export-shipments"],
  })

  const { data: importShipments = [] } = useQuery<any[]>({
    queryKey: ["/api/import-shipments"],
  })

  // Fetch shared documents for all clearances
  const jobRefs = clearances.map(c => c.jobRef).filter((ref): ref is number => ref !== undefined)
  const { data: sharedDocsMap = {} } = useQuery<Record<number, any[]>>({
    queryKey: ["/api/job-file-groups/batch", jobRefs],
    queryFn: async () => {
      const map: Record<number, any[]> = {}
      
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
      toast({ title: "Custom clearance created successfully" })
    },
  })

  const updateClearance = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertCustomClearance }) => {
      return apiRequest("PATCH", `/api/custom-clearances/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
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
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
    },
  })

  const updateSendHaulierEadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/custom-clearances/${id}/send-haulier-ead-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
    },
  })

  const updateSendCustomerGvmsStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/custom-clearances/${id}/send-customer-gvms-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
    },
  })

  const updateSendCustomerEadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/custom-clearances/${id}/send-customer-ead-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
    },
  })

  const updateSendHaulierClearanceDocStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: number }) => {
      return apiRequest("PATCH", `/api/custom-clearances/${id}/send-haulier-clearance-doc-status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
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
      // Get clearance info for folder organization
      const clearance = clearances.find(c => c.id === id)
      if (!clearance) throw new Error("Clearance not found")
      
      // Direct upload to backend with job organization
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);
      formData.append('jobType', 'Custom Clearances');
      formData.append('jobRef', clearance.jobRef.toString());
      formData.append('documentType', fileType === "transport" ? "Transport Documents" : "Clearance Documents");
      
      const uploadResponse = await fetch("/api/objects/upload", {
        method: "POST",
        body: formData
      })
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }
      
      const { objectPath, filename } = await uploadResponse.json()
      const fileObject = { filename, path: objectPath }
      
      // If it's a clearance document, scan for MRN
      if (fileType === "clearance") {
        try {
          const ocrResponse = await fetch("/api/objects/ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ objectPath, filename })
          })
          const { mrnNumber } = await ocrResponse.json()
          
          if (mrnNumber) {
            // Show confirmation dialog for detected MRN
            setMrnConfirmation({ id, fileObject, mrnNumber, clearance })
            return { pending: true } // Return to prevent success toast
          } else {
            // Show "No MRN Found" toast
            toast({ 
              title: "No MRN Found", 
              description: "OCR scan completed but no MRN was detected in the document."
            })
          }
        } catch (error) {
          console.error("OCR failed:", error)
          toast({ 
            title: "OCR Failed", 
            description: "Failed to scan document for MRN.",
            variant: "destructive"
          })
        }
      }
      
      // Update clearance with new file object (no MRN found or transport doc)
      const currentFiles = fileType === "transport" ? (clearance.transportDocuments || []) : (clearance.clearanceDocuments || [])
      
      // Convert any old string files to new object format for consistency
      const normalizedCurrentFiles = currentFiles.map((f: any) => {
        if (typeof f === 'string') {
          return { filename: f.split('/').pop() || f, path: f };
        }
        return f;
      });
      
      const updatedFiles = [...normalizedCurrentFiles, fileObject]
      
      const res = await apiRequest("PATCH", `/api/custom-clearances/${id}`, {
        ...clearance,
        [fileType === "transport" ? "transportDocuments" : "clearanceDocuments"]: updatedFiles
      })
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      queryClient.invalidateQueries({ queryKey: ["/api/job-file-groups"], refetchType: "all" })
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })
      // Don't show toast if MRN confirmation is pending
      if (!data?.pending) {
        toast({ title: "File uploaded successfully" })
      }
    },
    onError: () => {
      toast({ title: "File upload failed", variant: "destructive" })
    }
  })

  const deleteFile = useMutation({
    mutationFn: async ({ id, filePath, fileType, fileName }: { id: string; filePath: string; fileType: "transport" | "clearance"; fileName: string }) => {
      const clearance = clearances.find(c => c.id === id)
      if (!clearance) throw new Error("Clearance not found")
      
      const currentFiles = fileType === "transport" ? (clearance.transportDocuments || []) : (clearance.clearanceDocuments || [])
      // Filter out the file by comparing the path property
      const updatedFiles = currentFiles.filter((f: any) => f?.path !== filePath && f !== filePath)
      
      const res = await apiRequest("PATCH", `/api/custom-clearances/${id}`, {
        ...clearance,
        [fileType === "transport" ? "transportDocuments" : "clearanceDocuments"]: updatedFiles
      })
      return res.json()
    },
    onSuccess: (_data, variables) => {
      const clearance = clearances.find(c => c.id === variables.id)
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"], refetchType: "all" })
      queryClient.invalidateQueries({ queryKey: ["/api/job-file-groups"], refetchType: "all" })
      queryClient.invalidateQueries({ queryKey: ["/api/job-file-groups/batch"], refetchType: "all" })
      if (clearance?.jobRef) {
        queryClient.invalidateQueries({ queryKey: ["/api/job-file-groups", clearance.jobRef], refetchType: "all" })
      }
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"], refetchType: "all" })
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"], refetchType: "all" })
      toast({ title: `File '${variables.fileName}' deleted successfully` })
    },
    onError: () => {
      toast({ title: "File deletion failed", variant: "destructive" })
    }
  })

  const deleteInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      await apiRequest('DELETE', `/api/invoices/${invoiceId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      toast({
        title: 'Invoice deleted successfully',
      })
      setDeletingInvoice(null)
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error.message || 'Failed to delete invoice',
        variant: 'destructive',
      })
    },
  })

  const handleMrnConfirmation = async (confirm: boolean) => {
    if (!mrnConfirmation) return

    const { id, fileObject, mrnNumber, clearance } = mrnConfirmation
    const currentFiles = clearance.clearanceDocuments || []
    
    // Normalize current files to ensure they're all objects
    const normalizedCurrentFiles = currentFiles.map((f: any) => {
      if (typeof f === 'string') {
        return { filename: f.split('/').pop() || f, path: f };
      }
      return f;
    });
    
    const updatedFiles = [...normalizedCurrentFiles, fileObject]

    try {
      await apiRequest("PATCH", `/api/custom-clearances/${id}`, {
        ...clearance,
        clearanceDocuments: updatedFiles,
        ...(confirm && { mrn: mrnNumber }) // Only add MRN if user confirms
      })

      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] })
      queryClient.invalidateQueries({ queryKey: ["/api/job-file-groups"], refetchType: "all" })
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] })

      toast({ 
        title: confirm ? "MRN Added" : "File Uploaded",
        description: confirm 
          ? `MRN ${mrnNumber} has been added to the clearance.`
          : "File uploaded without MRN."
      })
    } catch (error) {
      toast({ 
        title: "Update Failed", 
        description: "Failed to update clearance.",
        variant: "destructive"
      })
    } finally {
      setMrnConfirmation(null)
    }
  }

  const handleAdviseAgentStatusUpdate = (id: string, status: number) => {
    if (status === 4) {
      setRedButtonPrompt({ clearanceId: id, statusType: 'adviseAgent', statusValue: status })
    } else {
      updateAdviseAgentStatus.mutate({ id, status })
    }
  }

  const handleSendHaulierEadStatusUpdate = (id: string, status: number) => {
    updateSendHaulierEadStatus.mutate({ id, status })
  }

  const handleSendCustomerGvmsStatusUpdate = (id: string, status: number) => {
    updateSendCustomerGvmsStatus.mutate({ id, status })
  }

  const handleSendCustomerEadStatusUpdate = (id: string, status: number) => {
    updateSendCustomerEadStatus.mutate({ id, status })
  }

  const handleSendHaulierClearanceDocStatusUpdate = (id: string, status: number) => {
    updateSendHaulierClearanceDocStatus.mutate({ id, status })
  }

  const handleSendInvoiceToCustomerEmail = (clearance: CustomClearance) => {
    try {
      const isImport = clearance.jobType === 'import'
      
      // Get the customer based on clearance type
      const customer = isImport
        ? importCustomers.find(c => c.id === clearance.importCustomerId)
        : exportCustomers.find(c => c.id === clearance.exportCustomerId)

      // Get all invoices for this clearance
      const clearanceInvoices = allInvoices.filter(inv => 
        inv.jobRef === clearance.jobRef && inv.jobType === 'clearance' && inv.jobId === clearance.id
      )
      
      // Check if invoices exist
      if (clearanceInvoices.length === 0) {
        toast({
          title: "No Invoices Found",
          description: "No invoices are attached to this job. Please create an invoice first.",
          variant: "destructive",
        })
        return
      }

      // If multiple invoices, show selection dialog
      if (clearanceInvoices.length > 1) {
        setInvoiceSelectionDialog({ clearance, invoices: clearanceInvoices })
        return
      }

      // Determine TO field with priority: Agent Accounts Email → Customer Accounts Email → Agent Email → Customer Email
      let toEmail = ""
      let ccEmails = ""
      let useAgentContact = false
      
      if (customer) {
        const agentAccountsEmail = customer.agentAccountsEmail
        const customerAccountsEmail = customer.accountsEmail
        const agentEmailArray = Array.isArray(customer.agentEmail) ? customer.agentEmail : (customer.agentEmail ? [customer.agentEmail] : [])
        const customerEmailArray = Array.isArray(customer.email) ? customer.email : (customer.email ? customer.email.split(',').map(e => e.trim()) : [])
        
        if (agentAccountsEmail) {
          toEmail = agentAccountsEmail
          useAgentContact = true
        } else if (customerAccountsEmail) {
          toEmail = customerAccountsEmail
          useAgentContact = false
        } else if (agentEmailArray.length > 0 && agentEmailArray[0]) {
          toEmail = agentEmailArray[0]
          useAgentContact = true
        } else if (customerEmailArray.length > 0 && customerEmailArray[0]) {
          toEmail = customerEmailArray[0]
          useAgentContact = false
        }
      }
      
      // Build subject with customer reference and MRN if available
      const jobRef = clearance.jobRef || "N/A"
      const customerRef = clearance.customerReferenceNumber
      const mrn = clearance.mrn
      const yourRefPart = customerRef ? ` / Your Ref: ${customerRef}` : ""
      const mrnPart = mrn ? ` / MRN: ${mrn}` : ""
      const subject = `R.S Import Clearance Invoice / Our Ref: ${jobRef}${yourRefPart}${mrnPart}`
      
      // Build personalized greeting using agent or customer contact name (first name only)
      const contactNameField = useAgentContact ? customer?.agentContactName : customer?.contactName
      const contactNameArray = Array.isArray(contactNameField)
        ? contactNameField.filter(Boolean)
        : (contactNameField ? contactNameField.split('/').map(n => n.trim()).filter(Boolean) : [])
      
      // Extract first names only
      const firstNames = contactNameArray.map(name => name.split(' ')[0])
      
      let greeting = "Hi there"
      if (firstNames.length === 1) {
        greeting = `Hi ${firstNames[0]}`
      } else if (firstNames.length === 2) {
        greeting = `Hi ${firstNames[0]} and ${firstNames[1]}`
      } else if (firstNames.length >= 3) {
        const lastContact = firstNames[firstNames.length - 1]
        const otherContacts = firstNames.slice(0, -1).join(', ')
        greeting = `Hi ${otherContacts}, and ${lastContact}`
      }
      
      // Build custom clearance email body
      const body = `${greeting},\n\nPlease find attached invoice for this customs clearance.\n\nAny issues please let me know,`
      
      // Get invoice PDF paths with proper filenames (invoices/credits only, no clearance documents)
      const invoiceFiles = clearanceInvoices.map(invoice => ({
        url: `/api/invoices/${invoice.id}/pdf`,
        name: `${invoice.type === 'credit_note' ? 'RS Credit' : 'RS Invoice'} - ${invoice.jobRef}.pdf`
      }))
      
      // Open email composer
      openEmailComposer({
        id: `email-${Date.now()}`,
        to: toEmail,
        cc: ccEmails,
        bcc: "",
        subject: subject,
        body: body,
        attachments: invoiceFiles,
        metadata: {
          source: 'send-invoice-customer-clearance',
          shipmentId: clearance.id
        }
      })
    } catch (error) {
      console.error('Error opening email composer:', error)
      toast({
        title: "Failed to open email",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleSendCustomerGvmsEadEmail = (clearance: CustomClearance) => {
    try {
      const isImport = clearance.jobType === 'import'
      const isExport = clearance.jobType === 'export'

      // Check if clearance documents exist
      if (!clearance.clearanceDocuments || clearance.clearanceDocuments.length === 0) {
        toast({
          title: "No Documents Found",
          description: "No clearance documents are attached to this job. Please upload documents first.",
          variant: "destructive",
        })
        return
      }

      // Build email recipient data from job contact fields (handle both array and legacy string formats)
      const jobContactEmailArray = Array.isArray(clearance.jobContactEmail) 
        ? clearance.jobContactEmail 
        : (clearance.jobContactEmail ? [clearance.jobContactEmail] : [])
      const toEmail = jobContactEmailArray[0] || ""
      const ccEmails = jobContactEmailArray.slice(1).join(", ")
      
      // Build subject with conditional parts
      const jobRef = clearance.jobRef || "N/A"
      const customerRef = clearance.customerReferenceNumber
      const mrn = clearance.mrn
      
      const clearanceType = isImport ? "Import Clearance" : "Export Clearance"
      const yourRefPart = customerRef ? ` / Your Ref: ${customerRef}` : ""
      const mrnPart = mrn ? ` / MRN: ${mrn}` : ""
      const subject = `R.S ${clearanceType} / Our Ref: ${jobRef}${yourRefPart}${mrnPart}`
      
      // Build personalized greeting using job contact names
      const jobContactNameArray = Array.isArray(clearance.jobContactName)
        ? clearance.jobContactName.filter(Boolean)
        : (clearance.jobContactName ? clearance.jobContactName.split('/').map(n => n.trim()).filter(Boolean) : [])
      
      // Extract first names only
      const firstNames = jobContactNameArray.map(name => name.split(' ')[0])
      
      let greeting = "Hi there"
      if (firstNames.length === 1) {
        greeting = `Hi ${firstNames[0]}`
      } else if (firstNames.length === 2) {
        greeting = `Hi ${firstNames[0]} and ${firstNames[1]}`
      } else if (firstNames.length >= 3) {
        const lastContact = firstNames[firstNames.length - 1]
        const otherContacts = firstNames.slice(0, -1).join(', ')
        greeting = `Hi ${otherContacts}, and ${lastContact}`
      }
      
      // Build simple body with conditional text based on clearance type
      const attachmentText = isExport ? "EAD" : "clearance Document"
      const body = `${greeting},\n\nPlease find attached ${attachmentText} for this shipment.\n\nAny issues please let me know.`
      
      // Get clearance document paths with proper filenames
      const clearanceFiles = clearance.clearanceDocuments.map(doc => ({
        url: `/api/file-storage/download?path=${encodeURIComponent(getFilePath(doc))}`,
        name: getFileName(doc)
      }))
      
      // Determine metadata source based on clearance type
      const metadataSource = isExport ? 'send-customer-ead' : 'send-customer-gvms'
      
      // Open email composer
      openEmailComposer({
        id: `email-${Date.now()}`,
        to: toEmail,
        cc: ccEmails,
        bcc: "",
        subject: subject,
        body: body,
        attachments: clearanceFiles,
        metadata: {
          source: metadataSource,
          shipmentId: clearance.id,
          jobType: 'clearance'
        }
      })
    } catch (error) {
      console.error('Error opening email composer:', error)
      toast({
        title: "Failed to open email",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleConfirmInvoiceSelection = () => {
    if (!invoiceSelectionDialog) return
    
    const { clearance, invoices } = invoiceSelectionDialog
    const selectedInvoiceObjects = invoices.filter(inv => selectedInvoices.includes(inv.id))
    
    if (selectedInvoiceObjects.length === 0) {
      toast({
        title: "No Invoices Selected",
        description: "Please select at least one invoice to attach.",
        variant: "destructive",
      })
      return
    }

    const isImport = clearance.jobType === 'import'
    
    // Get the customer based on clearance type
    const customer = isImport
      ? importCustomers.find(c => c.id === clearance.importCustomerId)
      : exportCustomers.find(c => c.id === clearance.exportCustomerId)

    // Determine TO field with priority: Agent Accounts Email → Customer Accounts Email → Agent Email → Customer Email
    let toEmail = ""
    let ccEmails = ""
    let useAgentContact = false
    
    if (customer) {
      const agentAccountsEmail = customer.agentAccountsEmail
      const customerAccountsEmail = customer.accountsEmail
      const agentEmailArray = Array.isArray(customer.agentEmail) ? customer.agentEmail : (customer.agentEmail ? [customer.agentEmail] : [])
      const customerEmailArray = Array.isArray(customer.email) ? customer.email : (customer.email ? customer.email.split(',').map(e => e.trim()) : [])
      
      if (agentAccountsEmail) {
        toEmail = agentAccountsEmail
        useAgentContact = true
      } else if (customerAccountsEmail) {
        toEmail = customerAccountsEmail
        useAgentContact = false
      } else if (agentEmailArray.length > 0 && agentEmailArray[0]) {
        toEmail = agentEmailArray[0]
        ccEmails = agentEmailArray.slice(1).join(", ")
        useAgentContact = true
      } else if (customerEmailArray.length > 0 && customerEmailArray[0]) {
        toEmail = customerEmailArray[0]
        ccEmails = customerEmailArray.slice(1).join(", ")
        useAgentContact = false
      }
    }
    
    // Build subject with conditional parts
    const jobRef = clearance.jobRef || "N/A"
    const customerRef = clearance.customerReferenceNumber
    const mrn = clearance.mrn
    
    const clearanceType = isImport ? "Import Clearance Invoice" : "Export Clearance Invoice"
    const yourRefPart = customerRef ? ` / Your Ref: ${customerRef}` : ""
    const mrnPart = mrn ? ` / MRN: ${mrn}` : ""
    const subject = `R.S ${clearanceType} / Our Ref: ${jobRef}${yourRefPart}${mrnPart}`
    
    // Build personalized greeting using agent or customer contact name (first name only)
    const contactNameField = useAgentContact ? customer?.agentContactName : customer?.contactName
    const contactNameArray = Array.isArray(contactNameField)
      ? contactNameField.filter(Boolean)
      : (contactNameField ? contactNameField.split('/').map(n => n.trim()).filter(Boolean) : [])
    
    // Extract first names only
    const firstNames = contactNameArray.map(name => name.split(' ')[0])
    
    let greeting = "Hi there"
    if (firstNames.length === 1) {
      greeting = `Hi ${firstNames[0]}`
    } else if (firstNames.length === 2) {
      greeting = `Hi ${firstNames[0]} and ${firstNames[1]}`
    } else if (firstNames.length >= 3) {
      const lastContact = firstNames[firstNames.length - 1]
      const otherContacts = firstNames.slice(0, -1).join(', ')
      greeting = `Hi ${otherContacts}, and ${lastContact}`
    }
    
    // Build simple body
    const body = `${greeting},\n\nPlease find attached invoice for this customs clearance.\n\nAny issues please let me know,`
    
    // Get invoice PDF paths with proper filenames (invoices/credits only, no clearance documents)
    const invoiceFiles = selectedInvoiceObjects.map(invoice => ({
      url: `/api/invoices/${invoice.id}/pdf`,
      name: `${invoice.type === 'credit_note' ? 'RS Credit' : 'RS Invoice'} - ${invoice.jobRef}.pdf`
    }))
    
    // Open email composer
    openEmailComposer({
      id: `email-${Date.now()}`,
      to: toEmail,
      cc: ccEmails,
      bcc: "",
      subject: subject,
      body: body,
      attachments: invoiceFiles,
      metadata: {
        source: 'send-invoice-customer-clearance',
        shipmentId: clearance.id
      }
    })
    
    // Close dialog
    setInvoiceSelectionDialog(null)
    setSelectedInvoices([])
  }

  const handleSendHaulierEadEmail = (clearance: CustomClearance) => {
    const isImport = clearance.jobType === 'import'

    // Get haulier email(s) from clearance - support both array and legacy string format
    const haulierEmailField = clearance.haulierEmail
    const haulierEmails = Array.isArray(haulierEmailField)
      ? haulierEmailField.filter(Boolean)
      : typeof haulierEmailField === 'string' && haulierEmailField
        ? haulierEmailField.split(',').map(e => e.trim()).filter(Boolean)
        : []

    // Get haulier contact name(s) from clearance - support both array and legacy string format
    const haulierContactField = clearance.haulierContactName
    const haulierContacts = Array.isArray(haulierContactField)
      ? haulierContactField.filter(Boolean)
      : typeof haulierContactField === 'string' && haulierContactField
        ? haulierContactField.split('/').map(c => c.trim()).filter(Boolean)
        : []

    // Extract first names only from contact names
    const firstNames = haulierContacts.map(name => name.split(' ')[0])

    // Build "Hi" greeting line with proper grammar using first names only
    let greeting = "Hi there"
    if (firstNames.length === 1) {
      greeting = `Hi ${firstNames[0]}`
    } else if (firstNames.length === 2) {
      greeting = `Hi ${firstNames[0]} and ${firstNames[1]}`
    } else if (firstNames.length > 2) {
      const lastContact = firstNames[firstNames.length - 1]
      const otherContacts = firstNames.slice(0, -1).join(', ')
      greeting = `Hi ${otherContacts}, and ${lastContact}`
    }

    // Build subject based on clearance type
    let subject = isImport 
      ? `Import Job Update - Import GVMS Document / Our Ref: ${clearance.jobRef}`
      : `Export Job Update - Export Entry / Our Ref: ${clearance.jobRef}`
    
    // Add trailer/container number if available
    if (clearance.trailerOrContainerNumber) {
      let numberLabel = "Trailer Number"
      if (clearance.containerShipment === "Air Freight") {
        numberLabel = "Flight Number"
      } else if (clearance.containerShipment === "Container Shipment") {
        numberLabel = "Container Number"
      }
      subject += ` / ${numberLabel}: ${clearance.trailerOrContainerNumber}`
    }
    
    // Add haulier reference if available
    if (clearance.haulierReference) {
      subject += ` / Your Ref: ${clearance.haulierReference}`
    }

    // Build email body with conditional attachment text based on clearance type
    let attachmentText = "Export Entry"
    if (isImport) {
      attachmentText = "Import Entry"
    } else if (clearance.containerShipment === "Air Freight") {
      attachmentText = "Airway Bill"
    }
    const body = `${greeting},\n\nPlease find attached ${attachmentText} for this shipment.\n\nHope all is OK.`

    // Only attach clearance documents (exclude transport docs), formatted with url and name properties
    const clearanceFiles = clearance.clearanceDocuments?.map(doc => ({
      url: `/api/file-storage/download?path=${encodeURIComponent(getFilePath(doc))}`,
      name: getFileName(doc)
    })) || []

    // Open email composer with clearance documents only
    openEmailComposer({
      id: `email-${Date.now()}`,
      to: haulierEmails.join(', '),
      cc: '',
      bcc: '',
      subject,
      body,
      attachments: clearanceFiles,
      metadata: {
        source: 'send-haulier-ead',
        shipmentId: clearance.id,
        jobType: 'clearance',
      },
    })
  }

  const handleSendEntryStatusUpdate = (id: string, status: number) => {
    if (status === 4) {
      setRedButtonPrompt({ clearanceId: id, statusType: 'sendEntry', statusValue: status })
    } else {
      updateSendEntryStatus.mutate({ id, status })
    }
  }

  const handleInvoiceStatusUpdate = (id: string, status: number) => {
    if (status === 4) {
      setRedButtonPrompt({ clearanceId: id, statusType: 'invoice', statusValue: status })
    } else {
      updateInvoiceStatus.mutate({ id, status })
    }
  }

  const handleSendClearedEntryStatusUpdate = (id: string, status: number) => {
    if (status === 4) {
      setRedButtonPrompt({ clearanceId: id, statusType: 'sendClearedEntry', statusValue: status })
    } else {
      updateSendClearedEntryStatus.mutate({ id, status })
    }
  }

  const handleRedButtonConfirm = (openNotes: boolean) => {
    if (!redButtonPrompt) return

    // Update the status
    const { clearanceId, statusType, statusValue } = redButtonPrompt
    switch (statusType) {
      case 'adviseAgent':
        updateAdviseAgentStatus.mutate({ id: clearanceId, status: statusValue })
        break
      case 'sendEntry':
        updateSendEntryStatus.mutate({ id: clearanceId, status: statusValue })
        break
      case 'invoice':
        updateInvoiceStatus.mutate({ id: clearanceId, status: statusValue })
        break
      case 'sendClearedEntry':
        updateSendClearedEntryStatus.mutate({ id: clearanceId, status: statusValue })
        break
    }

    // If user wants to add notes, open the notes dialog
    if (openNotes) {
      const clearance = clearances.find(c => c.id === clearanceId)
      if (clearance) {
        setNotesClearanceId(clearanceId)
        setNotesValue(clearance.additionalNotes || "")
      }
    }

    setRedButtonPrompt(null)
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

  const handleDeleteFile = (id: string, filePath: string, fileType: "transport" | "clearance", fileName: string) => {
    setDeletingFile({ id, filePath, fileType, fileName })
  }

  const confirmDeleteFile = () => {
    if (deletingFile) {
      deleteFile.mutate({ 
        id: deletingFile.id, 
        filePath: deletingFile.filePath, 
        fileType: deletingFile.fileType,
        fileName: deletingFile.fileName
      })
      setDeletingFile(null)
    }
  }

  const handleCreateNew = () => {
    openWindow({
      id: `custom-clearance-new-${Date.now()}`,
      type: 'custom-clearance',
      title: 'New Custom Clearance',
      payload: {
        mode: 'create' as const,
        defaultValues: {}
      }
    })
  }

  const handleEdit = (clearance: CustomClearance) => {
    openWindow({
      id: `custom-clearance-${clearance.id}`,
      type: 'custom-clearance',
      title: `Edit Custom Clearance #${clearance.jobRef}`,
      payload: {
        mode: 'edit' as const,
        defaultValues: clearance
      }
    })
  }

  const handleDelete = (id: string) => {
    setDeletingClearanceId(id)
  }

  const confirmDelete = () => {
    if (!deletingClearanceId) return
    deleteClearance.mutate(deletingClearanceId)
    setDeletingClearanceId(null)
  }

  const getCustomerName = (clearance: CustomClearance) => {
    if (clearance.jobType === "import" && clearance.importCustomerId) {
      const customer = importCustomers.find(c => c.id === clearance.importCustomerId)
      return customer?.companyName || "N/A"
    } else if (clearance.jobType === "export" && clearance.exportCustomerId) {
      const exportCustomer = exportCustomers.find(c => c.id === clearance.exportCustomerId)
      return exportCustomer?.companyName || "N/A"
    }
    return "N/A"
  }

  const parseAttachments = (attachments: any[] | null) => {
    if (!attachments) return []
    // Extract paths from file objects or return strings directly for backwards compatibility
    return attachments.map(file => getFilePath(file))
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

  const handleFileClick = (e: React.MouseEvent, file: any) => {
    const fileName = getFileName(file)
    const filePath = getFilePath(file)
    const fileExtension = fileName.split('.').pop()?.toLowerCase()
    
    if (fileExtension === 'pdf') {
      e.preventDefault()
      const downloadPath = normalizeFilePath(filePath)
      setViewingPdf({ url: downloadPath, name: fileName })
    }
  }

  const handleClearanceAgentSelected = (agent: ClearanceAgent) => {
    try {
      if (!clearanceAgentDialog) return
      
      const clearance = clearances.find(c => c.id === clearanceAgentDialog.clearanceId)
      if (!clearance) return
      
      // Get customer based on job type
      let customerName = "N/A"
      let vatPaymentMethod = "N/A"
      
      if (clearance.jobType === "import") {
        const customer = importCustomers.find(c => c.id === clearance.importCustomerId)
        customerName = customer?.companyName || "N/A"
        vatPaymentMethod = customer?.vatPaymentMethod || "N/A"
      } else {
        const customer = exportCustomers.find(c => c.id === clearance.exportCustomerId)
        customerName = customer?.companyName || "N/A"
      }
      
      // Build email subject
      const truckContainerFlight = clearance.trailerOrContainerNumber || "TBA"
      const eta = formatDate(clearance.etaPort) || "TBA"
      
      let subject: string
      if (clearance.jobType === "export") {
        // Export subject: no ETA field
        subject = `Export Clearance / ${customerName} / Our Ref : ${clearance.jobRef} / ${truckContainerFlight}`
      } else {
        // Import subject: includes ETA
        subject = `Import Clearance / ${customerName} / Our Ref : ${clearance.jobRef} / ${truckContainerFlight} / ETA : ${eta}`
      }
      
      // Build email body
      const clearanceTypeText = clearance.jobType === "export" ? "an Export Clearance" : "clearance"
      let body = `Hi Team,\n\nPlease could you arrange ${clearanceTypeText} on the below shipment. Our Ref : ${clearance.jobRef}\n\n`
      
      const arrivalDepartureText = clearance.jobType === "export" ? "depart" : "arrive"
      body += `Consignment will ${arrivalDepartureText} on ${clearance.containerShipment === "Road Shipment" ? "Trailer" : clearance.containerShipment === "Air Freight" ? "Flight" : "Container"} : ${clearance.trailerOrContainerNumber || "TBA"} Into ${clearance.portOfArrival || "TBA"} on ${formatDate(clearance.etaPort) || "TBA"}.\n\n`
      
      // Add customer name with prefix for exports
      if (clearance.jobType === "export") {
        body += `Exporter : ${customerName}\n`
      } else {
        body += `${customerName}\n`
      }
      
      body += `${clearance.numberOfPieces || ""} ${clearance.packaging || ""}.\n`
      body += `${clearance.goodsDescription || ""}\n`
      
      // Add weight with "kgs" suffix if weight exists
      const weightText = clearance.weight ? `${clearance.weight} kgs` : ""
      body += `${weightText}, Invoice value ${clearance.currency || ""} ${clearance.invoiceValue || ""}\n`
      
      // Add VAT info for import clearances
      if (clearance.jobType === "import") {
        const displayVatMethod = vatPaymentMethod === "R.S Deferment" ? "Via Your Deferment" : vatPaymentMethod
        body += `\nVAT Payment Method : ${displayVatMethod}\n`
        
        if (clearance.vatZeroRated) {
          body += `VAT Zero Rated\n`
        }
        
        // Add clearance type only for imports
        body += `Clearance Type : ${clearance.clearanceType || "N/A"}\n`
      }
      
      // Add closing signature
      body += `\nKind Regards,`
      
      // Get agent's email based on job type
      const agentEmail = clearance.jobType === "import" 
        ? (agent.agentImportEmail && agent.agentImportEmail.length > 0 ? agent.agentImportEmail[0] : "")
        : (agent.agentExportEmail && agent.agentExportEmail.length > 0 ? agent.agentExportEmail[0] : "")
      
      // Get transport documents with original filenames - work directly with file objects
      const transportDocObjects = clearance.transportDocuments || []
      const transportDocs = transportDocObjects.map(file => ({
        url: `/api/file-storage/download?path=${encodeURIComponent(getFilePath(file))}`,
        name: getFileName(file)
      })).filter(doc => doc.url)
      
      // Open email composer
      openEmailComposer({
        id: `email-${Date.now()}`,
        to: agentEmail || "",
        cc: "",
        bcc: "",
        subject: subject || `${clearance.jobType === "import" ? "Import" : "Export"} Clearance`,
        body: body || "",
        attachments: transportDocs || [],
        metadata: {
          source: 'advise-clearance-agent',
          shipmentId: clearance.id,
          jobType: 'clearance'
        }
      })
      
      setClearanceAgentDialog(null)
    } catch (error) {
      console.error('Error opening email composer:', error)
      toast({
        title: "Failed to open email",
        description: "Please try again",
        variant: "destructive",
      })
      setClearanceAgentDialog(null)
    }
  }

  const handleAdviseAgentEmail = (clearance: CustomClearance) => {
    try {
      // Get customer based on job type
      let customerName = "N/A"
      let vatPaymentMethod = "N/A"
      
      if (clearance.jobType === "import") {
        const customer = importCustomers.find(c => c.id === clearance.importCustomerId)
        customerName = customer?.companyName || "N/A"
        vatPaymentMethod = customer?.vatPaymentMethod || "N/A"
      } else {
        const customer = exportCustomers.find(c => c.id === clearance.exportCustomerId)
        customerName = customer?.companyName || "N/A"
      }
      
      // Build email subject
      const truckContainerFlight = clearance.trailerOrContainerNumber || "TBA"
      const eta = formatDate(clearance.etaPort) || "TBA"
      
      let subject: string
      if (clearance.jobType === "export") {
        // Export subject: no ETA field
        subject = `Export Clearance / ${customerName} / Our Ref : ${clearance.jobRef} / ${truckContainerFlight}`
      } else {
        // Import subject: includes ETA
        subject = `Import Clearance / ${customerName} / Our Ref : ${clearance.jobRef} / ${truckContainerFlight} / ETA : ${eta}`
      }
      
      // Build email body
      const clearanceTypeText = clearance.jobType === "export" ? "an Export Clearance" : "clearance"
      let body = `Hi Team,\n\nPlease could you arrange ${clearanceTypeText} on the below shipment. Our Ref : ${clearance.jobRef}\n\n`
      
      const arrivalDepartureText = clearance.jobType === "export" ? "depart" : "arrive"
      body += `Consignment will ${arrivalDepartureText} on ${clearance.containerShipment === "Road Shipment" ? "Trailer" : clearance.containerShipment === "Air Freight" ? "Flight" : "Container"} : ${clearance.trailerOrContainerNumber || "TBA"} Into ${clearance.portOfArrival || "TBA"} on ${formatDate(clearance.etaPort) || "TBA"}.\n\n`
      
      // Add customer name with prefix for exports
      if (clearance.jobType === "export") {
        body += `Exporter : ${customerName}\n`
      } else {
        body += `${customerName}\n`
      }
      
      body += `${clearance.numberOfPieces || ""} ${clearance.packaging || ""}.\n`
      body += `${clearance.goodsDescription || ""}\n`
      
      // Format currency with symbol and decimals
      const formatCurrency = (currency: string | null, value: string | number | null) => {
        if (!currency || !value) return ""
        const numValue = typeof value === 'string' ? parseFloat(value) : value
        if (isNaN(numValue)) return ""
        const formatted = numValue.toFixed(2)
        if (currency === "GBP") return `£${formatted}`
        if (currency === "USD") return `$${formatted}`
        if (currency === "EUR") return `€${formatted}`
        return `${currency} ${formatted}`
      }
      
      // Add weight with "kgs" suffix and formatted currency
      const weightText = clearance.weight ? `${clearance.weight} kgs` : ""
      const currencyText = formatCurrency(clearance.currency, clearance.invoiceValue)
      const invoiceValueText = currencyText ? `Invoice value ${currencyText}` : ""
      body += `${weightText}${weightText && invoiceValueText ? ", " : ""}${invoiceValueText}\n`
      
      // Add VAT info for import clearances
      if (clearance.jobType === "import") {
        const displayVatMethod = vatPaymentMethod === "R.S Deferment" ? "Via Your Deferment" : vatPaymentMethod
        body += `\nVAT Payment Method : ${displayVatMethod}\n`
        
        if (clearance.vatZeroRated) {
          body += `VAT Zero Rated\n`
        }
        
        // Add clearance type only for imports
        body += `Clearance Type : ${clearance.clearanceType || "N/A"}\n`
      }
      
      // Add closing signature
      body += `\nKind Regards,`
      
      // Lookup agent email based on clearance agent name
      let agentEmail = ""
      if (clearance.clearanceAgent) {
        const agent = clearanceAgents.find(a => a.agentName === clearance.clearanceAgent)
        if (agent) {
          agentEmail = clearance.jobType === "import" 
            ? (agent.agentImportEmail && agent.agentImportEmail.length > 0 ? agent.agentImportEmail[0] : "")
            : (agent.agentExportEmail && agent.agentExportEmail.length > 0 ? agent.agentExportEmail[0] : "")
        }
      }
      
      // Get transport documents with original filenames - work directly with file objects
      const attachmentObjects = clearance.transportDocuments || []
      const transportDocs = attachmentObjects.map(file => ({
        url: `/api/file-storage/download?path=${encodeURIComponent(getFilePath(file))}`,
        name: getFileName(file)
      })).filter(doc => doc.url)
      
      // Open email composer with auto-populated TO field (or empty if no agent found)
      openEmailComposer({
        id: `email-${Date.now()}`,
        to: agentEmail,
        cc: "",
        bcc: "",
        subject: subject || `${clearance.jobType === "import" ? "Import" : "Export"} Clearance`,
        body: body || "",
        attachments: transportDocs || [],
        metadata: {
          source: 'advise-clearance-agent',
          shipmentId: clearance.id,
          jobType: 'clearance'
        }
      })
    } catch (error) {
      console.error('Error opening email composer:', error)
      toast({
        title: "Failed to open email",
        description: "Please try again",
        variant: "destructive",
      })
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
      case "Request CC":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
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

  const filteredByType = selectedShipmentTypes.length === 0
    ? filteredByStatus
    : filteredByStatus.filter(c => c.containerShipment && selectedShipmentTypes.includes(c.containerShipment))

  const allFilteredClearances = searchText.trim() === ""
    ? filteredByType
    : filteredByType.filter(c => {
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
  
  // Reset to first page when filters or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchText, selectedStatuses, selectedShipmentTypes])
  
  // Pagination
  const totalPages = Math.ceil(allFilteredClearances.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const filteredClearances = allFilteredClearances.slice(startIndex, endIndex)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Custom Clearances</h1>
          <p className="text-muted-foreground">
            Manage customs clearance operations for import and export shipments
          </p>
        </div>
        <Button data-testid="button-new-clearance" onClick={handleCreateNew} className="border border-border bg-purple-100 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-black dark:text-foreground">
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
        <div className="flex gap-2">
          <Button
            variant={selectedShipmentTypes.includes("Container Shipment") ? "default" : "outline"}
            size="sm"
            className={selectedShipmentTypes.includes("Container Shipment") ? "border border-border bg-purple-100 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-black dark:text-foreground" : ""}
            onClick={() => {
              setSelectedShipmentTypes(prev => {
                if (prev.includes("Container Shipment") && prev.length === 1) {
                  return prev
                }
                return prev.includes("Container Shipment") 
                  ? prev.filter(t => t !== "Container Shipment")
                  : [...prev, "Container Shipment"]
              })
            }}
            data-testid="filter-containers"
          >
            <Container className="h-4 w-4 mr-1" />
            Containers
          </Button>
          <Button
            variant={selectedShipmentTypes.includes("Road Shipment") ? "default" : "outline"}
            size="sm"
            className={selectedShipmentTypes.includes("Road Shipment") ? "border border-border bg-purple-100 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-black dark:text-foreground" : ""}
            onClick={() => {
              setSelectedShipmentTypes(prev => {
                if (prev.includes("Road Shipment") && prev.length === 1) {
                  return prev
                }
                return prev.includes("Road Shipment") 
                  ? prev.filter(t => t !== "Road Shipment")
                  : [...prev, "Road Shipment"]
              })
            }}
            data-testid="filter-road"
          >
            <Truck className="h-4 w-4 mr-1" />
            Road Transport
          </Button>
          <Button
            variant={selectedShipmentTypes.includes("Air Freight") ? "default" : "outline"}
            size="sm"
            className={selectedShipmentTypes.includes("Air Freight") ? "border border-border bg-purple-100 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-black dark:text-foreground" : ""}
            onClick={() => {
              setSelectedShipmentTypes(prev => {
                if (prev.includes("Air Freight") && prev.length === 1) {
                  return prev
                }
                return prev.includes("Air Freight") 
                  ? prev.filter(t => t !== "Air Freight")
                  : [...prev, "Air Freight"]
              })
            }}
            data-testid="filter-air"
          >
            <Plane className="h-4 w-4 mr-1" />
            Air Freight
          </Button>
        </div>
        <div className="h-8 w-px bg-border"></div>
        <div className="flex gap-2 flex-wrap" data-testid="status-filters">
        <Button
          variant={selectedStatuses.length === 0 ? "default" : "outline"}
          size="sm"
          className={selectedStatuses.length === 0 ? "border border-border bg-purple-100 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-black dark:text-foreground" : ""}
          onClick={handleAllClick}
          data-testid="filter-all"
        >
          All
        </Button>
        <Button
          variant={selectedStatuses.includes("Request CC") ? "default" : "outline"}
          size="sm"
          className={selectedStatuses.includes("Request CC") ? "border border-border bg-purple-100 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-black dark:text-foreground" : ""}
          onClick={() => handleStatusToggle("Request CC")}
          data-testid="filter-request-cc"
        >
          Request CC
        </Button>
        <Button
          variant={selectedStatuses.includes("Awaiting Entry") ? "default" : "outline"}
          size="sm"
          className={selectedStatuses.includes("Awaiting Entry") ? "border border-border bg-purple-100 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-black dark:text-foreground" : ""}
          onClick={() => handleStatusToggle("Awaiting Entry")}
          data-testid="filter-awaiting-entry"
        >
          Awaiting Entry
        </Button>
        <Button
          variant={selectedStatuses.includes("Waiting Arrival") ? "default" : "outline"}
          size="sm"
          className={selectedStatuses.includes("Waiting Arrival") ? "border border-border bg-purple-100 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-black dark:text-foreground" : ""}
          onClick={() => handleStatusToggle("Waiting Arrival")}
          data-testid="filter-waiting-arrival"
        >
          Waiting Arrival
        </Button>
        <Button
          variant={selectedStatuses.includes("P.H Hold") ? "default" : "outline"}
          size="sm"
          className={selectedStatuses.includes("P.H Hold") ? "border border-border bg-purple-100 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-black dark:text-foreground" : ""}
          onClick={() => handleStatusToggle("P.H Hold")}
          data-testid="filter-ph-hold"
        >
          P.H Hold
        </Button>
        <Button
          variant={selectedStatuses.includes("Customs Issue") ? "default" : "outline"}
          size="sm"
          className={selectedStatuses.includes("Customs Issue") ? "border border-border bg-purple-100 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-black dark:text-foreground" : ""}
          onClick={() => handleStatusToggle("Customs Issue")}
          data-testid="filter-customs-issue"
        >
          Customs Issue
        </Button>
        <Button
          variant={selectedStatuses.includes("Fully Cleared") ? "default" : "outline"}
          size="sm"
          className={selectedStatuses.includes("Fully Cleared") ? "border border-border bg-purple-100 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-black dark:text-foreground" : ""}
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
            const transportDocs = sharedDocs.length > 0 ? sharedDocs : (clearance.transportDocuments || [])
            const clearanceDocs = clearance.clearanceDocuments || []
            const totalFiles = transportDocs.length + clearanceDocs.length
            const hasNotes = clearance.additionalNotes && clearance.additionalNotes.trim().length > 0

            return (
              <Card key={clearance.id} data-testid={`card-clearance-${clearance.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <h3 
                          className={`font-semibold text-lg ${clearance.createdFromId ? 'text-purple-600 dark:text-purple-400 hover:underline cursor-pointer' : ''}`}
                          onClick={() => {
                            if (clearance.createdFromId) {
                              const targetPage = clearance.jobType === 'import' ? '/import-shipments' : '/export-shipments'
                              setLocation(`${targetPage}?search=${clearance.jobRef}`)
                            }
                          }}
                          data-testid={`text-job-ref-${clearance.id}`}
                        >
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
                          {!clearance.createdFromId && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(clearance)}
                              data-testid={`button-edit-${clearance.id}`}
                              className="h-7 w-7"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(clearance.id)}
                            data-testid={`button-delete-${clearance.id}`}
                            className="h-7 w-7"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {clearance.createdFromId && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Linked to shipment"
                              data-testid={`button-link-${clearance.id}`}
                              className="h-7 w-7"
                            >
                              <Link2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </Button>
                          )}
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
                          <DropdownMenuItem onClick={() => updateClearanceStatus.mutate({ id: clearance.id, status: "Request CC" })}>
                            Request CC
                          </DropdownMenuItem>
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
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        clearance.jobType === 'import' 
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                          : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      }`}>
                        {clearance.jobType}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    {clearance.trailerOrContainerNumber && (
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold" data-testid={`text-trailer-${clearance.id}`}>
                          {clearance.trailerOrContainerNumber}
                        </p>
                        {clearance.etaPort && (
                          <p className="text-lg font-semibold text-right" data-testid={`text-eta-${clearance.id}`}>
                            ETA: {formatDate(clearance.etaPort)}
                          </p>
                        )}
                      </div>
                    )}
                    {clearance.portOfArrival && (
                      <p data-testid={`text-port-${clearance.id}`}>
                        <span className="font-medium">
                          {clearance.containerShipment === "Road Shipment" 
                            ? "Destination:" 
                            : clearance.containerShipment === "Air Freight"
                            ? "Airport:"
                            : "Port:"}
                        </span> {clearance.portOfArrival}
                        {clearance.clearanceType && (
                          <span data-testid={`text-clearance-type-${clearance.id}`}>
                            {" | "}
                            <span className="font-medium">Clearance Type:</span> {clearance.jobType === "export" ? "EAD" : clearance.clearanceType}
                          </span>
                        )}
                      </p>
                    )}
                    {clearance.mrn && (
                      <p data-testid={`text-mrn-${clearance.id}`}>
                        <span className="font-medium">MRN:</span> {clearance.mrn}
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
                            <ClipboardCheck 
                              className="h-4 w-4 text-muted-foreground hover:text-purple-500 shrink-0 cursor-pointer hover-elevate active-elevate-2 transition-colors" 
                              onClick={() => handleAdviseAgentEmail(clearance)}
                              data-testid={`button-advise-agent-email-${clearance.id}`}
                            />
                            <button
                              onClick={() => setClearanceAgentDialog({ show: true, clearanceId: clearance.id })}
                              className={`text-xs ${getStatusColor(clearance.adviseAgentStatusIndicator)} font-medium hover:underline cursor-pointer flex items-center gap-1`}
                              data-testid={`button-advise-clearance-${clearance.id}`}
                            >
                              Advise Clearance To Agent
                              {clearance.adviseAgentStatusIndicator === 3 && <Check className="h-3 w-3" />}
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleAdviseAgentStatusUpdate(clearance.id, 1)}
                              className={`h-5 w-5 rounded border-2 transition-all ${
                                clearance.adviseAgentStatusIndicator === 1 || clearance.adviseAgentStatusIndicator === null
                                  ? 'bg-yellow-400 border-yellow-500 scale-110'
                                  : 'bg-yellow-200 border-yellow-300 hover:bg-purple-300 hover:border-purple-400 transition-colors'
                              }`}
                              data-testid={`button-advise-yellow-${clearance.id}`}
                              title="To Do"
                            />
                            <button
                              onClick={() => handleAdviseAgentStatusUpdate(clearance.id, 3)}
                              className={`h-5 w-5 rounded border-2 transition-all ${
                                clearance.adviseAgentStatusIndicator === 3
                                  ? 'bg-green-400 border-green-500 scale-110'
                                  : 'bg-green-200 border-green-300 hover:bg-purple-300 hover:border-purple-400 transition-colors'
                              }`}
                              data-testid={`button-advise-green-${clearance.id}`}
                              title="Completed"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (clearance.jobType === 'export') {
                                  handleSendHaulierEadEmail(clearance)
                                } else {
                                  handleSendHaulierEadEmail(clearance)
                                }
                              }}
                              className="hover-elevate rounded p-0 shrink-0"
                              data-testid={`button-send-haulier-ead-icon-${clearance.id}`}
                            >
                              <Mail className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-purple-500 transition-colors" />
                            </button>
                            <p className={`text-xs ${getStatusColor(clearance.sendHaulierEadStatusIndicator)} font-medium flex items-center gap-1`} data-testid={`todo-send-haulier-ead-${clearance.id}`}>
                              {clearance.jobType === 'export' ? 'Send Haulier EAD' : 'Send Haulier GVMS'}
                              {clearance.sendHaulierEadStatusIndicator === 3 && <Check className="h-3 w-3" />}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSendHaulierEadStatusUpdate(clearance.id, 1)}
                              className={`h-5 w-5 rounded border-2 transition-all ${
                                clearance.sendHaulierEadStatusIndicator === 1 || clearance.sendHaulierEadStatusIndicator === null
                                  ? 'bg-yellow-400 border-yellow-500 scale-110'
                                  : 'bg-yellow-200 border-yellow-300 hover:bg-purple-300 hover:border-purple-400 transition-colors'
                              }`}
                              data-testid={`button-send-haulier-ead-yellow-${clearance.id}`}
                              title="To Do"
                            />
                            <button
                              onClick={() => handleSendHaulierEadStatusUpdate(clearance.id, 3)}
                              className={`h-5 w-5 rounded border-2 transition-all ${
                                clearance.sendHaulierEadStatusIndicator === 3
                                  ? 'bg-green-400 border-green-500 scale-110'
                                  : 'bg-green-200 border-green-300 hover:bg-purple-300 hover:border-purple-400 transition-colors'
                              }`}
                              data-testid={`button-send-haulier-ead-green-${clearance.id}`}
                              title="Completed"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleSendCustomerGvmsEadEmail(clearance)}
                              className="hover-elevate active-elevate-2 p-0 rounded shrink-0"
                              data-testid={`button-send-customer-doc-email-${clearance.id}`}
                              title="Send GVMS/EAD email to customer"
                            >
                              <Mail className="h-4 w-4 text-muted-foreground hover:text-purple-500 transition-colors" />
                            </button>
                            <p className={`text-xs ${getStatusColor(clearance.jobType === 'export' ? clearance.sendCustomerEadStatusIndicator : clearance.sendCustomerGvmsStatusIndicator)} font-medium flex items-center gap-1`} data-testid={`todo-send-customer-${clearance.id}`}>
                              {clearance.jobType === 'export' ? 'Send Customer EAD' : 'Send Customer GVMS'}
                              {(clearance.jobType === 'export' ? clearance.sendCustomerEadStatusIndicator : clearance.sendCustomerGvmsStatusIndicator) === 3 && <Check className="h-3 w-3" />}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                if (clearance.jobType === 'export') {
                                  handleSendCustomerEadStatusUpdate(clearance.id, 1)
                                } else {
                                  handleSendCustomerGvmsStatusUpdate(clearance.id, 1)
                                }
                              }}
                              className={`h-5 w-5 rounded border-2 transition-all ${
                                (clearance.jobType === 'export' ? clearance.sendCustomerEadStatusIndicator : clearance.sendCustomerGvmsStatusIndicator) === 1 || (clearance.jobType === 'export' ? clearance.sendCustomerEadStatusIndicator : clearance.sendCustomerGvmsStatusIndicator) === null
                                  ? 'bg-yellow-400 border-yellow-500 scale-110'
                                  : 'bg-yellow-200 border-yellow-300 hover:bg-purple-300 hover:border-purple-400 transition-colors'
                              }`}
                              data-testid={`button-send-customer-yellow-${clearance.id}`}
                              title="To Do"
                            />
                            <button
                              onClick={() => {
                                if (clearance.jobType === 'export') {
                                  handleSendCustomerEadStatusUpdate(clearance.id, 3)
                                } else {
                                  handleSendCustomerGvmsStatusUpdate(clearance.id, 3)
                                }
                              }}
                              className={`h-5 w-5 rounded border-2 transition-all ${
                                (clearance.jobType === 'export' ? clearance.sendCustomerEadStatusIndicator : clearance.sendCustomerGvmsStatusIndicator) === 3
                                  ? 'bg-green-400 border-green-500 scale-110'
                                  : 'bg-green-200 border-green-300 hover:bg-purple-300 hover:border-purple-400 transition-colors'
                              }`}
                              data-testid={`button-send-customer-green-${clearance.id}`}
                              title="Completed"
                            />
                          </div>
                        </div>

                        {!clearance.createdFromId && (
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleSendInvoiceToCustomerEmail(clearance)}
                                className="hover-elevate active-elevate-2 p-0 rounded shrink-0"
                                data-testid={`button-send-invoice-email-${clearance.id}`}
                                title="Send invoice email to customer"
                              >
                                <PoundSterling className="h-4 w-4 text-muted-foreground hover:text-purple-500 transition-colors" />
                              </button>
                              <button
                                onClick={() => openWindow({ 
                                  type: 'customer-invoice',
                                  title: `Invoice - CC#${clearance.jobRef}`,
                                  id: `invoice-${clearance.id}-${Date.now()}`, 
                                  payload: { job: clearance, jobType: 'clearance' } 
                                })}
                                className={`text-xs ${getStatusColor(clearance.invoiceCustomerStatusIndicator)} font-medium hover:underline cursor-pointer flex items-center gap-1`}
                                data-testid={`button-invoice-customer-${clearance.id}`}
                              >
                                Send Invoice/Credit to Customer
                                {clearance.invoiceCustomerStatusIndicator === 3 && <Check className="h-3 w-3" />}
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleInvoiceStatusUpdate(clearance.id, 1)}
                                className={`h-5 w-5 rounded border-2 transition-all ${
                                  clearance.invoiceCustomerStatusIndicator === 1 || clearance.invoiceCustomerStatusIndicator === null
                                    ? 'bg-yellow-400 border-yellow-500 scale-110'
                                    : 'bg-yellow-200 border-yellow-300 hover:bg-purple-300 hover:border-purple-400 transition-colors'
                                }`}
                                data-testid={`button-invoice-yellow-${clearance.id}`}
                                title="To Do"
                              />
                              <button
                                onClick={() => handleInvoiceStatusUpdate(clearance.id, 3)}
                                className={`h-5 w-5 rounded border-2 transition-all ${
                                  clearance.invoiceCustomerStatusIndicator === 3
                                    ? 'bg-green-400 border-green-500 scale-110'
                                    : 'bg-green-200 border-green-300 hover:bg-purple-300 hover:border-purple-400 transition-colors'
                                }`}
                                data-testid={`button-invoice-green-${clearance.id}`}
                                title="Completed"
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
                                {transportDocs.map((file, idx) => {
                                  const fileName = getFileName(file)
                                  const filePath = getFilePath(file)
                                  const downloadPath = normalizeFilePath(filePath)
                                  return (
                                    <div key={idx} className="flex items-center gap-1 group">
                                      <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <a
                                        href={downloadPath}
                                        onClick={(e) => handleFileClick(e, file)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs truncate hover:text-primary flex-1 cursor-pointer"
                                        title={fileName}
                                        data-testid={`link-transport-doc-${clearance.id}-${idx}`}
                                      >
                                        {fileName}
                                      </a>
                                      <button
                                        onClick={() => handleDeleteFile(clearance.id, filePath, "transport", fileName)}
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
                                {clearanceDocs.map((file, idx) => {
                                  const fileName = getFileName(file)
                                  const filePath = getFilePath(file)
                                  const downloadPath = normalizeFilePath(filePath)
                                  return (
                                    <div key={idx} className="flex items-center gap-1 group">
                                      <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <a
                                        href={downloadPath}
                                        onClick={(e) => handleFileClick(e, file)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs truncate hover:text-primary flex-1 cursor-pointer"
                                        title={fileName}
                                        data-testid={`link-clearance-doc-${clearance.id}-${idx}`}
                                      >
                                        {fileName}
                                      </a>
                                      <button
                                        onClick={() => handleDeleteFile(clearance.id, filePath, "clearance", fileName)}
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
                      {!clearance.createdFromId && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-muted-foreground">R.S Invoice & Credits</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => openWindow({ 
                                  type: 'customer-invoice',
                                  title: `Invoice - CC#${clearance.jobRef}`,
                                  id: `invoice-${clearance.id}-${Date.now()}`, 
                                  payload: { job: clearance, jobType: 'clearance' } 
                                })}
                                data-testid={`button-create-invoice-${clearance.id}`}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                <span className="text-xs">Invoice</span>
                              </Button>
                            </div>
                            {(() => {
                              const clearanceInvoices = allInvoices.filter(inv => 
                                inv.jobRef === clearance.jobRef && inv.jobType === 'clearance' && inv.jobId === clearance.id
                              )
                              return clearanceInvoices.length > 0 ? (
                                <div className="grid grid-cols-2 gap-1">
                                  {clearanceInvoices.map((invoice) => {
                                    const isCredit = invoice.type === 'credit_note'
                                    const prefix = isCredit ? 'CR' : 'INV'
                                    const colorClass = isCredit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                    return (
                                    <div key={invoice.id} className="flex items-center gap-1 group">
                                      <span
                                        className={`text-xs ${colorClass} hover:underline cursor-pointer truncate flex-1`}
                                        title={`${prefix} ${invoice.invoiceNumber} - £${invoice.total.toFixed(2)}`}
                                      >
                                        {prefix} {invoice.invoiceNumber} - £{invoice.total.toFixed(2)}
                                      </span>
                                      <button
                                        onClick={() => openWindow({ 
                                          type: 'customer-invoice',
                                          title: `Edit Invoice - CC#${clearance.jobRef}`,
                                          id: `invoice-edit-${invoice.id}-${Date.now()}`, 
                                          payload: { job: clearance, jobType: 'clearance', existingInvoice: invoice } 
                                        })}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        data-testid={`button-edit-invoice-${invoice.id}`}
                                      >
                                        <Pencil className="h-3 w-3 text-primary hover:text-primary/80" />
                                      </button>
                                      <button
                                        onClick={() => setDeletingInvoice(invoice)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        data-testid={`button-delete-invoice-${invoice.id}`}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive hover:text-destructive/80" />
                                      </button>
                                      <a
                                        href={`/api/invoices/${invoice.id}/pdf`}
                                        download={`RS Invoice - ${invoice.jobRef}.pdf`}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        data-testid={`button-download-invoice-${invoice.id}`}
                                      >
                                        <Download className="h-3 w-3 text-primary hover:text-primary/80" />
                                      </a>
                                    </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">None</p>
                              )
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      
      {!isLoading && allFilteredClearances.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, allFilteredClearances.length)} of {allFilteredClearances.length} clearances
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

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

      <AlertDialog open={!!deletingFile} onOpenChange={(open) => !open && setDeletingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFile?.fileName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFile}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!redButtonPrompt} onOpenChange={(open) => !open && setRedButtonPrompt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue Detected</AlertDialogTitle>
            <AlertDialogDescription>
              You've marked this status as having an issue. Would you like to leave a note about the possible issue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleRedButtonConfirm(false)}>No, Continue</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleRedButtonConfirm(true)}>Yes, Add Note</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!mrnConfirmation} onOpenChange={(open) => !open && setMrnConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>MRN Detected</AlertDialogTitle>
            <AlertDialogDescription>
              Found MRN: <strong>{mrnConfirmation?.mrnNumber}</strong>
              <br />
              Would you like to add this MRN to the clearance?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleMrnConfirmation(false)}>No, Just Upload File</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleMrnConfirmation(true)}>Yes, Add MRN</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!notesClearanceId} onOpenChange={(open) => !open && handleCloseNotes()}>
        <DialogContent className="max-w-3xl h-[400px] flex flex-col" aria-describedby="clearance-notes-description">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Additional Notes</DialogTitle>
            <p id="clearance-notes-description" className="sr-only">Add or edit additional notes for this custom clearance</p>
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
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0" aria-describedby="clearance-pdf-description">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewingPdf?.name}
            </DialogTitle>
            <p id="clearance-pdf-description" className="sr-only">PDF document viewer</p>
          </DialogHeader>
          <div className="flex-1 px-6 pb-6 overflow-hidden">
            {viewingPdf && <PDFViewer url={viewingPdf.url} filename={viewingPdf.name} onClose={() => setViewingPdf(null)} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Clearance Agent Selection Dialog */}
      <Dialog open={clearanceAgentDialog?.show || false} onOpenChange={(open) => !open && setClearanceAgentDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Clearance Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {clearanceAgents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No clearance agents available</p>
            ) : (
              clearanceAgents.map((agent) => (
                <Card 
                  key={agent.id} 
                  className="cursor-pointer hover-elevate transition-all"
                  onClick={() => handleClearanceAgentSelected(agent)}
                  data-testid={`clearance-agent-${agent.id}`}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg">{agent.agentName}</h3>
                    {clearanceAgentDialog && (() => {
                      const clearance = clearances.find(c => c.id === clearanceAgentDialog.clearanceId)
                      const emailField = clearance?.jobType === "import" ? agent.agentImportEmail : agent.agentExportEmail
                      return emailField && emailField.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {emailField[0]}
                        </p>
                      )
                    })()}
                    {agent.agentTelephone && (
                      <p className="text-sm text-muted-foreground">{agent.agentTelephone}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>


      {/* Invoice Selection Dialog */}
      <Dialog open={!!invoiceSelectionDialog} onOpenChange={(open) => !open && setInvoiceSelectionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Invoices to Attach</DialogTitle>
            <DialogDescription>Choose which invoices to attach to the email</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {invoiceSelectionDialog?.invoices.map((invoice) => {
              const isCredit = invoice.type === 'credit_note'
              const prefix = isCredit ? 'CR' : 'INV'
              const colorClass = isCredit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
              return (
                <div key={invoice.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`invoice-${invoice.id}`}
                    checked={selectedInvoices.includes(invoice.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedInvoices([...selectedInvoices, invoice.id])
                      } else {
                        setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id))
                      }
                    }}
                    data-testid={`checkbox-invoice-${invoice.id}`}
                  />
                  <label
                    htmlFor={`invoice-${invoice.id}`}
                    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${colorClass}`}
                  >
                    {prefix} {invoice.invoiceNumber} - £{invoice.total.toFixed(2)}
                  </label>
                </div>
              )
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setInvoiceSelectionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmInvoiceSelection} data-testid="confirm-invoice-selection">
              Attach Selected
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Confirmation Dialog */}
      <AlertDialog open={!!deletingInvoice} onOpenChange={(open) => !open && setDeletingInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice #{deletingInvoice?.invoiceNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingInvoice && deleteInvoice.mutate(deletingInvoice.id)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="confirm-delete-invoice"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
