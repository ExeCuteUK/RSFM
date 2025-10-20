import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useQuery, useMutation } from "@tanstack/react-query"
import { type ImportShipment, type ExportShipment, type CustomClearance, type ImportCustomer, type Haulier, type ShippingLine } from "@shared/schema"
import { Container, Package, Clipboard, FileText, Search, Loader2, AlertCircle } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useLocation } from "wouter"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { ImportExportWorkGrid } from "@/components/ImportExportWorkGrid"
import { ClearanceWorkGrid } from "@/components/ClearanceWorkGrid"
import { usePageHeader } from "@/contexts/PageHeaderContext"

const DASHBOARD_STORAGE_KEY = 'dashboard_preferences'
const CONTAINER_STORAGE_KEY = 'containerGrid_preferences'
const NISBETS_STORAGE_KEY = 'nisbetsGrid_preferences'

export default function Dashboard() {
  // Load dashboard preferences
  const loadDashboardPrefs = () => {
    const saved = localStorage.getItem(DASHBOARD_STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return {}
      }
    }
    return {}
  }

  const loadContainerPrefs = () => {
    const saved = localStorage.getItem(CONTAINER_STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return {}
      }
    }
    return {}
  }

  const loadNisbetsPrefs = () => {
    const saved = localStorage.getItem(NISBETS_STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return {}
      }
    }
    return {}
  }

  const dashPrefs = loadDashboardPrefs()
  const containerPrefs = loadContainerPrefs()
  const nisbetsPrefs = loadNisbetsPrefs()

  const [activeTab, setActiveTab] = useState(dashPrefs.activeTab || "container-management")
  const [searchText, setSearchText] = useState(dashPrefs.searchText || "")
  const [jobStatusFilter, setJobStatusFilter] = useState<("active" | "completed")[]>(dashPrefs.jobStatusFilter || ["active", "completed"])
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const { setPageTitle, setActionButtons } = usePageHeader()

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ shipmentId: string; fieldName: string } | null>(null)
  const [tempValue, setTempValue] = useState("")
  const [columnWidths, setColumnWidths] = useState<number[]>([])
  const tableRef = useRef<HTMLTableElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Pagination state for Container Management
  const [containerCurrentPage, setContainerCurrentPage] = useState(1)
  const [containerRecordsPerPage, setContainerRecordsPerPage] = useState(containerPrefs.recordsPerPage || 30)

  // Pagination state for Nisbets
  const [nisbetsCurrentPage, setNisbetsCurrentPage] = useState(1)
  const [nisbetsRecordsPerPage, setNisbetsRecordsPerPage] = useState(nisbetsPrefs.recordsPerPage || 30)

  // Save dashboard preferences
  useEffect(() => {
    const prefs = { activeTab, searchText, jobStatusFilter }
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(prefs))
  }, [activeTab, searchText, jobStatusFilter])

  // Save container preferences
  useEffect(() => {
    const prefs = { recordsPerPage: containerRecordsPerPage }
    localStorage.setItem(CONTAINER_STORAGE_KEY, JSON.stringify(prefs))
  }, [containerRecordsPerPage])

  // Save nisbets preferences
  useEffect(() => {
    const prefs = { recordsPerPage: nisbetsRecordsPerPage }
    localStorage.setItem(NISBETS_STORAGE_KEY, JSON.stringify(prefs))
  }, [nisbetsRecordsPerPage])

  // Clear column widths when exiting edit mode
  useEffect(() => {
    if (!editingCell) {
      setColumnWidths([])
    }
  }, [editingCell])

  // Focus input/textarea when entering edit mode
  useEffect(() => {
    if (editingCell) {
      if (inputRef.current) {
        inputRef.current.focus()
      } else if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }, [editingCell])

  // Set page header with tab buttons
  useEffect(() => {
    setPageTitle("Management Sheets")
    setActionButtons(
      <div className="flex gap-0 h-auto bg-card border border-border rounded-md p-0">
        <Button
          variant={activeTab === "container-management" ? "default" : "ghost"}
          onClick={() => setActiveTab("container-management")}
          data-testid="tab-container-management"
          className="rounded-l-md rounded-r-none border-r border-border py-2 px-4 font-semibold"
        >
          <Container className="h-4 w-4 mr-2" />
          Import Containers
        </Button>
        <Button
          variant={activeTab === "nisbets" ? "default" : "ghost"}
          onClick={() => setActiveTab("nisbets")}
          data-testid="tab-nisbets"
          className="rounded-none border-r border-border py-2 px-4 font-semibold"
        >
          <Package className="h-4 w-4 mr-2" />
          Nisbets
        </Button>
        <Button
          variant={activeTab === "import-export-work" ? "default" : "ghost"}
          onClick={() => setActiveTab("import-export-work")}
          data-testid="tab-import-export"
          className="rounded-none border-r border-border py-2 px-4 font-semibold"
        >
          <FileText className="h-4 w-4 mr-2" />
          Import & Export Work
        </Button>
        <Button
          variant={activeTab === "clearance-work" ? "default" : "ghost"}
          onClick={() => setActiveTab("clearance-work")}
          data-testid="tab-clearance"
          className="rounded-r-md rounded-l-none py-2 px-4 font-semibold"
        >
          <Clipboard className="h-4 w-4 mr-2" />
          Customs Clearances
        </Button>
      </div>
    )

    return () => {
      setPageTitle("")
      setActionButtons(null)
    }
  }, [setPageTitle, setActionButtons, activeTab])

  const { data: importShipments = [] } = useQuery<ImportShipment[]>({
    queryKey: ["/api/import-shipments"],
    refetchInterval: editingCell ? false : 10000,
    refetchOnWindowFocus: !editingCell,
  })

  const { data: exportShipments = [] } = useQuery<ExportShipment[]>({
    queryKey: ["/api/export-shipments"],
    refetchInterval: editingCell ? false : 10000,
    refetchOnWindowFocus: !editingCell,
  })

  const { data: customClearances = [] } = useQuery<CustomClearance[]>({
    queryKey: ["/api/custom-clearances"],
    refetchInterval: editingCell ? false : 10000,
    refetchOnWindowFocus: !editingCell,
  })

  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
    refetchOnWindowFocus: true,
  })

  const { data: hauliers = [] } = useQuery<Haulier[]>({
    queryKey: ["/api/hauliers"],
    refetchOnWindowFocus: true,
  })

  const { data: shippingLines = [] } = useQuery<ShippingLine[]>({
    queryKey: ["/api/shipping-lines"],
    refetchOnWindowFocus: true,
  })

  // Mutation for updating shipment
  const updateShipmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImportShipment>; context?: any }) => {
      return await apiRequest("PATCH", `/api/import-shipments/${id}`, data)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      const { data, context } = variables
      const jobRef = context?.jobRef || 'Unknown'
      const fieldName = context?.fieldName || 'field'
      
      // Check if this is a status indicator update
      const statusIndicatorFields = [
        'clearanceStatusIndicator',
        'sendHaulierEadStatusIndicator', 
        'sendPodToCustomerStatusIndicator',
        'deliveryBookedStatusIndicator'
      ]
      
      const isStatusUpdate = Object.keys(data).some(key => statusIndicatorFields.includes(key))
      
      if (isStatusUpdate) {
        // Determine which status was updated and what the new status is
        let statusName = ''
        let statusValue = ''
        
        if ('clearanceStatusIndicator' in data) {
          statusName = 'Clearance Status'
          statusValue = data.clearanceStatusIndicator === 3 ? 'Completed ✓' : 'To Do'
        } else if ('sendHaulierEadStatusIndicator' in data) {
          statusName = 'Send Haulier EAD Status'
          statusValue = data.sendHaulierEadStatusIndicator === 3 ? 'Completed ✓' : 'To Do'
        } else if ('sendPodToCustomerStatusIndicator' in data) {
          statusName = 'Send POD to Customer Status'
          statusValue = data.sendPodToCustomerStatusIndicator === 3 ? 'Completed ✓' : 'To Do'
        } else if ('deliveryBookedStatusIndicator' in data) {
          statusName = 'Delivery Booked Status'
          statusValue = data.deliveryBookedStatusIndicator === 3 ? 'Completed ✓' : 'To Do'
        }
        
        toast({
          title: "Status Updated",
          description: `Job #${jobRef}: ${statusName} → ${statusValue}`,
        })
      } else {
        // Regular field update
        const formattedField = fieldName
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str: string) => str.toUpperCase())
          .trim()
        
        toast({
          title: "Job Updated Successfully",
          description: `Job #${jobRef}: ${formattedField} has been updated`,
        })
      }
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
      const shipment = importShipments.find(s => s.id === shipmentId)
      
      // Handle sendHaulierEadStatusIndicatorTimestamp specially
      if (fieldName === "sendHaulierEadStatusIndicatorTimestamp") {
        if (!value.trim()) {
          // Clearing the timestamp - set status to 2 (yellow/to do)
          updateData.sendHaulierEadStatusIndicator = 2
          updateData.sendHaulierEadStatusIndicatorTimestamp = null as any
        } else {
          // Setting a timestamp - validate DD/MM/YY format and set status to 3 (green/completed)
          const convertedDate = validateAndConvertDate(value)
          if (!convertedDate) {
            throw new Error("Invalid date format. Use DD/MM/YY")
          }
          // Store the entered date at midnight UTC
          const dateObj = new Date(convertedDate)
          updateData.sendHaulierEadStatusIndicator = 3
          updateData.sendHaulierEadStatusIndicatorTimestamp = dateObj.toISOString() as any
        }
      }
      // Handle different field types with validation
      else if (fieldName === "collectionDate" || fieldName === "dispatchDate" || fieldName === "importDateEtaPort" || fieldName === "deliveryDate") {
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
      
      await updateShipmentMutation.mutateAsync({ 
        id: shipmentId, 
        data: updateData,
        context: { jobRef: shipment?.jobRef, fieldName }
      })
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
      const shipment = importShipments.find(s => s.id === shipmentId)
      
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
      
      await updateShipmentMutation.mutateAsync({ 
        id: shipmentId, 
        data: updateData,
        context: { jobRef: shipment?.jobRef, fieldName: timestampField }
      })
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

  // Pagination for Container Management
  const containerTotalRecords = containerShipments.length
  const containerTotalPages = Math.ceil(containerTotalRecords / containerRecordsPerPage)
  const containerStartIndex = (containerCurrentPage - 1) * containerRecordsPerPage
  const containerEndIndex = containerStartIndex + containerRecordsPerPage
  const paginatedContainerShipments = containerShipments.slice(containerStartIndex, containerEndIndex)

  // Reset container page when filters change
  useEffect(() => {
    setContainerCurrentPage(1)
  }, [searchText, jobStatusFilter])

  // Clamp container page to valid bounds
  useEffect(() => {
    if (containerTotalPages > 0 && containerCurrentPage > containerTotalPages) {
      setContainerCurrentPage(containerTotalPages)
    }
  }, [containerTotalPages, containerCurrentPage])

  const handleContainerRecordsPerPageChange = (value: string) => {
    setContainerRecordsPerPage(Number(value))
    setContainerCurrentPage(1)
  }

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

  // Pagination for Nisbets
  const nibsetsTotalRecords = nisbetsShipments.length
  const nibsetsTotalPages = Math.ceil(nibsetsTotalRecords / nisbetsRecordsPerPage)
  const nisbetsStartIndex = (nisbetsCurrentPage - 1) * nisbetsRecordsPerPage
  const nisbetsEndIndex = nisbetsStartIndex + nisbetsRecordsPerPage
  const paginatedNisbetsShipments = nisbetsShipments.slice(nisbetsStartIndex, nisbetsEndIndex)

  // Reset nisbets page when filters change
  useEffect(() => {
    setNisbetsCurrentPage(1)
  }, [searchText, jobStatusFilter])

  // Clamp nisbets page to valid bounds
  useEffect(() => {
    if (nibsetsTotalPages > 0 && nisbetsCurrentPage > nibsetsTotalPages) {
      setNisbetsCurrentPage(nibsetsTotalPages)
    }
  }, [nibsetsTotalPages, nisbetsCurrentPage])

  const handleNisbetsRecordsPerPageChange = (value: string) => {
    setNisbetsRecordsPerPage(Number(value))
    setNisbetsCurrentPage(1)
  }

  // Helper to extract city/town from delivery address
  const getDestination = (address: string | null): string => {
    if (!address) return ""
    const lines = address.split('\n').map(l => l.trim()).filter(l => l)
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
  const getNisbetsCellColor = (value: string | null | undefined): string => {
    // Check if value is empty (null, undefined, empty string, or only whitespace)
    const isEmpty = !value || value.toString().trim() === ''
    return isEmpty ? "bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-black" : "bg-green-100 dark:bg-green-900 dark:text-white"
  }

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
      return "bg-green-100 dark:bg-green-900 dark:text-white"
    }
    
    // Yellow otherwise (empty date OR yellow status OR both)
    return "bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900"
  }

  // Helper to determine cell background color based on clearance status
  const getClearanceStatusColor = (shipment: ImportShipment): string => {
    // If R.S To Clear is unticked (false), set first 8 columns to green
    if (shipment.rsToClear === false) {
      return "bg-green-100 dark:bg-green-900 dark:text-white"
    }
    
    const adviseStatus = (shipment as any).adviseClearanceToAgentStatusIndicator
    
    // Check if Advise Clearance to Agent status is completed (green)
    if (adviseStatus === 3) {
      return "bg-green-100 dark:bg-green-900 dark:text-white"
    }
    
    const clearance = getLinkedClearance(shipment.jobRef)
    if (!clearance) return "bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900"
    
    const status = clearance.status
    if (["Awaiting Entry", "Awaiting Arrival", "P.H Hold", "Customs Issue", "Fully Cleared"].includes(status)) {
      return "bg-green-100 dark:bg-green-900 dark:text-white"
    }
    if (status === "Request CC") {
      return "bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900"
    }
    return "bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900"
  }

  // Helper to get delivery booked color
  const getDeliveryBookedColor = (indicator: number | null): string => {
    if (indicator === 3) return "bg-green-100 dark:bg-green-900 dark:text-white"
    if (indicator === 2) return "bg-orange-300 dark:bg-orange-700 dark:text-black"
    return "bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900"
  }

  // Helper to get container release color
  const getContainerReleaseColor = (indicator: number | null): string => {
    if (indicator === 3) return "bg-green-100 dark:bg-green-900 dark:text-white"
    if (indicator === 2) return "bg-orange-300 dark:bg-orange-700 dark:text-black"
    return "bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900"
  }

  // Helper to get delivery address color
  const getDeliveryAddressColor = (address: string | null): string => {
    if (address && address.trim().length > 0) {
      return "bg-green-100 dark:bg-green-900 dark:text-white"
    }
    return "bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900"
  }

  // Helper to get invoice status color
  const getInvoiceStatusColor = (indicator: number | null): string => {
    if (indicator === 3) return "bg-green-100 dark:bg-green-900 dark:text-white"
    return "bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900"
  }

  // Helper to get Rate In/Out color (green when Notify Customer of Arrival is completed)
  const getRateInOutColor = (adviseStatusIndicator: number | null): string => {
    if (adviseStatusIndicator === 3) return "bg-green-100 dark:bg-green-900 dark:text-white"
    return "bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900"
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

  // Cell editing helper functions
  const handleCellClick = (shipmentId: string, fieldName: string, currentValue: string, displayValue?: string) => {
    // Capture column widths before entering edit mode
    if (tableRef.current && !editingCell) {
      const headers = tableRef.current.querySelectorAll('thead th')
      const widths = Array.from(headers).map(th => th.getBoundingClientRect().width)
      setColumnWidths(widths)
    }
    const editValue = displayValue !== undefined ? displayValue : currentValue
    setTempValue(editValue || "")
    setEditingCell({ shipmentId, fieldName })
  }

  const handleCellSave = () => {
    if (!editingCell) return
    handleSave(editingCell.shipmentId, editingCell.fieldName, tempValue)
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setTempValue("")
  }

  const handleCellKeyDown = (e: React.KeyboardEvent, isTextarea: boolean = false) => {
    if (e.key === "Enter" && !isTextarea) {
      e.preventDefault()
      handleCellSave()
    } else if (e.key === "Escape") {
      handleCellCancel()
    }
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
      if (isEditing) {
        // Just focus, don't select - selection happens on click
        if (inputRef.current) {
          inputRef.current.focus()
        }
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
    const cellColor = statusIndicator === 3 ? "bg-green-100 dark:bg-green-900" : "bg-yellow-200 dark:bg-yellow-500 text-gray-900 dark:text-gray-900"

    if (isEditing) {
      return (
        <td className={`px-1 text-center border-r border-border ${cellColor}`}>
          <div className="min-h-[84px] flex items-center justify-center w-full">
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
          </div>
        </td>
      )
    }

    return (
      <td
        className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${cellColor}`}
        onClick={handleClick}
        data-testid={`cell-${timestampField}-${shipment.jobRef}`}
      >
        <div className="min-h-[84px] flex items-center justify-center">
          {isSaving && editingCell?.shipmentId === shipment.id && editingCell?.fieldName === timestampField ? (
            <Loader2 className="h-3 w-3 animate-spin mx-auto" />
          ) : (
            <span className="text-xs">{timestamp ? formatTimestampDDMMYY(timestamp) : ""}</span>
          )}
        </div>
      </td>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="p-6 space-y-6">

        <TabsContent value="container-management" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Container Management Sheet</CardTitle>
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
                <table ref={tableRef} className={`w-full border-collapse text-xs ${editingCell ? 'table-fixed' : ''}`}>
                  <thead className="sticky top-0 bg-muted z-10">
                    <tr className="border-b-2">
                      <th className="p-1 text-center font-medium border-r border-border bg-muted w-12" style={editingCell && columnWidths[0] ? { width: `${columnWidths[0]}px` } : undefined}>Hold</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[1] ? { width: `${columnWidths[1]}px` } : undefined}>Ref</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[2] ? { width: `${columnWidths[2]}px` } : undefined}>Job Date</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[3] ? { width: `${columnWidths[3]}px` } : undefined}>Consignee</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[4] ? { width: `${columnWidths[4]}px` } : undefined}>Container no.</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted w-20" style={editingCell && columnWidths[5] ? { width: `${columnWidths[5]}px` } : undefined}>Ship Line</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[6] ? { width: `${columnWidths[6]}px` } : undefined}>POA</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[7] ? { width: `${columnWidths[7]}px` } : undefined}>Vessel</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[8] ? { width: `${columnWidths[8]}px` } : undefined}>ETA Port</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[9] ? { width: `${columnWidths[9]}px` } : undefined}>References</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[10] ? { width: `${columnWidths[10]}px` } : undefined}>Delivery Date</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[11] ? { width: `${columnWidths[11]}px` } : undefined}>RLS</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[12] ? { width: `${columnWidths[12]}px` } : undefined}>Delivery Address</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[13] ? { width: `${columnWidths[13]}px` } : undefined}>Rate In</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[14] ? { width: `${columnWidths[14]}px` } : undefined}>Rate Out</th>
                      <th className="p-1 text-center font-medium bg-muted w-48" style={editingCell && columnWidths[15] ? { width: `${columnWidths[15]}px` } : undefined}>Notes</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {containerShipments.length === 0 ? (
                      <tr>
                        <td colSpan={16} className="p-4 text-center text-muted-foreground">
                          No container shipments found
                        </td>
                      </tr>
                    ) : (
                      paginatedContainerShipments.map((shipment) => {
                        const linkedClearance = getLinkedClearance(shipment.jobRef)
                        const clearanceColor = getClearanceStatusColor(shipment)
                        const deliveryBookedColor = getDeliveryBookedColor(shipment.deliveryBookedStatusIndicator)
                        const releaseColor = getContainerReleaseColor(shipment.containerReleaseStatusIndicator)
                        const addressColor = getDeliveryAddressColor(shipment.deliveryAddress)
                        const invoiceColor = getInvoiceStatusColor(shipment.invoiceCustomerStatusIndicator)
                        const rateInOutColor = getRateInOutColor(linkedClearance?.adviseAgentStatusIndicator || null)
                        const clearanceHasHoldStatus = linkedClearance && (linkedClearance.status === "P.H Hold" || linkedClearance.status === "Customs Issue")
                        const showHoldIcon = shipment.jobHold || clearanceHasHoldStatus
                        const holdBgColor = showHoldIcon ? "bg-red-100 dark:bg-red-900" : "bg-green-100 dark:bg-green-900 dark:text-white"
                        
                        // Build combined tooltip message
                        let holdTooltip = ""
                        if (shipment.jobHold) {
                          holdTooltip = shipment.holdDescription || "Job on hold"
                        }
                        if (clearanceHasHoldStatus) {
                          const statusMessage = linkedClearance.status === "P.H Hold" ? "Port Health Hold" : "Customs Examination / Query"
                          if (holdTooltip) {
                            holdTooltip = `${holdTooltip}. ${statusMessage}`
                          } else {
                            holdTooltip = statusMessage
                          }
                        }

                        return (
                          <tr key={shipment.id} className="border-b-2 hover-elevate" data-testid={`row-container-${shipment.jobRef}`}>
                            {/* Hold */}
                            <td className={`px-1 text-center border-r border-border ${holdBgColor}`} data-testid={`cell-hold-${shipment.jobRef}`}>
                              <div className="min-h-[84px] flex items-center justify-center">
                                {showHoldIcon && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mx-auto" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{holdTooltip}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </td>
                            {/* Ref - not editable, just a link */}
                            <td className={`px-1 text-center border-r border-border ${clearanceColor}`} data-testid={`cell-ref-${shipment.jobRef}`}>
                              <div className="min-h-[84px] flex items-center justify-center">
                                <button
                                  onClick={() => setLocation(`/import-shipments?search=${shipment.jobRef}`)}
                                  className={`hover:underline ${clearanceColor.includes('yellow') ? 'text-black dark:text-gray-900' : 'text-gray-900 dark:text-white'}`}
                                  data-testid={`link-job-${shipment.jobRef}`}
                                >
                                  {shipment.jobRef}
                                </button>
                              </div>
                            </td>
                            {/* Job Date - EDITABLE DATE (Booking Date) */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "bookingDate" ? (
                              <td className={`px-1 text-center border-r border-border ${clearanceColor}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                    placeholder="DD/MM/YY"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${clearanceColor}`}
                                onClick={() => handleCellClick(shipment.id, "bookingDate", formatDate(shipment.bookingDate))}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{formatDate(shipment.bookingDate)}</span>
                                </div>
                              </td>
                            )}
                            {/* Consignee - read only */}
                            <td className={`px-1 text-center border-r border-border ${clearanceColor}`} data-testid={`cell-consignee-${shipment.jobRef}`}>
                              <div className="min-h-[84px] flex items-center justify-center">
                                {getCustomerName(shipment.importCustomerId)}
                              </div>
                            </td>
                            {/* Container no. */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "trailerOrContainerNumber" ? (
                              <td className={`px-1 text-center border-r border-border ${clearanceColor}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${clearanceColor}`}
                                onClick={() => handleCellClick(shipment.id, "trailerOrContainerNumber", shipment.trailerOrContainerNumber || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.trailerOrContainerNumber || ""}</span>
                                </div>
                              </td>
                            )}
                            {/* Ship Line */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "shippingLine" ? (
                              <td className={`px-1 text-center border-r border-border w-20 ${clearanceColor}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <Select
                                    value={tempValue}
                                    onValueChange={(value) => {
                                      setTempValue(value)
                                      handleSave(shipment.id, "shippingLine", value)
                                    }}
                                  >
                                    <SelectTrigger className="h-auto min-h-0 w-full text-xs border-0 ring-0 ring-offset-0 focus:ring-0 px-0 py-0">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {shippingLines.map(s => (
                                        <SelectItem key={s.id} value={s.shippingLineName || ''}>{s.shippingLineName || ''}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary w-20 ${clearanceColor}`}
                                onClick={() => handleCellClick(shipment.id, "shippingLine", shipment.shippingLine || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.shippingLine || ""}</span>
                                </div>
                              </td>
                            )}
                            {/* Poa */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "portOfArrival" ? (
                              <td className={`px-1 text-center border-r border-border ${clearanceColor}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${clearanceColor}`}
                                onClick={() => handleCellClick(shipment.id, "portOfArrival", shipment.portOfArrival || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.portOfArrival || ""}</span>
                                </div>
                              </td>
                            )}
                            {/* Vessel */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "vesselName" ? (
                              <td className={`px-1 text-center border-r border-border ${clearanceColor}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${clearanceColor}`}
                                onClick={() => handleCellClick(shipment.id, "vesselName", shipment.vesselName || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.vesselName || ""}</span>
                                </div>
                              </td>
                            )}
                            {/* Eta Port */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "importDateEtaPort" ? (
                              <td className={`px-1 text-center border-r border-border ${clearanceColor}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                    placeholder="DD/MM/YY"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${clearanceColor}`}
                                onClick={() => handleCellClick(shipment.id, "importDateEtaPort", shipment.importDateEtaPort || "", formatDate(shipment.importDateEtaPort))}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{formatDate(shipment.importDateEtaPort)}</span>
                                </div>
                              </td>
                            )}
                            {/* References */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "customerReferenceNumber" ? (
                              <td className={`px-1 text-center border-r border-border ${clearanceColor}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${clearanceColor}`}
                                onClick={() => handleCellClick(shipment.id, "customerReferenceNumber", shipment.customerReferenceNumber || "", shipment.handoverContainerAtPort ? 'Handover' : (shipment.customerReferenceNumber || ""))}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.handoverContainerAtPort ? 'Handover' : (shipment.customerReferenceNumber || "")}</span>
                                </div>
                              </td>
                            )}
                            {/* Delivery Date - read only */}
                            <td className={`px-1 text-center border-r border-border ${shipment.handoverContainerAtPort ? 'bg-green-100 dark:bg-green-900' : deliveryBookedColor}`} data-testid={`cell-delivery-date-${shipment.jobRef}`}>
                              <div className="min-h-[84px] flex items-center justify-center">
                                {shipment.handoverContainerAtPort ? 'N/A' : (shipment.deliveryDate ? `${formatDate(shipment.deliveryDate)}${shipment.deliveryTime ? ` @ ${formatTime12Hour(shipment.deliveryTime)}` : ''}` : '')}
                              </div>
                            </td>
                            {/* Rls */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "deliveryRelease" ? (
                              <td className={`px-1 text-center border-r border-border ${releaseColor}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${releaseColor}`}
                                onClick={() => handleCellClick(shipment.id, "deliveryRelease", shipment.deliveryRelease || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.deliveryRelease || ""}</span>
                                </div>
                              </td>
                            )}
                            {/* Delivery Address - read only when handover enabled */}
                            {shipment.handoverContainerAtPort ? (
                              <td className="px-1 text-center border-r border-border bg-green-100 dark:bg-green-900" data-testid={`cell-delivery-address-${shipment.jobRef}`}>
                                <div className="min-h-[84px] flex items-center justify-center">
                                  N/A
                                </div>
                              </td>
                            ) : editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "deliveryAddress" ? (
                              <td className={`px-1 text-center border-r border-border ${addressColor}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${addressColor}`}
                                onClick={() => handleCellClick(shipment.id, "deliveryAddress", shipment.deliveryAddress || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <span className="block text-xs whitespace-pre-wrap">
                                    {shipment.deliveryAddress ? shipment.deliveryAddress.split(',').map(part => part.trim()).join('\n') : ""}
                                  </span>
                                </div>
                              </td>
                            )}
                            {/* Rate In - read only */}
                            <td className={`px-1 text-center border-r border-border ${rateInOutColor}`}>
                              <div className="min-h-[84px] flex items-center justify-center">
                                <span className="block text-xs">{shipment.haulierFreightRateIn ? `£${shipment.haulierFreightRateIn}` : ""}</span>
                              </div>
                            </td>
                            {/* Rate Out - read only */}
                            <td className={`px-1 text-center border-r border-border ${rateInOutColor}`}>
                              <div className="min-h-[84px] flex items-center justify-center">
                                <span className="block text-xs">{shipment.freightRateOut ? `£${shipment.freightRateOut}` : ""}</span>
                              </div>
                            </td>
                            {/* Notes */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "additionalNotes" ? (
                              <td className="px-1 text-center border-r border-border bg-green-100 dark:bg-green-900 w-48">
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <textarea
                                    ref={textareaRef}
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e, true)}
                                    onBlur={handleCellSave}
                                    className="w-full min-h-[60px] max-h-[60px] text-sm text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none resize-none px-0 py-0 leading-tight"
                                    rows={3}
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className="px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary bg-green-100 dark:bg-green-900 w-48"
                                onClick={() => handleCellClick(shipment.id, "additionalNotes", shipment.additionalNotes || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <span className="whitespace-pre-wrap block text-xs leading-tight">
                                    {shipment.additionalNotes || ""}
                                  </span>
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {containerShipments.length > 0 && (
                <div className="flex items-center justify-between gap-4 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Records per page:</span>
                    <Select value={containerRecordsPerPage.toString()} onValueChange={handleContainerRecordsPerPageChange}>
                      <SelectTrigger className="w-20" data-testid="select-container-records-per-page">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                      Showing {containerStartIndex + 1}-{Math.min(containerEndIndex, containerTotalRecords)} of {containerTotalRecords}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setContainerCurrentPage(containerCurrentPage - 1)}
                      disabled={containerCurrentPage === 1}
                      data-testid="button-container-prev-page"
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium">
                      Page {containerCurrentPage} of {containerTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setContainerCurrentPage(containerCurrentPage + 1)}
                      disabled={containerCurrentPage >= containerTotalPages}
                      data-testid="button-container-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nisbets" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Nisbets Management Sheet</CardTitle>
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
                  <thead className="sticky top-0 bg-muted z-10">
                    <tr className="border-b-2">
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[0] ? { width: `${columnWidths[0]}px` } : undefined}>Ref</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[1] ? { width: `${columnWidths[1]}px` } : undefined}>Ligentia Ref</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[2] ? { width: `${columnWidths[2]}px` } : undefined}>Job Date</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[3] ? { width: `${columnWidths[3]}px` } : undefined}>Haulier</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[4] ? { width: `${columnWidths[4]}px` } : undefined}>Supplier</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[5] ? { width: `${columnWidths[5]}px` } : undefined}>Country</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[6] ? { width: `${columnWidths[6]}px` } : undefined}>Destination</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[7] ? { width: `${columnWidths[7]}px` } : undefined}>Departure Date</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[8] ? { width: `${columnWidths[8]}px` } : undefined}>Identifier</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[9] ? { width: `${columnWidths[9]}px` } : undefined}>Port</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[10] ? { width: `${columnWidths[10]}px` } : undefined}>ETA Port</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[11] ? { width: `${columnWidths[11]}px` } : undefined}>QTY</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[12] ? { width: `${columnWidths[12]}px` } : undefined}>Weight</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[13] ? { width: `${columnWidths[13]}px` } : undefined}>Details Sent to Ligentia</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[14] ? { width: `${columnWidths[14]}px` } : undefined}>Entry to Haulier</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[15] ? { width: `${columnWidths[15]}px` } : undefined}>Delivery Booked Date</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[16] ? { width: `${columnWidths[16]}px` } : undefined}>Net Cost</th>
                      <th className="p-1 text-center font-medium border-r border-border bg-muted" style={editingCell && columnWidths[17] ? { width: `${columnWidths[17]}px` } : undefined}>Price Out</th>
                      <th className="p-1 text-center font-medium bg-muted" style={editingCell && columnWidths[18] ? { width: `${columnWidths[18]}px` } : undefined}>POD Sent</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {(() => {
                      if (paginatedNisbetsShipments.length === 0 && nisbetsShipments.length === 0) {
                        return (
                          <tr>
                            <td colSpan={19} className="p-4 text-center text-muted-foreground">
                              No Nisbets Road Shipment jobs found
                            </td>
                          </tr>
                        )
                      }

                      return paginatedNisbetsShipments.map((shipment) => {
                        const destination = getDestination(shipment.deliveryAddress)
                        const priceOut = formatPriceOut(shipment)
                        const netCost = formatNetCost(shipment)

                        // Prepare haulier options for dropdown
                        const haulierOptions = hauliers.map(h => ({ value: h.haulierName, label: h.haulierName }))
                        
                        // Prepare country options for dropdown
                        const countryOptions = commonCountries.map(c => ({ value: c, label: c }))

                        return (
                          <tr key={shipment.id} className="border-b-2 hover-elevate" data-testid={`row-nisbets-${shipment.jobRef}`}>
                            {/* Job Ref - READ ONLY */}
                            <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.jobRef?.toString())}`} data-testid={`cell-ref-${shipment.jobRef}`}>
                              <div className="min-h-[84px] flex items-center justify-center">
                                <button
                                  onClick={() => setLocation(`/import-shipments?search=${shipment.jobRef}`)}
                                  className="text-blue-600 dark:text-blue-300 hover:underline"
                                  data-testid={`link-job-${shipment.jobRef}`}
                                >
                                  {shipment.jobRef}
                                </button>
                              </div>
                            </td>
                            
                            {/* Ligentia Ref - EDITABLE TEXT */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "customerReferenceNumber" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.customerReferenceNumber)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsCellColor(shipment.customerReferenceNumber)}`}
                                onClick={() => handleCellClick(shipment.id, "customerReferenceNumber", shipment.customerReferenceNumber || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.customerReferenceNumber || ""}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Job Date - EDITABLE DATE (Booking Date) */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "bookingDate" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.bookingDate)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                    placeholder="DD/MM/YY"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsCellColor(shipment.bookingDate)}`}
                                onClick={() => handleCellClick(shipment.id, "bookingDate", formatDate(shipment.bookingDate))}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{formatDate(shipment.bookingDate)}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Haulier - EDITABLE DROPDOWN */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "haulierName" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.haulierName)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <Select
                                    value={tempValue}
                                    onValueChange={(value) => {
                                      setTempValue(value)
                                      handleSave(shipment.id, "haulierName", value)
                                    }}
                                  >
                                    <SelectTrigger className="h-auto min-h-0 w-full text-xs border-0 ring-0 ring-offset-0 focus:ring-0 px-0 py-0">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {haulierOptions.map(h => (
                                        <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsCellColor(shipment.haulierName)}`}
                                onClick={() => handleCellClick(shipment.id, "haulierName", shipment.haulierName || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.haulierName || ""}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Supplier - EDITABLE TEXT */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "supplierName" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.supplierName)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsCellColor(shipment.supplierName)}`}
                                onClick={() => handleCellClick(shipment.id, "supplierName", shipment.supplierName || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.supplierName || ""}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Country - EDITABLE TEXT */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "departureCountry" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.departureCountry)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsCellColor(shipment.departureCountry)}`}
                                onClick={() => handleCellClick(shipment.id, "departureCountry", shipment.departureCountry || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.departureCountry || ""}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Destination - EDITABLE TEXT (full deliveryAddress) */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "deliveryAddress" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.deliveryAddress)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsCellColor(shipment.deliveryAddress)}`}
                                onClick={() => handleCellClick(shipment.id, "deliveryAddress", shipment.deliveryAddress || "", destination)}
                              >
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <span className="block text-xs">{destination}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Departure Date - EDITABLE DATE */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "dispatchDate" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.dispatchDate)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                    placeholder="DD/MM/YY"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsCellColor(shipment.dispatchDate)}`}
                                onClick={() => handleCellClick(shipment.id, "dispatchDate", formatDate(shipment.dispatchDate))}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{formatDate(shipment.dispatchDate)}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Truck Number - EDITABLE TEXT */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "trailerOrContainerNumber" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.trailerOrContainerNumber)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsCellColor(shipment.trailerOrContainerNumber)}`}
                                onClick={() => handleCellClick(shipment.id, "trailerOrContainerNumber", shipment.trailerOrContainerNumber || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.trailerOrContainerNumber || ""}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Port - EDITABLE TEXT */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "portOfArrival" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.portOfArrival)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsCellColor(shipment.portOfArrival)}`}
                                onClick={() => handleCellClick(shipment.id, "portOfArrival", shipment.portOfArrival || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.portOfArrival || ""}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Eta UK Port - EDITABLE DATE */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "importDateEtaPort" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.importDateEtaPort)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                    placeholder="DD/MM/YY"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsCellColor(shipment.importDateEtaPort)}`}
                                onClick={() => handleCellClick(shipment.id, "importDateEtaPort", formatDate(shipment.importDateEtaPort))}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{formatDate(shipment.importDateEtaPort)}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Total Package - EDITABLE NUMBER */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "numberOfPieces" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.numberOfPieces)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsCellColor(shipment.numberOfPieces)}`}
                                onClick={() => handleCellClick(shipment.id, "numberOfPieces", shipment.numberOfPieces || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.numberOfPieces || ""}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Weight - EDITABLE NUMBER */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "weight" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.weight)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsCellColor(shipment.weight)}`}
                                onClick={() => handleCellClick(shipment.id, "weight", shipment.weight || "")}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.weight || ""}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Details Sent to Ligentia - EDITABLE STATUS TIMESTAMP */}
                            <EditableStatusTimestampCell
                              shipment={shipment}
                              statusIndicatorField="clearanceStatusIndicator"
                              timestampField="clearanceStatusIndicatorTimestamp"
                              statusIndicator={shipment.clearanceStatusIndicator}
                              timestamp={shipment.clearanceStatusIndicatorTimestamp}
                            />
                            
                            {/* Entry to Haulier - CUSTOM CELL */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "sendHaulierEadStatusIndicatorTimestamp" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsCellColor(shipment.sendHaulierEadStatusIndicatorTimestamp)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                    placeholder="DD/MM/YY"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsCellColor(shipment.sendHaulierEadStatusIndicatorTimestamp)}`}
                                onClick={() => handleCellClick(shipment.id, "sendHaulierEadStatusIndicatorTimestamp", shipment.sendHaulierEadStatusIndicatorTimestamp ? formatTimestampDDMMYY(shipment.sendHaulierEadStatusIndicatorTimestamp) : "")}
                                data-testid={`cell-entry-haulier-${shipment.jobRef}`}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{shipment.sendHaulierEadStatusIndicatorTimestamp ? formatTimestampDDMMYY(shipment.sendHaulierEadStatusIndicatorTimestamp) : ""}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Delivery Booked Date - EDITABLE DATE */}
                            {editingCell?.shipmentId === shipment.id && editingCell?.fieldName === "deliveryDate" ? (
                              <td className={`px-1 text-center border-r border-border ${getNisbetsDeliveryBookedDateColor(shipment)}`}>
                                <div className="min-h-[84px] flex items-center justify-center w-full">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onKeyDown={(e) => handleCellKeyDown(e)}
                                    onBlur={handleCellSave}
                                    className="w-full text-xs text-center bg-transparent border-0 ring-0 ring-offset-0 focus:outline-none px-0 py-0"
                                    placeholder="DD/MM/YY"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td
                                className={`px-1 text-center border-r border-border cursor-pointer hover:ring-1 hover:ring-primary ${getNisbetsDeliveryBookedDateColor(shipment)}`}
                                onClick={() => handleCellClick(shipment.id, "deliveryDate", formatDate(shipment.deliveryDate))}
                              >
                                <div className="min-h-[84px] flex items-center justify-center">
                                  <span className="block text-xs">{formatDate(shipment.deliveryDate)}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Net Cost - READ ONLY */}
                            <td className={`px-1 text-center whitespace-pre-wrap border-r border-border w-32 ${getNisbetsCellColor(netCost)}`} data-testid={`cell-net-cost-${shipment.jobRef}`}>
                              <div className="min-h-[84px] flex items-center justify-center">
                                {netCost}
                              </div>
                            </td>
                            
                            {/* Price Out - READ ONLY */}
                            <td className={`px-1 text-center whitespace-pre-wrap border-r border-border w-32 ${getNisbetsCellColor(priceOut)}`} data-testid={`cell-price-out-${shipment.jobRef}`}>
                              <div className="min-h-[84px] flex items-center justify-center">
                                {priceOut}
                              </div>
                            </td>
                            
                            {/* POD Sent - EDITABLE STATUS TIMESTAMP */}
                            <EditableStatusTimestampCell
                              shipment={shipment}
                              statusIndicatorField="sendPodToCustomerStatusIndicator"
                              timestampField="sendPodToCustomerStatusIndicatorTimestamp"
                              statusIndicator={shipment.sendPodToCustomerStatusIndicator}
                              timestamp={shipment.sendPodToCustomerStatusIndicatorTimestamp}
                            />
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {nisbetsShipments.length > 0 && (
                <div className="flex items-center justify-between gap-4 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Records per page:</span>
                    <Select value={nisbetsRecordsPerPage.toString()} onValueChange={handleNisbetsRecordsPerPageChange}>
                      <SelectTrigger className="w-20" data-testid="select-nisbets-records-per-page">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                      Showing {nisbetsStartIndex + 1}-{Math.min(nisbetsEndIndex, nibsetsTotalRecords)} of {nibsetsTotalRecords}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNisbetsCurrentPage(nisbetsCurrentPage - 1)}
                      disabled={nisbetsCurrentPage === 1}
                      data-testid="button-nisbets-prev-page"
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium">
                      Page {nisbetsCurrentPage} of {nibsetsTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNisbetsCurrentPage(nisbetsCurrentPage + 1)}
                      disabled={nisbetsCurrentPage >= nibsetsTotalPages}
                      data-testid="button-nisbets-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import-export-work" className="mt-4">
          <ImportExportWorkGrid />
        </TabsContent>

        <TabsContent value="clearance-work" className="mt-4">
          <ClearanceWorkGrid />
        </TabsContent>
      </div>
    </Tabs>
  )
}
