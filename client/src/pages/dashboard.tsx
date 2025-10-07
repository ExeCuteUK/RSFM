import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery, useMutation } from "@tanstack/react-query"
import { type ImportShipment, type ExportShipment, type CustomClearance, type ImportCustomer, type Haulier } from "@shared/schema"
import { Container, Package, Clipboard, FileText, Search, Loader2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useLocation } from "wouter"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("container-management")
  const [searchText, setSearchText] = useState("")
  const [jobStatusFilter, setJobStatusFilter] = useState<("active" | "completed")[]>(["active", "completed"])
  const [, setLocation] = useLocation()
  const { toast } = useToast()

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ shipmentId: string; fieldName: string } | null>(null)
  const [tempValue, setTempValue] = useState("")
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  const tableRef = useRef<HTMLTableElement>(null)

  // Clear column widths when exiting edit mode
  useEffect(() => {
    if (!editingCell) {
      setColumnWidths([])
    }
  }, [editingCell])

  const { data: importShipments = [] } = useQuery<ImportShipment[]>({
    queryKey: ["/api/import-shipments"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })

  const { data: exportShipments = [] } = useQuery<ExportShipment[]>({
    queryKey: ["/api/export-shipments"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })

  const { data: customClearances = [] } = useQuery<CustomClearance[]>({
    queryKey: ["/api/custom-clearances"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })

  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
    refetchOnWindowFocus: true,
  })

  const { data: hauliers = [] } = useQuery<Haulier[]>({
    queryKey: ["/api/hauliers"],
    refetchOnWindowFocus: true,
  })

  // Mutation for updating shipment
  const updateShipmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImportShipment> }) => {
      return await apiRequest("PATCH", `/api/import-shipments/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      toast({
        title: "Updated",
        description: "Cell updated successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shipment",
        variant: "destructive",
      })
    },
  })

  // Helper to validate and convert DD/MM/YY to YYYY-MM-DD
  const validateAndConvertDate = (dateStr: string): string | null => {
    if (!dateStr.trim()) return null
    
    const ddmmyyPattern = /^(\d{2})\/(\d{2})\/(\d{2})$/
    const match = dateStr.match(ddmmyyPattern)
    
    if (!match) {
      throw new Error("Date must be in DD/MM/YY format")
    }
    
    const [, day, month, year] = match
    const fullYear = `20${year}`
    return `${fullYear}-${month}-${day}`
  }

  // Helper to validate numbers only
  const validateNumber = (value: string): string => {
    if (!value.trim()) return ""
    if (!/^\d+$/.test(value.trim())) {
      throw new Error("Must be a number")
    }
    return value.trim()
  }

  // Common countries for dropdown
  const commonCountries = [
    "France", "Germany", "Italy", "Spain", "Netherlands", 
    "Belgium", "Poland", "Czech Republic", "Austria", "Portugal"
  ]

  // Save handler for inline editing
  const handleSave = async (shipmentId: string, fieldName: string, value: string) => {
    try {
      const updateData: Partial<ImportShipment> = {}
      
      // Handle different field types with validation
      if (fieldName === "collectionDate" || fieldName === "dispatchDate" || fieldName === "importDateEtaPort" || fieldName === "deliveryDate") {
        const convertedDate = validateAndConvertDate(value)
        ;(updateData as any)[fieldName] = convertedDate
        
        // Special logic for deliveryDate
        if (fieldName === "deliveryDate") {
          if (!convertedDate) {
            updateData.deliveryBookedStatusIndicator = 1  // Yellow = 1 (To Do)
            updateData.deliveryBookedStatusIndicatorTimestamp = null as any
          } else {
            updateData.deliveryBookedStatusIndicator = 3  // Green = 3 (Completed)
            updateData.deliveryBookedStatusIndicatorTimestamp = new Date().toISOString() as any
          }
        }
      } else if (fieldName === "numberOfPieces" || fieldName === "weight") {
        ;(updateData as any)[fieldName] = validateNumber(value)
      } else {
        ;(updateData as any)[fieldName] = value.trim() || null
      }
      
      await updateShipmentMutation.mutateAsync({ id: shipmentId, data: updateData })
      setEditingCell(null)
      setTempValue("")
    } catch (error) {
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Invalid input",
        variant: "destructive",
      })
    }
  }

  // Save handler for status timestamp fields
  const handleStatusTimestampSave = async (
    shipmentId: string,
    statusIndicatorField: string,
    timestampField: string,
    value: string
  ) => {
    try {
      const updateData: Partial<ImportShipment> = {}
      
      if (!value.trim()) {
        // Clearing the timestamp - set status to yellow (to do)
        // Different indicators use different values for yellow:
        // - clearanceStatusIndicator: 1
        // - sendHaulierEadStatusIndicator: 2
        // - sendPodToCustomerStatusIndicator: null
        const yellowValue = statusIndicatorField === 'sendHaulierEadStatusIndicator' ? 2 
          : statusIndicatorField === 'sendPodToCustomerStatusIndicator' ? null 
          : 1
        ;(updateData as any)[statusIndicatorField] = yellowValue
        ;(updateData as any)[timestampField] = null
      } else {
        // Setting a timestamp - validate DD/MM/YY format and set status to 3 (green/completed)
        const convertedDate = validateAndConvertDate(value)
        if (!convertedDate) {
          throw new Error("Invalid date format. Use DD/MM/YY")
        }
        // Store the entered date at midnight UTC
        const dateObj = new Date(convertedDate)
        ;(updateData as any)[statusIndicatorField] = 3
        ;(updateData as any)[timestampField] = dateObj.toISOString()
      }
      
      await updateShipmentMutation.mutateAsync({ id: shipmentId, data: updateData })
      setEditingCell(null)
      setTempValue("")
    } catch (error) {
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Invalid input",
        variant: "destructive",
      })
    }
  }

  // Toggle job status filter
  const toggleJobStatusFilter = (status: "active" | "completed") => {
    if (jobStatusFilter.includes(status)) {
      // Don't allow deselecting if it's the only one selected
      if (jobStatusFilter.length > 1) {
        setJobStatusFilter(jobStatusFilter.filter(s => s !== status))
      }
    } else {
      setJobStatusFilter([...jobStatusFilter, status])
    }
  }

  // Helper to get linked clearance for a job
  const getLinkedClearance = (jobRef: number): CustomClearance | undefined => {
    return customClearances.find((c) => c.jobRef === jobRef)
  }

  // Helper to check if entire row is green (completed)
  const isRowFullyGreen = (shipment: ImportShipment): boolean => {
    const adviseStatus = (shipment as any).adviseClearanceToAgentStatusIndicator
    
    // Check clearance status (columns A-H)
    let clearanceIsGreen = false
    if (adviseStatus === 3) {
      clearanceIsGreen = true
    } else {
      const clearance = getLinkedClearance(shipment.jobRef)
      if (clearance && ["Awaiting Entry", "Awaiting Arrival", "P.H Hold", "Customs Issue", "Fully Cleared"].includes(clearance.status)) {
        clearanceIsGreen = true
      }
    }
    
    // Check all other status indicators
    const deliveryBookedIsGreen = shipment.deliveryBookedStatusIndicator === 3
    const containerReleaseIsGreen = shipment.containerReleaseStatusIndicator === 3
    const addressIsGreen = !!(shipment.deliveryAddress && shipment.deliveryAddress.trim().length > 0)
    const invoiceIsGreen = shipment.invoiceCustomerStatusIndicator === 3
    
    // All must be green for row to be completed
    return clearanceIsGreen && deliveryBookedIsGreen && containerReleaseIsGreen && addressIsGreen && invoiceIsGreen
  }

  // Filter container shipments
  const containerShipments = importShipments
    .filter((s) => s.containerShipment === "Container Shipment")
    // Apply job status filter
    .filter((s) => {
      const isCompleted = isRowFullyGreen(s)
      const isActive = !isRowFullyGreen(s)
      
      if (jobStatusFilter.includes("active") && jobStatusFilter.includes("completed")) return true
      if (jobStatusFilter.includes("active") && isActive) return true
      if (jobStatusFilter.includes("completed") && isCompleted) return true
      return false
    })
    // Apply search filter
    .filter((s) => {
      if (!searchText.trim()) return true
      const search = searchText.toLowerCase()
      const customerName = getCustomerName(s.importCustomerId).toLowerCase()
      return (
        s.jobRef?.toString().includes(search) ||
        customerName.includes(search) ||
        s.vesselName?.toLowerCase().includes(search) ||
        s.trailerOrContainerNumber?.toLowerCase().includes(search) ||
        s.customerReferenceNumber?.toLowerCase().includes(search)
      )
    })

  // Helper to get customer name
  const getCustomerName = (customerId: string | null): string => {
    if (!customerId) return ""
    const customer = importCustomers.find((c) => c.id === customerId)
    return customer?.companyName || ""
  }

  // Format time to 12-hour clock with AM/PM
  const formatTime12Hour = (time: string | null): string => {
    if (!time) return ""
    
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Format timestamp to DD/MM/YY
  const formatTimestampDDMMYY = (timestamp: string | null | undefined): string => {
    if (!timestamp) return ""
    
    const date = new Date(timestamp)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    
    return `${day}/${month}/${year}`
  }

  // Helper to get delivery booked date color for Nisbets card
  const getNisbetsDeliveryBookedDateColor = (shipment: ImportShipment): string => {
    const hasDeliveryDate = shipment.deliveryDate && shipment.deliveryDate.trim().length > 0
    const isBookingStatusGreen = shipment.deliveryBookedStatusIndicator === 3
    
    // Green only if both conditions are met
    if (hasDeliveryDate && isBookingStatusGreen) {
      return "bg-green-100 dark:bg-green-900"
    }
    
    // Yellow otherwise (empty date OR yellow status OR both)
    return "bg-yellow-200 dark:bg-yellow-800"
  }

  // Helper to determine cell background color based on clearance status
  const getClearanceStatusColor = (shipment: ImportShipment): string => {
    const adviseStatus = (shipment as any).adviseClearanceToAgentStatusIndicator
    
    // Check if Advise Clearance to Agent status is completed (green)
    if (adviseStatus === 3) {
      return "bg-green-100 dark:bg-green-900"
    }
    
    const clearance = getLinkedClearance(shipment.jobRef)
    if (!clearance) return "bg-yellow-200 dark:bg-yellow-800"
    
    const status = clearance.status
    if (["Awaiting Entry", "Awaiting Arrival", "P.H Hold", "Customs Issue", "Fully Cleared"].includes(status)) {
      return "bg-green-100 dark:bg-green-900"
    }
    if (status === "Request CC") {
      return "bg-yellow-200 dark:bg-yellow-800"
    }
    return "bg-yellow-200 dark:bg-yellow-800"
  }

  // Helper to get delivery booked color
  const getDeliveryBookedColor = (indicator: number | null): string => {
    if (indicator === 3) return "bg-green-100 dark:bg-green-900"
    if (indicator === 2) return "bg-orange-300 dark:bg-orange-700"
    return "bg-yellow-200 dark:bg-yellow-800"
  }

  // Helper to get container release color
  const getContainerReleaseColor = (indicator: number | null): string => {
    if (indicator === 3) return "bg-green-100 dark:bg-green-900"
    if (indicator === 2) return "bg-orange-300 dark:bg-orange-700"
    return "bg-yellow-200 dark:bg-yellow-800"
  }

  // Helper to get delivery address color
  const getDeliveryAddressColor = (address: string | null): string => {
    if (address && address.trim().length > 0) {
      return "bg-green-100 dark:bg-green-900"
    }
    return "bg-yellow-200 dark:bg-yellow-800"
  }

  // Helper to get invoice status color
  const getInvoiceStatusColor = (indicator: number | null): string => {
    if (indicator === 3) return "bg-green-100 dark:bg-green-900"
    return "bg-yellow-200 dark:bg-yellow-800"
  }

  // Helper to format date
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return ""
    try {
      const date = new Date(dateStr)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = String(date.getFullYear()).slice(-2)
      return `${day}/${month}/${year}`
    } catch {
      return ""
    }
  }

  // Editable Cell Component
  const EditableCell = ({
    shipment,
    fieldName,
    value,
    displayValue,
    type = "text",
    options = [],
    customCellColor,
  }: {
    shipment: ImportShipment
    fieldName: string
    value: string
    displayValue?: string
    type?: "text" | "number" | "date" | "dropdown" | "textarea"
    options?: { value: string; label: string }[]
    customCellColor?: string
  }) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const isEditing = editingCell?.shipmentId === shipment.id && editingCell?.fieldName === fieldName
    const isSaving = updateShipmentMutation.isPending

    useEffect(() => {
      if (isEditing) {
        if (type === "textarea" && textareaRef.current && document.activeElement !== textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.select()
        } else if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
      }
    }, [isEditing, type])

    const handleClick = () => {
      // Capture column widths before entering edit mode
      if (tableRef.current && !editingCell) {
        const headers = tableRef.current.querySelectorAll('thead th')
        const widths = Array.from(headers).map(th => th.getBoundingClientRect().width)
        setColumnWidths(widths)
      }
      setEditingCell({ shipmentId: shipment.id, fieldName })
      setTempValue(value)
    }

    const handleBlur = () => {
      if (tempValue !== value && !isSaving) {
        handleSave(shipment.id, fieldName, tempValue)
      } else {
        setEditingCell(null)
        setTempValue("")
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && type !== "textarea") {
        e.preventDefault()
        if (tempValue !== value) {
          handleSave(shipment.id, fieldName, tempValue)
        } else {
          setEditingCell(null)
          setTempValue("")
        }
      } else if (e.key === "Escape") {
        setEditingCell(null)
        setTempValue("")
      }
    }

    // Get cell color - use custom if provided, otherwise use standard logic
    const cellColor = customCellColor || (value ? "bg-green-100 dark:bg-green-900" : "bg-yellow-200 dark:bg-yellow-800")

    if (isEditing) {
      if (type === "dropdown") {
        return (
          <td className={`px-1 text-center border-r border-border align-middle ${cellColor}`}>
            <Select
              value={tempValue}
              onValueChange={(val) => {
                setTempValue(val)
                handleSave(shipment.id, fieldName, val)
              }}
            >
              <SelectTrigger className="h-auto min-h-6 text-xs text-center border-none focus:ring-0 bg-transparent shadow-none px-0 py-0">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>
        )
      }

      if (type === "textarea") {
        return (
          <td className={`px-1 text-center border-r border-border align-middle ${cellColor}`}>
            <textarea
              ref={textareaRef}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[60px] max-h-[60px] text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none resize-none px-0 py-0 leading-tight"
              rows={3}
            />
          </td>
        )
      }

      return (
        <td className={`px-1 text-center border-r border-border align-middle ${cellColor}`}>
          <input
            ref={inputRef}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center leading-[inherit] focus:outline-none"
            placeholder={type === "date" ? "DD/MM/YY" : ""}
          />
        </td>
      )
    }

    return (
      <td
        className={`px-1 text-center border-r border-border align-middle cursor-pointer hover:ring-1 hover:ring-primary ${cellColor}`}
        onClick={handleClick}
        data-testid={`cell-${fieldName}-${shipment.jobRef}`}
      >
        {isSaving && editingCell?.shipmentId === shipment.id && editingCell?.fieldName === fieldName ? (
          <Loader2 className="h-3 w-3 animate-spin mx-auto" />
        ) : (
          <span className={type === "textarea" ? "whitespace-pre-wrap block text-xs leading-tight" : "text-xs"}>
            {displayValue !== undefined ? displayValue : value || ""}
          </span>
        )}
      </td>
    )
  }

  // Editable Status Timestamp Cell Component
  const EditableStatusTimestampCell = ({
    shipment,
    statusIndicatorField,
    timestampField,
    statusIndicator,
    timestamp,
  }: {
    shipment: ImportShipment
    statusIndicatorField: string
    timestampField: string
    statusIndicator: number | null
    timestamp: string | null | undefined
  }) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const isEditing = editingCell?.shipmentId === shipment.id && editingCell?.fieldName === timestampField
    const isSaving = updateShipmentMutation.isPending

    useEffect(() => {
      if (isEditing && inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    }, [isEditing])

    const handleClick = () => {
      // Capture column widths before entering edit mode
      if (tableRef.current && !editingCell) {
        const headers = tableRef.current.querySelectorAll('thead th')
        const widths = Array.from(headers).map(th => th.getBoundingClientRect().width)
        setColumnWidths(widths)
      }
      setEditingCell({ shipmentId: shipment.id, fieldName: timestampField })
      // If there's a timestamp, show it in DD/MM/YY format for editing
      setTempValue(timestamp ? formatTimestampDDMMYY(timestamp) : "")
    }

    const handleBlur = () => {
      if (!isSaving) {
        const currentDisplayValue = timestamp ? formatTimestampDDMMYY(timestamp) : ""
        if (tempValue !== currentDisplayValue) {
          handleStatusTimestampSave(shipment.id, statusIndicatorField, timestampField, tempValue)
        } else {
          setEditingCell(null)
          setTempValue("")
        }
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        const currentDisplayValue = timestamp ? formatTimestampDDMMYY(timestamp) : ""
        if (tempValue !== currentDisplayValue) {
          handleStatusTimestampSave(shipment.id, statusIndicatorField, timestampField, tempValue)
        } else {
          setEditingCell(null)
          setTempValue("")
        }
      } else if (e.key === "Escape") {
        setEditingCell(null)
        setTempValue("")
      }
    }

    // Color based on status indicator (3 = green, 2 or 1 = yellow)
    const cellColor = statusIndicator === 3 ? "bg-green-100 dark:bg-green-900" : "bg-yellow-200 dark:bg-yellow-800"

    if (isEditing) {
      return (
        <td className={`px-1 text-center border-r border-border align-middle ${cellColor}`}>
          <input
            ref={inputRef}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-0 ring-0 ring-offset-0 px-0 py-0 text-xs text-center leading-[inherit] focus:outline-none"
            placeholder="DD/MM/YY"
          />
        </td>
      )
    }

    return (
      <td
        className={`px-1 text-center border-r border-border align-middle cursor-pointer hover:ring-1 hover:ring-primary ${cellColor}`}
        onClick={handleClick}
        data-testid={`cell-${timestampField}-${shipment.jobRef}`}
      >
        {isSaving && editingCell?.shipmentId === shipment.id && editingCell?.fieldName === timestampField ? (
          <Loader2 className="h-3 w-3 animate-spin mx-auto" />
        ) : (
          <span className="text-xs">{timestamp ? formatTimestampDDMMYY(timestamp) : ""}</span>
        )}
      </td>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your freight operations.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="container-management" data-testid="tab-container-management">
            <Container className="h-4 w-4 mr-2" />
            Container Management
          </TabsTrigger>
          <TabsTrigger value="nisbets" data-testid="tab-nisbets">
            <Package className="h-4 w-4 mr-2" />
            Nisbets
          </TabsTrigger>
          <TabsTrigger value="import-export-work" data-testid="tab-import-export">
            <FileText className="h-4 w-4 mr-2" />
            Import/Export Work
          </TabsTrigger>
          <TabsTrigger value="clearance-work" data-testid="tab-clearance">
            <Clipboard className="h-4 w-4 mr-2" />
            Clearance Work
          </TabsTrigger>
        </TabsList>

        <TabsContent value="container-management" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Container Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter Bar */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by job ref, customer, vessel, container, or BL number..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-container"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={jobStatusFilter.includes("active") ? "default" : "outline"}
                    onClick={() => toggleJobStatusFilter("active")}
                    data-testid="button-filter-active"
                  >
                    Active Jobs
                  </Button>
                  <Button
                    variant={jobStatusFilter.includes("completed") ? "default" : "outline"}
                    onClick={() => toggleJobStatusFilter("completed")}
                    data-testid="button-filter-completed"
                  >
                    Completed Jobs
                  </Button>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b-2">
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Ref</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Consignee</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Container no.</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Ship Line</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Poa</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Vessel</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Eta Port</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">References</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Delivery Date</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Rls</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Delivery Address</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Rate In</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background">Rate Out</th>
                      <th className="p-1 text-center font-semibold bg-background">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {containerShipments.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="p-4 text-center text-muted-foreground">
                          No container shipments found
                        </td>
                      </tr>
                    ) : (
                      containerShipments.map((shipment) => {
                        const clearanceColor = getClearanceStatusColor(shipment)
                        const deliveryBookedColor = getDeliveryBookedColor(shipment.deliveryBookedStatusIndicator)
                        const releaseColor = getContainerReleaseColor(shipment.containerReleaseStatusIndicator)
                        const addressColor = getDeliveryAddressColor(shipment.deliveryAddress)
                        const invoiceColor = getInvoiceStatusColor(shipment.invoiceCustomerStatusIndicator)

                        return (
                          <tr key={shipment.id} className="border-b-2 hover-elevate h-auto" data-testid={`row-container-${shipment.jobRef}`}>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-ref-${shipment.jobRef}`}>
                              <button
                                onClick={() => setLocation(`/import-shipments?search=${shipment.jobRef}`)}
                                className="text-primary hover:underline font-semibold"
                                data-testid={`link-job-${shipment.jobRef}`}
                              >
                                {shipment.jobRef}
                              </button>
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-consignee-${shipment.jobRef}`}>
                              {getCustomerName(shipment.importCustomerId)}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-container-${shipment.jobRef}`}>
                              {shipment.trailerOrContainerNumber || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-shipline-${shipment.jobRef}`}>
                              {shipment.shippingLine || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-poa-${shipment.jobRef}`}>
                              {shipment.portOfArrival || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-vessel-${shipment.jobRef}`}>
                              {shipment.vesselName || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-eta-${shipment.jobRef}`}>
                              {formatDate(shipment.importDateEtaPort)}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${clearanceColor}`} data-testid={`cell-ref-${shipment.jobRef}`}>
                              {shipment.customerReferenceNumber || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle whitespace-nowrap ${deliveryBookedColor}`} data-testid={`cell-delivery-${shipment.jobRef}`}>
                              {shipment.deliveryDate ? `${formatDate(shipment.deliveryDate)}${shipment.deliveryTime ? ` @ ${formatTime12Hour(shipment.deliveryTime)}` : ''}` : ''}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle font-bold ${releaseColor}`} data-testid={`cell-rls-${shipment.jobRef}`}>
                              {shipment.deliveryRelease || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${addressColor}`} data-testid={`cell-address-${shipment.jobRef}`}>
                              {shipment.deliveryAddress || ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${invoiceColor}`} data-testid={`cell-rate-in-${shipment.jobRef}`}>
                              {shipment.haulierFreightRateIn ? `£${shipment.haulierFreightRateIn}` : ""}
                            </td>
                            <td className={`px-1 text-center border-r border-border align-middle ${invoiceColor}`} data-testid={`cell-rate-out-${shipment.jobRef}`}>
                              {shipment.freightRateOut ? `£${shipment.freightRateOut}` : ""}
                            </td>
                            <td className="px-1 text-left align-top whitespace-pre-wrap bg-green-100 dark:bg-green-900" data-testid={`cell-notes-${shipment.jobRef}`}>
                              {shipment.additionalNotes || ""}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nisbets" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Nisbets Shipment Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by job ref, Ligentia ref, haulier, supplier, truck number..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-nisbets"
                  />
                </div>
              </div>

              <div className="overflow-auto">
                <table ref={tableRef} className={`w-full border-collapse text-xs ${editingCell ? 'table-fixed' : ''}`}>
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b-2">
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[0] ? { width: `${columnWidths[0]}px` } : undefined}>Ref</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[1] ? { width: `${columnWidths[1]}px` } : undefined}>Ligentia Ref</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[2] ? { width: `${columnWidths[2]}px` } : undefined}>Haulier</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[3] ? { width: `${columnWidths[3]}px` } : undefined}>Supplier</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[4] ? { width: `${columnWidths[4]}px` } : undefined}>Country</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[5] ? { width: `${columnWidths[5]}px` } : undefined}>Destination</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[6] ? { width: `${columnWidths[6]}px` } : undefined}>Date of Collection</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[7] ? { width: `${columnWidths[7]}px` } : undefined}>Departure Date</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[8] ? { width: `${columnWidths[8]}px` } : undefined}>Truck Number</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[9] ? { width: `${columnWidths[9]}px` } : undefined}>Port</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[10] ? { width: `${columnWidths[10]}px` } : undefined}>Eta Uk Port</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[11] ? { width: `${columnWidths[11]}px` } : undefined}>Total Package</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[12] ? { width: `${columnWidths[12]}px` } : undefined}>Weight</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[13] ? { width: `${columnWidths[13]}px` } : undefined}>Details Sent to Ligentia</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[14] ? { width: `${columnWidths[14]}px` } : undefined}>Entry to Haulier</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[15] ? { width: `${columnWidths[15]}px` } : undefined}>Delivery Booked Date</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[16] ? { width: `${columnWidths[16]}px` } : undefined}>Price Out</th>
                      <th className="p-1 text-center font-semibold border-r border-border bg-background" style={editingCell && columnWidths[17] ? { width: `${columnWidths[17]}px` } : undefined}>Pod Sent</th>
                      <th className="p-1 text-center font-semibold bg-background" style={editingCell && columnWidths[18] ? { width: `${columnWidths[18]}px` } : undefined}>Net Cost</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {(() => {
                      // Find Nisbets PLC customer ID
                      const nisbetsCustomer = importCustomers.find(c => c.companyName === "Nisbets PLC")
                      
                      // Filter for Road Shipment jobs with Nisbets PLC customer
                      const nisbetsShipments = importShipments
                        .filter(s => s.containerShipment === "Road Shipment" && s.importCustomerId === nisbetsCustomer?.id)
                        .filter(s => {
                          if (!searchText.trim()) return true
                          const search = searchText.toLowerCase()
                          return (
                            s.jobRef?.toString().includes(search) ||
                            s.customerReferenceNumber?.toLowerCase().includes(search) ||
                            s.haulierName?.toLowerCase().includes(search) ||
                            s.supplierName?.toLowerCase().includes(search) ||
                            s.trailerOrContainerNumber?.toLowerCase().includes(search)
                          )
                        })
                        .sort((a, b) => (b.jobRef || 0) - (a.jobRef || 0))

                      // Helper to extract city/town from delivery address
                      const getDestination = (address: string | null): string => {
                        if (!address) return ""
                        const lines = address.split('\n').map(l => l.trim()).filter(l => l)
                        // Return second-to-last line (usually city/town) or last line if only one line exists
                        return lines.length > 1 ? lines[lines.length - 2] : lines[0] || ""
                      }

                      // Helper to format Price Out (3 lines max)
                      const formatPriceOut = (shipment: ImportShipment): string => {
                        const lines: string[] = []
                        if (shipment.freightRateOut && parseFloat(shipment.freightRateOut) > 0) {
                          lines.push(`£${shipment.freightRateOut} Freight`)
                        }
                        if (shipment.exportCustomsClearanceCharge && parseFloat(shipment.exportCustomsClearanceCharge) > 0) {
                          lines.push(`£${shipment.exportCustomsClearanceCharge} Exp CC`)
                        }
                        if (shipment.clearanceCharge && parseFloat(shipment.clearanceCharge) > 0) {
                          lines.push(`£${shipment.clearanceCharge} Imp CC`)
                        }
                        return lines.join('\n')
                      }

                      // Helper to format Net Cost (3 lines max)
                      const formatNetCost = (shipment: ImportShipment): string => {
                        const lines: string[] = []
                        if (shipment.haulierFreightRateIn && parseFloat(shipment.haulierFreightRateIn) > 0) {
                          lines.push(`£${shipment.haulierFreightRateIn} Freight`)
                        }
                        if (shipment.exportClearanceChargeIn && parseFloat(shipment.exportClearanceChargeIn) > 0) {
                          lines.push(`£${shipment.exportClearanceChargeIn} Exp CC`)
                        }
                        if (shipment.destinationClearanceCostIn && parseFloat(shipment.destinationClearanceCostIn) > 0) {
                          lines.push(`£${shipment.destinationClearanceCostIn} Imp CC`)
                        }
                        return lines.join('\n')
                      }

                      // Helper to get cell color (green if populated, yellow if empty)
                      const getCellColor = (value: string | null | undefined): string => {
                        return value ? "bg-green-100 dark:bg-green-900" : "bg-yellow-200 dark:bg-yellow-800"
                      }

                      if (nisbetsShipments.length === 0) {
                        return (
                          <tr>
                            <td colSpan={19} className="p-4 text-center text-muted-foreground">
                              No Nisbets Road Shipment jobs found
                            </td>
                          </tr>
                        )
                      }

                      return nisbetsShipments.map((shipment) => {
                        const destination = getDestination(shipment.deliveryAddress)
                        const priceOut = formatPriceOut(shipment)
                        const netCost = formatNetCost(shipment)

                        // Prepare haulier options for dropdown
                        const haulierOptions = hauliers.map(h => ({ value: h.haulierName, label: h.haulierName }))
                        
                        // Prepare country options for dropdown
                        const countryOptions = commonCountries.map(c => ({ value: c, label: c }))

                        return (
                          <tr key={shipment.id} className="border-b-2 hover-elevate h-auto" data-testid={`row-nisbets-${shipment.jobRef}`}>
                            {/* Job Ref - READ ONLY */}
                            <td className={`px-1 text-center border-r border-border align-middle ${getCellColor(shipment.jobRef?.toString())}`} data-testid={`cell-ref-${shipment.jobRef}`}>
                              <button
                                onClick={() => setLocation(`/import-shipments?search=${shipment.jobRef}`)}
                                className="text-primary hover:underline font-semibold"
                                data-testid={`link-job-${shipment.jobRef}`}
                              >
                                {shipment.jobRef}
                              </button>
                            </td>
                            
                            {/* Ligentia Ref - EDITABLE TEXT */}
                            <EditableCell
                              shipment={shipment}
                              fieldName="customerReferenceNumber"
                              value={shipment.customerReferenceNumber || ""}
                              type="text"
                            />
                            
                            {/* Haulier - EDITABLE DROPDOWN */}
                            <EditableCell
                              shipment={shipment}
                              fieldName="haulierName"
                              value={shipment.haulierName || ""}
                              type="dropdown"
                              options={haulierOptions}
                            />
                            
                            {/* Supplier - EDITABLE TEXT */}
                            <EditableCell
                              shipment={shipment}
                              fieldName="supplierName"
                              value={shipment.supplierName || ""}
                              type="text"
                            />
                            
                            {/* Country - EDITABLE TEXT */}
                            <EditableCell
                              shipment={shipment}
                              fieldName="departureCountry"
                              value={shipment.departureCountry || ""}
                              type="text"
                            />
                            
                            {/* Destination - EDITABLE TEXT (full deliveryAddress) */}
                            <EditableCell
                              shipment={shipment}
                              fieldName="deliveryAddress"
                              value={shipment.deliveryAddress || ""}
                              displayValue={destination}
                              type="text"
                            />
                            
                            {/* Collection Date - EDITABLE DATE */}
                            <EditableCell
                              shipment={shipment}
                              fieldName="collectionDate"
                              value={formatDate(shipment.collectionDate)}
                              type="date"
                            />
                            
                            {/* Departure Date - EDITABLE DATE */}
                            <EditableCell
                              shipment={shipment}
                              fieldName="dispatchDate"
                              value={formatDate(shipment.dispatchDate)}
                              type="date"
                            />
                            
                            {/* Truck Number - EDITABLE TEXT */}
                            <EditableCell
                              shipment={shipment}
                              fieldName="trailerOrContainerNumber"
                              value={shipment.trailerOrContainerNumber || ""}
                              type="text"
                            />
                            
                            {/* Port - EDITABLE TEXT */}
                            <EditableCell
                              shipment={shipment}
                              fieldName="portOfArrival"
                              value={shipment.portOfArrival || ""}
                              type="text"
                            />
                            
                            {/* Eta UK Port - EDITABLE DATE */}
                            <EditableCell
                              shipment={shipment}
                              fieldName="importDateEtaPort"
                              value={formatDate(shipment.importDateEtaPort)}
                              type="date"
                            />
                            
                            {/* Total Package - EDITABLE NUMBER */}
                            <EditableCell
                              shipment={shipment}
                              fieldName="numberOfPieces"
                              value={shipment.numberOfPieces || ""}
                              type="number"
                            />
                            
                            {/* Weight - EDITABLE NUMBER */}
                            <EditableCell
                              shipment={shipment}
                              fieldName="weight"
                              value={shipment.weight || ""}
                              type="number"
                            />
                            
                            {/* Details Sent to Ligentia - EDITABLE STATUS TIMESTAMP */}
                            <EditableStatusTimestampCell
                              shipment={shipment}
                              statusIndicatorField="clearanceStatusIndicator"
                              timestampField="clearanceStatusIndicatorTimestamp"
                              statusIndicator={shipment.clearanceStatusIndicator}
                              timestamp={shipment.clearanceStatusIndicatorTimestamp}
                            />
                            
                            {/* Entry to Haulier - EDITABLE STATUS TIMESTAMP */}
                            <EditableStatusTimestampCell
                              shipment={shipment}
                              statusIndicatorField="sendHaulierEadStatusIndicator"
                              timestampField="sendHaulierEadStatusIndicatorTimestamp"
                              statusIndicator={shipment.sendHaulierEadStatusIndicator}
                              timestamp={shipment.sendHaulierEadStatusIndicatorTimestamp}
                            />
                            
                            {/* Delivery Booked Date - EDITABLE DATE */}
                            <EditableCell
                              shipment={shipment}
                              fieldName="deliveryDate"
                              value={formatDate(shipment.deliveryDate)}
                              type="date"
                              customCellColor={getNisbetsDeliveryBookedDateColor(shipment)}
                            />
                            
                            {/* Price Out - READ ONLY */}
                            <td className={`px-1 text-center align-top whitespace-pre-wrap border-r border-border w-32 ${getCellColor(priceOut)}`} data-testid={`cell-price-out-${shipment.jobRef}`}>
                              {priceOut}
                            </td>
                            
                            {/* POD Sent - EDITABLE STATUS TIMESTAMP */}
                            <EditableStatusTimestampCell
                              shipment={shipment}
                              statusIndicatorField="sendPodToCustomerStatusIndicator"
                              timestampField="sendPodToCustomerStatusIndicatorTimestamp"
                              statusIndicator={shipment.sendPodToCustomerStatusIndicator}
                              timestamp={shipment.sendPodToCustomerStatusIndicatorTimestamp}
                            />
                            
                            {/* Net Cost - READ ONLY */}
                            <td className={`px-1 text-center align-top whitespace-pre-wrap w-32 ${getCellColor(netCost)}`} data-testid={`cell-net-cost-${shipment.jobRef}`}>
                              {netCost}
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import-export-work" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Import/Export Work</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Import/Export work view - coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clearance-work" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Clearance Work</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Clearance work view - coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
