import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useQuery } from "@tanstack/react-query"
import { type ImportShipment, type ExportShipment, type CustomClearance, type ImportCustomer, type ExportCustomer } from "@shared/schema"
import { Package, Clipboard, AlertCircle, TrendingUp, TrendingDown } from "lucide-react"
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isToday } from "date-fns"

export default function Dashboard() {
  const { data: importShipments = [] } = useQuery<ImportShipment[]>({
    queryKey: ["/api/import-shipments"],
  })

  const { data: exportShipments = [] } = useQuery<ExportShipment[]>({
    queryKey: ["/api/export-shipments"],
  })

  const { data: customClearances = [] } = useQuery<CustomClearance[]>({
    queryKey: ["/api/custom-clearances"],
  })

  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })

  const { data: exportCustomers = [] } = useQuery<ExportCustomer[]>({
    queryKey: ["/api/export-customers"],
  })

  // Date calculations
  const now = new Date()
  const currentMonthStart = startOfMonth(now)
  const currentMonthEnd = endOfMonth(now)
  const previousMonthStart = startOfMonth(subMonths(now, 1))
  const previousMonthEnd = endOfMonth(subMonths(now, 1))

  // Helper function to check if date is in range
  const isInMonth = (dateStr: string, start: Date, end: Date) => {
    if (!dateStr) return false
    try {
      const date = parseISO(dateStr)
      return date >= start && date <= end
    } catch {
      return false
    }
  }

  // Calculate metrics for top 3 cards
  const freightShipmentsThisMonth = [...importShipments, ...exportShipments].filter(
    (s) => isInMonth(s.createdAt, currentMonthStart, currentMonthEnd)
  ).length

  const freightShipmentsPreviousMonth = [...importShipments, ...exportShipments].filter(
    (s) => isInMonth(s.createdAt, previousMonthStart, previousMonthEnd)
  ).length

  const freightShipmentsChange = freightShipmentsPreviousMonth > 0
    ? Math.round(((freightShipmentsThisMonth - freightShipmentsPreviousMonth) / freightShipmentsPreviousMonth) * 100)
    : 0

  const clearanceJobsThisMonth = customClearances.filter(
    (c) => isInMonth(c.createdAt, currentMonthStart, currentMonthEnd)
  ).length

  const clearanceJobsPreviousMonth = customClearances.filter(
    (c) => isInMonth(c.createdAt, previousMonthStart, previousMonthEnd)
  ).length

  const clearanceJobsChange = clearanceJobsPreviousMonth > 0
    ? Math.round(((clearanceJobsThisMonth - clearanceJobsPreviousMonth) / clearanceJobsPreviousMonth) * 100)
    : 0

  const awaitingEntries = customClearances.filter((c) => c.status === "Awaiting Entry").length

  // Calculate Quick Stats metrics
  const importsAwaitingDeparture = importShipments.filter((s) => s.status === "Pending").length
  const importsInTransit = importShipments.filter((s) => s.status === "In Transit").length
  const exportsAwaitingDeparture = exportShipments.filter((s) => s.status === "Pending").length
  const exportsInTransit = exportShipments.filter((s) => s.status === "In Transit").length
  
  const shipmentsBookedToday = [...importShipments, ...exportShipments].filter((s) => {
    try {
      return isToday(parseISO(s.createdAt))
    } catch {
      return false
    }
  }).length

  // Get latest 5 Import or Export jobs (combined and sorted by createdAt descending, fallback to jobRef)
  const allFreightJobs = [...importShipments, ...exportShipments]
    .sort((a, b) => {
      try {
        const dateA = parseISO(a.createdAt)
        const dateB = parseISO(b.createdAt)
        if (dateA.getTime() !== dateB.getTime()) {
          return dateB.getTime() - dateA.getTime()
        }
      } catch {
        // Fall back to jobRef if dates are invalid
      }
      return b.jobRef - a.jobRef
    })
    .slice(0, 5)

  // Helper to get customer name
  const getCustomerName = (job: ImportShipment | ExportShipment): string => {
    if ('importCustomerId' in job) {
      const customer = importCustomers.find((c) => c.id === job.importCustomerId)
      return customer?.companyName || "Unknown Customer"
    } else {
      const customer = exportCustomers.find((c) => c.id === job.destinationCustomerId)
      return customer?.companyName || "Unknown Customer"
    }
  }

  // Helper to get status badge variant
  const getStatusVariant = (status: string): "default" | "secondary" => {
    switch (status) {
      case "Pending":
        return "secondary"
      case "In Transit":
      case "Completed":
      default:
        return "default"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your freight operations.
        </p>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Freight Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-freight-shipments">{freightShipmentsThisMonth}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {freightShipmentsChange >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{freightShipmentsChange}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">{freightShipmentsChange}%</span>
                </>
              )}
              <span className="ml-1">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clearance Jobs</CardTitle>
            <Clipboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-clearance-jobs">{clearanceJobsThisMonth}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {clearanceJobsChange >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{clearanceJobsChange}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">{clearanceJobsChange}%</span>
                </>
              )}
              <span className="ml-1">from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Entries</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-awaiting-entries">{awaitingEntries}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time clearances waiting entry
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Shipments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Shipments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allFreightJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No shipments yet</p>
              ) : (
                allFreightJobs.map((job) => {
                  const isImport = 'importCustomerId' in job
                  const dateLabel = isImport ? "Import Date" : "Load Date"
                  const dateValue = isImport 
                    ? (job as ImportShipment).importDateEtaPort 
                    : (job as ExportShipment).loadDate
                  const formattedDate = dateValue 
                    ? format(parseISO(dateValue), "dd/MM/yy")
                    : "N/A"
                  const deliveryInfo = isImport
                    ? (job as ImportShipment).deliveryAddress
                    : (job as ExportShipment).portOfArrival
                  const deliveryLabel = isImport ? "Delivery Address" : "Port of Arrival"

                  return (
                    <Card key={job.id} className="hover-elevate">
                      <CardHeader className="flex flex-row items-start justify-between gap-1 space-y-0 pb-3">
                        <div>
                          <CardTitle className="text-base" data-testid={`text-job-ref-${job.jobRef}`}>
                            Job #{job.jobRef}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getCustomerName(job)}
                          </p>
                        </div>
                        <Badge variant={getStatusVariant(job.status)} data-testid={`badge-status-${job.jobRef}`}>
                          {job.status}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{deliveryLabel}:</span>
                          <span className="font-medium" data-testid={`text-address-${job.jobRef}`}>
                            {deliveryInfo || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{dateLabel}:</span>
                          <span className="font-medium" data-testid={`text-date-${job.jobRef}`}>
                            {formattedDate}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Weight:</span>
                          <span className="font-medium" data-testid={`text-weight-${job.jobRef}`}>
                            {job.weight || "N/A"} kg
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Imports Awaiting Departure</span>
                <span className="text-xl font-bold" data-testid="text-imports-pending">{importsAwaitingDeparture}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Imports In Transit</span>
                <span className="text-xl font-bold" data-testid="text-imports-in-transit">{importsInTransit}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Exports Awaiting Departure</span>
                <span className="text-xl font-bold" data-testid="text-exports-pending">{exportsAwaitingDeparture}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Exports In Transit</span>
                <span className="text-xl font-bold" data-testid="text-exports-in-transit">{exportsInTransit}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Shipments Booked Today</span>
                <span className="text-xl font-bold" data-testid="text-shipments-today">{shipmentsBookedToday}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
