import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ImportCustomerForm } from "@/components/import-customer-form"
import { ExportCustomerForm } from "@/components/export-customer-form"
import { ExportReceiverForm } from "@/components/export-receiver-form"
import { HaulierForm } from "@/components/haulier-form"
import { ShippingLineForm } from "@/components/shipping-line-form"
import { ClearanceAgentForm } from "@/components/clearance-agent-form"
import type { ImportCustomer, ExportCustomer, ExportReceiver, Haulier, ShippingLine, ClearanceAgent, InsertImportCustomer, InsertExportCustomer, InsertExportReceiver, InsertHaulier, InsertShippingLine, InsertClearanceAgent, ImportShipment, ExportShipment } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

type CustomerType = "import" | "export" | "receiver" | "haulier" | "shippingline" | "clearanceagent"

// Job History Component
function JobHistory({ customerId, type }: { customerId: string; type: "import" | "export" }) {
  const endpoint = type === "import" 
    ? `/api/import-customers/${customerId}/shipments`
    : `/api/export-customers/${customerId}/shipments`;
    
  const { data: shipments = [] } = useQuery<ImportShipment[] | ExportShipment[]>({
    queryKey: [endpoint],
  });

  if (shipments.length === 0) {
    return null;
  }

  return (
    <Accordion type="single" collapsible className="mt-3">
      <AccordionItem value="history" className="border-0">
        <AccordionTrigger className="py-2 hover:no-underline" data-testid={`accordion-job-history-${customerId}`}>
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" />
            <span>Job History ({shipments.length})</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2 pt-2">
            {shipments.map((shipment) => {
              const importShipment = type === "import" ? shipment as ImportShipment : null;
              const exportShipment = type === "export" ? shipment as ExportShipment : null;
              
              return (
                <div 
                  key={shipment.id} 
                  className="flex items-center justify-between p-2 bg-background/50 rounded text-xs"
                  data-testid={`job-history-item-${shipment.id}`}
                >
                  <div className="flex-1">
                    <Link 
                      href={type === "import" ? "/import-shipments" : "/export-shipments"}
                      className="font-medium text-primary hover:underline"
                      data-testid={`link-job-${shipment.jobRef}`}
                    >
                      {shipment.jobRef}
                    </Link>
                    {importShipment?.containerNo && (
                      <p className="text-muted-foreground">{importShipment.containerNo}</p>
                    )}
                    {exportShipment?.exporterRef && (
                      <p className="text-muted-foreground">{exportShipment.exporterRef}</p>
                    )}
                  </div>
                  {importShipment?.dateReceived ? (
                    <p className="text-muted-foreground">
                      {format(new Date(importShipment.dateReceived), "dd/MM/yy")}
                    </p>
                  ) : exportShipment?.bookingDate ? (
                    <p className="text-muted-foreground">
                      {format(new Date(exportShipment.bookingDate), "dd/MM/yy")}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default function Customers() {
  const [selectedTab, setSelectedTab] = useState<CustomerType>("import")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<ImportCustomer | ExportCustomer | ExportReceiver | Haulier | ShippingLine | ClearanceAgent | null>(null)
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null)
  const [viewingCustomer, setViewingCustomer] = useState<ImportCustomer | ExportCustomer | ExportReceiver | Haulier | ShippingLine | ClearanceAgent | null>(null)
  const [searchText, setSearchText] = useState("")
  const { toast } = useToast()

  // Helper to determine customer type from entity properties
  const getCustomerType = (customer: ImportCustomer | ExportCustomer | ExportReceiver | Haulier | ShippingLine | ClearanceAgent | null): CustomerType => {
    if (!customer) return selectedTab
    if ('rsProcessCustomsClearance' in customer) return "import"
    if ('haulierName' in customer) return "haulier"
    if ('shippingLineName' in customer) return "shippingline"
    // Clearance agents have agentImportEmail or agentExportEmail, not accountsEmail
    if ('agentImportEmail' in customer || 'agentExportEmail' in customer) return "clearanceagent"
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

  const { data: hauliers = [], isLoading: isLoadingHauliers } = useQuery<Haulier[]>({
    queryKey: ["/api/hauliers"],
  })

  const { data: shippingLines = [], isLoading: isLoadingShippingLines } = useQuery<ShippingLine[]>({
    queryKey: ["/api/shipping-lines"],
  })

  const { data: clearanceAgents = [], isLoading: isLoadingClearanceAgents } = useQuery<ClearanceAgent[]>({
    queryKey: ["/api/clearance-agents"],
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

  const createHaulier = useMutation({
    mutationFn: async (data: InsertHaulier) => {
      return apiRequest("POST", "/api/hauliers", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hauliers"] })
      setIsFormOpen(false)
      setEditingCustomer(null)
      toast({ title: "Haulier created successfully" })
    },
  })

  const updateHaulier = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertHaulier }) => {
      return apiRequest("PATCH", `/api/hauliers/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hauliers"] })
      setIsFormOpen(false)
      setEditingCustomer(null)
      toast({ title: "Haulier updated successfully" })
    },
  })

  const deleteHaulier = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/hauliers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hauliers"] })
      toast({ title: "Haulier deleted successfully" })
    },
  })

  const createShippingLine = useMutation({
    mutationFn: async (data: InsertShippingLine) => {
      return apiRequest("POST", "/api/shipping-lines", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-lines"] })
      setIsFormOpen(false)
      setEditingCustomer(null)
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
      setEditingCustomer(null)
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

  const createClearanceAgent = useMutation({
    mutationFn: async (data: InsertClearanceAgent) => {
      return apiRequest("POST", "/api/clearance-agents", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clearance-agents"] })
      setIsFormOpen(false)
      setEditingCustomer(null)
      toast({ title: "Clearance agent created successfully" })
    },
  })

  const updateClearanceAgent = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertClearanceAgent }) => {
      return apiRequest("PATCH", `/api/clearance-agents/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clearance-agents"] })
      setIsFormOpen(false)
      setEditingCustomer(null)
      toast({ title: "Clearance agent updated successfully" })
    },
  })

  const deleteClearanceAgent = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/clearance-agents/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clearance-agents"] })
      toast({ title: "Clearance agent deleted successfully" })
    },
  })

  const handleCreateNew = () => {
    setEditingCustomer(null)
    setIsFormOpen(true)
  }

  const handleEdit = (customer: ImportCustomer | ExportCustomer | ExportReceiver | Haulier | ShippingLine | ClearanceAgent) => {
    setEditingCustomer(customer)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeletingCustomerId(id)
  }

  const handleViewDetails = (customer: ImportCustomer | ExportCustomer | ExportReceiver | Haulier | ShippingLine | ClearanceAgent) => {
    setViewingCustomer(customer)
  }

  const confirmDelete = () => {
    if (!deletingCustomerId) return
    
    if (selectedTab === "import") {
      deleteImportCustomer.mutate(deletingCustomerId)
    } else if (selectedTab === "export") {
      deleteExportCustomer.mutate(deletingCustomerId)
    } else if (selectedTab === "receiver") {
      deleteExportReceiver.mutate(deletingCustomerId)
    } else if (selectedTab === "shippingline") {
      deleteShippingLine.mutate(deletingCustomerId)
    } else if (selectedTab === "clearanceagent") {
      deleteClearanceAgent.mutate(deletingCustomerId)
    } else {
      deleteHaulier.mutate(deletingCustomerId)
    }
    setDeletingCustomerId(null)
  }

  const handleFormSubmit = (data: InsertImportCustomer | InsertExportCustomer | InsertExportReceiver | InsertHaulier | InsertShippingLine | InsertClearanceAgent) => {
    if (editingCustomer) {
      // Determine type from editingCustomer properties rather than selectedTab
      if ('rsProcessCustomsClearance' in editingCustomer) {
        // Import customer has unique import-specific fields
        updateImportCustomer.mutate({ id: editingCustomer.id, data: data as InsertImportCustomer })
      } else if ('haulierName' in editingCustomer) {
        // Haulier
        updateHaulier.mutate({ id: editingCustomer.id, data: data as InsertHaulier })
      } else if ('agentName' in editingCustomer) {
        // Clearance Agent
        updateClearanceAgent.mutate({ id: editingCustomer.id, data: data as InsertClearanceAgent })
      } else if ('shippingLineName' in editingCustomer) {
        // Shipping Line
        updateShippingLine.mutate({ id: editingCustomer.id, data: data as InsertShippingLine })
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
      } else if (selectedTab === "receiver") {
        createExportReceiver.mutate(data as InsertExportReceiver)
      } else if (selectedTab === "shippingline") {
        createShippingLine.mutate(data as InsertShippingLine)
      } else if (selectedTab === "clearanceagent") {
        createClearanceAgent.mutate(data as InsertClearanceAgent)
      } else {
        createHaulier.mutate(data as InsertHaulier)
      }
    }
  }

  const isLoading = isLoadingImport || isLoadingExport || isLoadingReceivers || isLoadingHauliers || isLoadingShippingLines || isLoadingClearanceAgents

  // Filter and sort function for all contact types
  const filterContacts = <T extends ImportCustomer | ExportCustomer | ExportReceiver | Haulier | ShippingLine | ClearanceAgent>(
    contacts: T[]
  ): T[] => {
    let filtered = contacts
    
    if (searchText.trim() !== "") {
      const searchLower = searchText.toLowerCase()
      filtered = contacts.filter((contact) => {
        // Search in all text fields
        const searchableFields: string[] = []
        
        // Add all fields from the contact object
        Object.entries(contact).forEach(([key, value]) => {
          if (typeof value === 'string') {
            searchableFields.push(value)
          } else if (Array.isArray(value)) {
            value.forEach(item => {
              if (typeof item === 'string') {
                searchableFields.push(item)
              } else if (typeof item === 'object' && item !== null) {
                // Handle arrays of objects (like contacts in Haulier)
                Object.values(item).forEach(objValue => {
                  if (typeof objValue === 'string') {
                    searchableFields.push(objValue)
                  }
                })
              }
            })
          }
        })
        
        return searchableFields.some(field => field.toLowerCase().includes(searchLower))
      })
    }
    
    // Sort alphabetically by name
    return filtered.sort((a, b) => {
      const nameA = 'companyName' in a 
        ? a.companyName 
        : 'haulierName' in a 
        ? a.haulierName 
        : 'shippingLineName' in a
        ? a.shippingLineName
        : 'agentName' in a
        ? a.agentName
        : ''
      const nameB = 'companyName' in b 
        ? b.companyName 
        : 'haulierName' in b 
        ? b.haulierName 
        : 'shippingLineName' in b
        ? b.shippingLineName
        : 'agentName' in b
        ? b.agentName
        : ''
      return nameA.localeCompare(nameB)
    })
  }

  const filteredImportCustomers = filterContacts(importCustomers)
  const filteredExportCustomers = filterContacts(exportCustomers)
  const filteredExportReceivers = filterContacts(exportReceivers)
  const filteredHauliers = filterContacts(hauliers)
  const filteredShippingLines = filterContacts(shippingLines)
  const filteredClearanceAgents = filterContacts(clearanceAgents)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Contacts</h1>
          <p className="text-muted-foreground">
            Manage import customers, export customers, export receivers, hauliers, shipping lines, and clearance agents
          </p>
        </div>
        <Button data-testid="button-new-customer" onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New {selectedTab === "import" ? "Import Customer" : selectedTab === "export" ? "Export Customer" : selectedTab === "receiver" ? "Receiver" : selectedTab === "shippingline" ? "Shipping Line" : selectedTab === "clearanceagent" ? "Clearance Agent" : "Haulier"}
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as CustomerType)}>
        <TabsList className="grid w-full grid-cols-6 gap-3 p-1">
          <TabsTrigger value="import" data-testid="tab-import-customers" className="px-4">Import Customers</TabsTrigger>
          <TabsTrigger value="export" data-testid="tab-export-customers" className="px-4">Export Customers</TabsTrigger>
          <TabsTrigger value="receiver" data-testid="tab-export-receivers" className="px-4">Export Receivers</TabsTrigger>
          <TabsTrigger value="haulier" data-testid="tab-hauliers" className="px-4">Hauliers</TabsTrigger>
          <TabsTrigger value="shippingline" data-testid="tab-shipping-lines" className="px-4">Shipping Lines</TabsTrigger>
          <TabsTrigger value="clearanceagent" data-testid="tab-clearance-agents" className="px-4">Clearance Agents</TabsTrigger>
        </TabsList>

        <div className="my-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search all contacts..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </div>

        <TabsContent value="import" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : filteredImportCustomers.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <p className="text-lg text-muted-foreground">
                {searchText.trim() ? "No import customers match your search" : "No import customers yet"}
              </p>
              {!searchText.trim() && (
                <Button variant="outline" className="mt-4" onClick={handleCreateNew} data-testid="button-create-first">
                  Create your first import customer
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredImportCustomers.map((customer) => (
                <Card key={customer.id} data-testid={`card-customer-${customer.id}`} className="bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 
                          className="font-semibold text-lg cursor-pointer hover:underline" 
                          data-testid={`text-company-name-${customer.id}`}
                          onClick={() => handleViewDetails(customer)}
                        >
                          {customer.companyName}
                        </h3>
                        {customer.contactName && customer.contactName.length > 0 && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-contact-name-${customer.id}`}>
                            {customer.contactName.join(' / ')}
                          </p>
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
                      {customer.email && customer.email.length > 0 && (
                        <div className="space-y-0.5">
                          {customer.email.map((email, idx) => (
                            <p key={idx} data-testid={`text-email-${customer.id}-${idx}`}>
                              <a href={`mailto:${email}`} className="text-muted-foreground hover:underline">{email}</a>
                            </p>
                          ))}
                        </div>
                      )}
                      {customer.telephone && <p data-testid={`text-telephone-${customer.id}`}>{customer.telephone}</p>}
                      {customer.address && (
                        <p className="text-muted-foreground whitespace-pre-wrap text-xs" data-testid={`text-address-${customer.id}`}>
                          {customer.address}
                        </p>
                      )}
                      {customer.agentName && (
                        <div className="mt-2 pt-2 border-t" data-testid={`agent-info-${customer.id}`}>
                          <p className="font-semibold text-lg" data-testid={`text-agent-name-${customer.id}`}>{customer.agentName}</p>
                          {customer.agentContactName && customer.agentContactName.length > 0 && (
                            <p className="text-sm text-muted-foreground" data-testid={`text-agent-contact-${customer.id}`}>
                              {customer.agentContactName.join(' / ')}
                            </p>
                          )}
                          {customer.agentTelephone && (
                            <p className="mt-1" data-testid={`text-agent-telephone-${customer.id}`}>{customer.agentTelephone}</p>
                          )}
                          {customer.agentEmail && customer.agentEmail.length > 0 && (
                            <div>
                              {customer.agentEmail.map((email, idx) => (
                                <p key={idx} data-testid={`text-agent-email-${customer.id}-${idx}`}>
                                  <a href={`mailto:${email}`} className="text-muted-foreground hover:underline font-normal">{email}</a>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <JobHistory customerId={customer.id} type="import" />
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
          ) : filteredExportCustomers.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <p className="text-lg text-muted-foreground">
                {searchText.trim() ? "No export customers match your search" : "No export customers yet"}
              </p>
              {!searchText.trim() && (
                <Button variant="outline" className="mt-4" onClick={handleCreateNew} data-testid="button-create-first">
                  Create your first export customer
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredExportCustomers.map((customer) => (
                <Card key={customer.id} data-testid={`card-customer-${customer.id}`} className="bg-green-50/50 dark:bg-green-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 
                          className="font-semibold text-lg cursor-pointer hover:underline" 
                          data-testid={`text-company-name-${customer.id}`}
                          onClick={() => handleViewDetails(customer)}
                        >
                          {customer.companyName}
                        </h3>
                        {customer.contactName && customer.contactName.length > 0 && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-contact-name-${customer.id}`}>
                            {customer.contactName.join(' / ')}
                          </p>
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
                      {customer.email && customer.email.length > 0 && (
                        <div className="space-y-0.5">
                          {customer.email.map((email, idx) => (
                            <p key={idx} data-testid={`text-email-${customer.id}-${idx}`}>
                              <a href={`mailto:${email}`} className="text-muted-foreground hover:underline">{email}</a>
                            </p>
                          ))}
                        </div>
                      )}
                      {customer.telephone && <p data-testid={`text-telephone-${customer.id}`}>{customer.telephone}</p>}
                      {customer.address && (
                        <p className="text-muted-foreground whitespace-pre-wrap text-xs" data-testid={`text-address-${customer.id}`}>
                          {customer.address}
                        </p>
                      )}
                      {customer.agentName && (
                        <div className="mt-2 pt-2 border-t" data-testid={`agent-info-${customer.id}`}>
                          <p className="font-semibold text-lg" data-testid={`text-agent-name-${customer.id}`}>{customer.agentName}</p>
                          {customer.agentContactName && customer.agentContactName.length > 0 && (
                            <p className="text-sm text-muted-foreground" data-testid={`text-agent-contact-${customer.id}`}>
                              {customer.agentContactName.join(' / ')}
                            </p>
                          )}
                          {customer.agentTelephone && (
                            <p className="mt-1" data-testid={`text-agent-telephone-${customer.id}`}>{customer.agentTelephone}</p>
                          )}
                          {customer.agentEmail && customer.agentEmail.length > 0 && (
                            <div>
                              {customer.agentEmail.map((email, idx) => (
                                <p key={idx} data-testid={`text-agent-email-${customer.id}-${idx}`}>
                                  <a href={`mailto:${email}`} className="text-muted-foreground hover:underline font-normal">{email}</a>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <JobHistory customerId={customer.id} type="export" />
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
          ) : filteredExportReceivers.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <p className="text-lg text-muted-foreground">
                {searchText.trim() ? "No export receivers match your search" : "No export receivers yet"}
              </p>
              {!searchText.trim() && (
                <Button variant="outline" className="mt-4" onClick={handleCreateNew} data-testid="button-create-first">
                  Create your first export receiver
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredExportReceivers.map((receiver) => (
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
                      {receiver.address && (
                        <p className="text-muted-foreground whitespace-pre-line" data-testid={`text-address-${receiver.id}`}>
                          {receiver.address}
                        </p>
                      )}
                      {receiver.country && (
                        <p className="text-muted-foreground" data-testid={`text-country-${receiver.id}`}>
                          {receiver.country}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="haulier" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : filteredHauliers.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <p className="text-lg text-muted-foreground">
                {searchText.trim() ? "No hauliers match your search" : "No hauliers yet"}
              </p>
              {!searchText.trim() && (
                <Button variant="outline" className="mt-4" onClick={handleCreateNew} data-testid="button-create-first">
                  Create your first haulier
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredHauliers.map((haulier) => (
                <Card key={haulier.id} data-testid={`card-haulier-${haulier.id}`} className="bg-purple-50/50 dark:bg-purple-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 
                          className="font-semibold text-lg cursor-pointer hover:underline" 
                          data-testid={`text-haulier-name-${haulier.id}`}
                          onClick={() => handleViewDetails(haulier)}
                        >
                          {haulier.haulierName}
                        </h3>
                        {haulier.contacts && haulier.contacts.length > 0 && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-contact-names-${haulier.id}`}>
                            {haulier.contacts.map(c => c.contactName).join(' / ')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(haulier)}
                          data-testid={`button-edit-${haulier.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(haulier.id)}
                          data-testid={`button-delete-${haulier.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      {haulier.contacts && haulier.contacts.length > 0 && (
                        <div className="space-y-0.5">
                          {haulier.contacts.map((contact, idx) => (
                            <p key={idx} data-testid={`text-email-${haulier.id}-${idx}`}>
                              <a href={`mailto:${contact.contactEmail}`} className="text-muted-foreground hover:underline">
                                {contact.contactEmail}
                              </a>
                            </p>
                          ))}
                        </div>
                      )}
                      {haulier.telephone && <p data-testid={`text-telephone-${haulier.id}`}>{haulier.telephone}</p>}
                      {haulier.mobile && <p data-testid={`text-mobile-${haulier.id}`}>{haulier.mobile}</p>}
                      {haulier.address && (
                        <p className="text-muted-foreground whitespace-pre-wrap text-xs" data-testid={`text-address-${haulier.id}`}>
                          {haulier.address}
                        </p>
                      )}
                      {haulier.contacts && haulier.contacts.length > 0 && (
                        <div className="mt-3 pt-2 border-t">
                          <div className="flex flex-wrap gap-1">
                            {Array.from(new Set(haulier.contacts.map(c => c.countryServiced))).map((country) => (
                              <span 
                                key={country} 
                                className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md" 
                                data-testid={`badge-country-${country}`}
                              >
                                {country}
                              </span>
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
        </TabsContent>

        <TabsContent value="shippingline" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : filteredShippingLines.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <p className="text-lg text-muted-foreground">
                {searchText.trim() ? "No shipping lines match your search" : "No shipping lines yet"}
              </p>
              {!searchText.trim() && (
                <Button variant="outline" className="mt-4" onClick={handleCreateNew} data-testid="button-create-first">
                  Create your first shipping line
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredShippingLines.map((line) => (
                <Card key={line.id} data-testid={`card-shipping-line-${line.id}`} className="bg-orange-50/50 dark:bg-orange-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 
                          className="font-semibold text-lg cursor-pointer hover:underline" 
                          data-testid={`text-shipping-line-name-${line.id}`}
                          onClick={() => handleViewDetails(line)}
                        >
                          {line.shippingLineName}
                        </h3>
                        {line.shippingLineAddress && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-address-${line.id}`}>{line.shippingLineAddress}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(line)}
                          data-testid={`button-edit-${line.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(line.id)}
                          data-testid={`button-delete-${line.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      {line.telephone && <p data-testid={`text-telephone-${line.id}`}>{line.telephone}</p>}
                      {line.importEmail && line.importEmail.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">Import Emails:</p>
                          <div className="space-y-0.5">
                            {line.importEmail.slice(0, 2).map((email, idx) => (
                              <p key={idx} data-testid={`text-import-email-${line.id}-${idx}`}>
                                <a href={`mailto:${email}`} className="text-muted-foreground hover:underline text-xs">{email}</a>
                              </p>
                            ))}
                            {line.importEmail.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{line.importEmail.length - 2} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="clearanceagent" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : filteredClearanceAgents.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <p className="text-lg text-muted-foreground">
                {searchText.trim() ? "No clearance agents match your search" : "No clearance agents yet"}
              </p>
              {!searchText.trim() && (
                <Button variant="outline" className="mt-4" onClick={handleCreateNew} data-testid="button-create-first">
                  Create your first clearance agent
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredClearanceAgents.map((agent) => (
                <Card key={agent.id} data-testid={`card-clearance-agent-${agent.id}`} className="bg-orange-50/50 dark:bg-orange-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 
                          className="font-semibold text-lg cursor-pointer hover:underline" 
                          data-testid={`text-agent-name-${agent.id}`}
                          onClick={() => handleViewDetails(agent)}
                        >
                          {agent.agentName}
                        </h3>
                        {agent.agentTelephone && (
                          <p className="text-sm text-muted-foreground" data-testid={`text-telephone-${agent.id}`}>{agent.agentTelephone}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(agent)}
                          data-testid={`button-edit-${agent.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(agent.id)}
                          data-testid={`button-delete-${agent.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      {agent.agentImportEmail && agent.agentImportEmail.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">Import Emails:</p>
                          <div className="space-y-0.5">
                            {agent.agentImportEmail.slice(0, 2).map((email, idx) => (
                              <p key={idx} data-testid={`text-import-email-${agent.id}-${idx}`}>
                                <a href={`mailto:${email}`} className="text-muted-foreground hover:underline text-xs">{email}</a>
                              </p>
                            ))}
                            {agent.agentImportEmail.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{agent.agentImportEmail.length - 2} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      {agent.agentExportEmail && agent.agentExportEmail.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">Export Emails:</p>
                          <div className="space-y-0.5">
                            {agent.agentExportEmail.slice(0, 2).map((email, idx) => (
                              <p key={idx} data-testid={`text-export-email-${agent.id}-${idx}`}>
                                <a href={`mailto:${email}`} className="text-muted-foreground hover:underline text-xs">{email}</a>
                              </p>
                            ))}
                            {agent.agentExportEmail.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{agent.agentExportEmail.length - 2} more</span>
                            )}
                          </div>
                        </div>
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
                return formType === "import" ? "Import Customer" : formType === "export" ? "Export Customer" : formType === "haulier" ? "Haulier" : formType === "shippingline" ? "Shipping Line" : formType === "clearanceagent" ? "Clearance Agent" : "Export Receiver"
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
            } else if (formType === "haulier") {
              const haulier = editingCustomer as Haulier | null
              return (
                <HaulierForm
                  onSubmit={handleFormSubmit}
                  onCancel={() => setIsFormOpen(false)}
                  defaultValues={haulier ? {
                    ...haulier,
                    contacts: haulier.contacts || []
                  } : undefined}
                />
              )
            } else if (formType === "shippingline") {
              return (
                <ShippingLineForm
                  onSubmit={handleFormSubmit}
                  onCancel={() => setIsFormOpen(false)}
                  defaultValues={editingCustomer as ShippingLine}
                />
              )
            } else if (formType === "clearanceagent") {
              return (
                <ClearanceAgentForm
                  onSubmit={handleFormSubmit}
                  onCancel={() => setIsFormOpen(false)}
                  defaultValues={editingCustomer as ClearanceAgent}
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
              This action cannot be undone. This will permanently delete this {selectedTab === "import" ? "import customer" : selectedTab === "export" ? "export customer" : selectedTab === "receiver" ? "export receiver" : selectedTab === "shippingline" ? "shipping line" : selectedTab === "clearanceagent" ? "clearance agent" : "haulier"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewingCustomer} onOpenChange={(open) => !open && setViewingCustomer(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {viewingCustomer && 'haulierName' in viewingCustomer 
                ? viewingCustomer.haulierName 
                : viewingCustomer && 'shippingLineName' in viewingCustomer
                ? viewingCustomer.shippingLineName
                : viewingCustomer && 'agentName' in viewingCustomer
                ? viewingCustomer.agentName
                : viewingCustomer?.companyName}
            </DialogTitle>
          </DialogHeader>
          
          {viewingCustomer && 'rsProcessCustomsClearance' in viewingCustomer && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {viewingCustomer.contactName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Name</p>
                      <p>{viewingCustomer.contactName}</p>
                    </div>
                  )}
                  {viewingCustomer.vatNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">VAT Number</p>
                      <p>{viewingCustomer.vatNumber}</p>
                    </div>
                  )}
                  {viewingCustomer.telephone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telephone</p>
                      <p>{viewingCustomer.telephone}</p>
                    </div>
                  )}
                  {viewingCustomer.email && viewingCustomer.email.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      {viewingCustomer.email.map((email, idx) => (
                        <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                      ))}
                    </div>
                  )}
                  {viewingCustomer.accountsEmail && viewingCustomer.accountsEmail.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Accounts Email</p>
                      {viewingCustomer.accountsEmail.map((email, idx) => (
                        <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {viewingCustomer.address && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Address</h3>
                  <div className="whitespace-pre-wrap">
                    {viewingCustomer.address}
                  </div>
                </div>
              )}

              {viewingCustomer.agentName && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Agent Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Agent Name</p>
                      <p>{viewingCustomer.agentName}</p>
                    </div>
                    {viewingCustomer.agentContactName && (
                      <div>
                        <p className="text-sm text-muted-foreground">Agent Contact Name</p>
                        <p>{viewingCustomer.agentContactName}</p>
                      </div>
                    )}
                    {viewingCustomer.agentVatNumber && (
                      <div>
                        <p className="text-sm text-muted-foreground">Agent VAT Number</p>
                        <p>{viewingCustomer.agentVatNumber}</p>
                      </div>
                    )}
                    {viewingCustomer.agentTelephone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Agent Telephone</p>
                        <p>{viewingCustomer.agentTelephone}</p>
                      </div>
                    )}
                    {viewingCustomer.agentEmail && viewingCustomer.agentEmail.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Agent Email</p>
                        {viewingCustomer.agentEmail.map((email, idx) => (
                          <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                        ))}
                      </div>
                    )}
                    {viewingCustomer.agentAccountsEmail && viewingCustomer.agentAccountsEmail.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Agent Accounts Email</p>
                        {viewingCustomer.agentAccountsEmail.map((email, idx) => (
                          <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                        ))}
                      </div>
                    )}
                  </div>
                  {viewingCustomer.agentAddress && (
                    <div className="mt-3">
                      <h4 className="text-sm text-muted-foreground mb-2">Agent Address</h4>
                      <div className="whitespace-pre-wrap">
                        {viewingCustomer.agentAddress}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h3 className="font-semibold text-lg mb-3">Import Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">R.S. Process Customs Clearance</p>
                    <p>{viewingCustomer.rsProcessCustomsClearance ? "Yes" : "No"}</p>
                  </div>
                  {viewingCustomer.agentInDover && (
                    <div>
                      <p className="text-sm text-muted-foreground">Agent in Dover</p>
                      <p>{viewingCustomer.agentInDover}</p>
                    </div>
                  )}
                  {viewingCustomer.vatPaymentMethod && (
                    <div>
                      <p className="text-sm text-muted-foreground">VAT Payment Method</p>
                      <p>{viewingCustomer.vatPaymentMethod}</p>
                    </div>
                  )}
                  {viewingCustomer.clearanceAgentDetails && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Clearance Agent Details</p>
                      <p>{viewingCustomer.clearanceAgentDetails}</p>
                    </div>
                  )}
                  {viewingCustomer.defaultDeliveryAddress && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Default Delivery Address</p>
                      <p>{viewingCustomer.defaultDeliveryAddress}</p>
                    </div>
                  )}
                  {viewingCustomer.defaultSuppliersName && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Default Suppliers Name</p>
                      <p>{viewingCustomer.defaultSuppliersName}</p>
                    </div>
                  )}
                  {viewingCustomer.bookingInDetails && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Booking In Details</p>
                      <p>{viewingCustomer.bookingInDetails}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewingCustomer && 'contactName' in viewingCustomer && viewingCustomer.contactName !== undefined && !('rsProcessCustomsClearance' in viewingCustomer) && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {viewingCustomer.contactName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Name</p>
                      <p>{viewingCustomer.contactName}</p>
                    </div>
                  )}
                  {viewingCustomer.vatNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">VAT Number</p>
                      <p>{viewingCustomer.vatNumber}</p>
                    </div>
                  )}
                  {viewingCustomer.telephone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telephone</p>
                      <p>{viewingCustomer.telephone}</p>
                    </div>
                  )}
                  {viewingCustomer.email && viewingCustomer.email.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      {viewingCustomer.email.map((email, idx) => (
                        <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                      ))}
                    </div>
                  )}
                  {viewingCustomer.accountsEmail && viewingCustomer.accountsEmail.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Accounts Email</p>
                      {viewingCustomer.accountsEmail.map((email, idx) => (
                        <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {viewingCustomer.address && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Address</h3>
                  <div className="whitespace-pre-wrap">
                    {viewingCustomer.address}
                  </div>
                </div>
              )}

              {viewingCustomer.agentName && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Agent Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Agent Name</p>
                      <p>{viewingCustomer.agentName}</p>
                    </div>
                    {viewingCustomer.agentContactName && (
                      <div>
                        <p className="text-sm text-muted-foreground">Agent Contact Name</p>
                        <p>{viewingCustomer.agentContactName}</p>
                      </div>
                    )}
                    {viewingCustomer.agentVatNumber && (
                      <div>
                        <p className="text-sm text-muted-foreground">Agent VAT Number</p>
                        <p>{viewingCustomer.agentVatNumber}</p>
                      </div>
                    )}
                    {viewingCustomer.agentTelephone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Agent Telephone</p>
                        <p>{viewingCustomer.agentTelephone}</p>
                      </div>
                    )}
                    {viewingCustomer.agentEmail && viewingCustomer.agentEmail.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Agent Email</p>
                        {viewingCustomer.agentEmail.map((email, idx) => (
                          <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                        ))}
                      </div>
                    )}
                    {viewingCustomer.agentAccountsEmail && viewingCustomer.agentAccountsEmail.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Agent Accounts Email</p>
                        {viewingCustomer.agentAccountsEmail.map((email, idx) => (
                          <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                        ))}
                      </div>
                    )}
                  </div>
                  {viewingCustomer.agentAddress && (
                    <div className="mt-3">
                      <h4 className="text-sm text-muted-foreground mb-2">Agent Address</h4>
                      <div className="whitespace-pre-wrap">
                        {viewingCustomer.agentAddress}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {viewingCustomer && 'haulierName' in viewingCustomer && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {viewingCustomer.telephone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telephone</p>
                      <p>{viewingCustomer.telephone}</p>
                    </div>
                  )}
                  {viewingCustomer.mobile && (
                    <div>
                      <p className="text-sm text-muted-foreground">Mobile</p>
                      <p>{viewingCustomer.mobile}</p>
                    </div>
                  )}
                  {viewingCustomer.address && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="whitespace-pre-wrap">{viewingCustomer.address}</p>
                    </div>
                  )}
                </div>
              </div>
              {'contacts' in viewingCustomer && viewingCustomer.contacts && viewingCustomer.contacts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Contacts</h3>
                  <div className="space-y-3">
                    {viewingCustomer.contacts.map((contact, idx) => (
                      <div key={idx} className="p-3 bg-secondary/50 rounded-md">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Contact Name</p>
                            <p className="font-medium">{contact.contactName}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Email</p>
                            <p><a href={`mailto:${contact.contactEmail}`} className="hover:underline">{contact.contactEmail}</a></p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Export Type</p>
                            <p>{contact.exportType}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Country Serviced</p>
                            <p>{contact.countryServiced}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {viewingCustomer && 'shippingLineName' in viewingCustomer && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {viewingCustomer.telephone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telephone</p>
                      <p>{viewingCustomer.telephone}</p>
                    </div>
                  )}
                  {viewingCustomer.shippingLineAddress && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="whitespace-pre-wrap">{viewingCustomer.shippingLineAddress}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Email Contacts</h3>
                <div className="space-y-3">
                  {viewingCustomer.importEmail && viewingCustomer.importEmail.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Import Emails</p>
                      {viewingCustomer.importEmail.map((email, idx) => (
                        <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                      ))}
                    </div>
                  )}
                  {viewingCustomer.exportEmail && viewingCustomer.exportEmail.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Export Emails</p>
                      {viewingCustomer.exportEmail.map((email, idx) => (
                        <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                      ))}
                    </div>
                  )}
                  {viewingCustomer.releasesEmail && viewingCustomer.releasesEmail.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Releases Emails</p>
                      {viewingCustomer.releasesEmail.map((email, idx) => (
                        <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                      ))}
                    </div>
                  )}
                  {viewingCustomer.accountingEmail && viewingCustomer.accountingEmail.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Accounting Emails</p>
                      {viewingCustomer.accountingEmail.map((email, idx) => (
                        <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewingCustomer && 'agentImportEmail' in viewingCustomer && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {viewingCustomer.agentTelephone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telephone</p>
                      <p>{viewingCustomer.agentTelephone}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Email Contacts</h3>
                <div className="space-y-3">
                  {viewingCustomer.agentImportEmail && viewingCustomer.agentImportEmail.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Import Emails</p>
                      {viewingCustomer.agentImportEmail.map((email, idx) => (
                        <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                      ))}
                    </div>
                  )}
                  {viewingCustomer.agentExportEmail && viewingCustomer.agentExportEmail.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Export Emails</p>
                      {viewingCustomer.agentExportEmail.map((email, idx) => (
                        <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                      ))}
                    </div>
                  )}
                  {viewingCustomer.agentAccountingEmail && viewingCustomer.agentAccountingEmail.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Accounting Emails</p>
                      {viewingCustomer.agentAccountingEmail.map((email, idx) => (
                        <p key={idx}><a href={`mailto:${email}`} className="hover:underline">{email}</a></p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewingCustomer && !('rsProcessCustomsClearance' in viewingCustomer) && !('contactName' in viewingCustomer || (viewingCustomer as any).contactName === undefined) && !('haulierName' in viewingCustomer) && !('shippingLineName' in viewingCustomer) && !('agentName' in viewingCustomer) && (
            <div className="space-y-6">
              {'address' in viewingCustomer && viewingCustomer.address && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Address</h3>
                  <div className="space-y-1">
                    <p className="whitespace-pre-line">{viewingCustomer.address}</p>
                    {'country' in viewingCustomer && viewingCustomer.country && <p className="font-medium mt-2">{viewingCustomer.country}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}