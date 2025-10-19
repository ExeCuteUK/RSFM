import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, Package, AlertCircle, PoundSterling } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { useMemo, useEffect } from "react"
import { type ImportShipment, type CustomClearance, type ImportCustomer, type ExportShipment, type ExportCustomer, type JobFileGroup } from "@shared/schema"
import { differenceInDays, parseISO } from "date-fns"
import { usePageHeader } from "@/contexts/PageHeaderContext"

interface ContainerDiscrepancy {
  shipmentId: string
  jobRef: number
  customerName: string
  containerNumber: string
  status: 'discrepancy'
  etaDiscrepancy: {
    jobEta: string | null
    trackingEta: string
    daysDiff: number | null
    missingJobData?: boolean
  } | null
  portDiscrepancy: {
    jobPort: string
    trackingPort: string
  } | null
  vesselDiscrepancy: {
    jobVessel: string
    trackingVessel: string
  } | null
  dispatchDiscrepancy: {
    jobDispatch: string | null
    trackingDispatch: string
    daysDiff: number | null
    missingJobData?: boolean
  } | null
  deliveryDiscrepancy: {
    jobDelivery: string
    trackingEta: string
    daysDiff: number
    daysFromArrival: number
    weekendDaysFromArrival: number
  } | null
}

interface MatchedContainer {
  shipmentId: string
  jobRef: number
  customerName: string
  containerNumber: string
  status: 'matched'
}

interface NotTrackedContainer {
  shipmentId: string
  jobRef: number
  customerName: string
  containerNumber: string
  status: 'not_tracked'
}

interface ContainerCheckResponse {
  discrepancies: ContainerDiscrepancy[]
  matchedContainers: MatchedContainer[]
  notTrackedContainers: NotTrackedContainer[]
  allGood: boolean
  totalChecked: number
}

export default function Eric() {
  const [, setLocation] = useLocation()
  const { user } = useAuth()
  const { setPageTitle, setActionButtons } = usePageHeader()

  // Set page header
  useEffect(() => {
    setPageTitle("E.R.I.C")
    setActionButtons(null)

    return () => {
      setPageTitle("")
      setActionButtons(null)
    }
  }, [setPageTitle, setActionButtons])

  // Fetch container tracking data
  const { data: containerData } = useQuery<ContainerCheckResponse>({
    queryKey: ["/api/terminal49/check-all-containers"],
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  })

  // Fetch import shipments
  const { data: importShipments = [] } = useQuery<ImportShipment[]>({
    queryKey: ["/api/import-shipments"],
  })

  // Fetch export shipments
  const { data: exportShipments = [] } = useQuery<ExportShipment[]>({
    queryKey: ["/api/export-shipments"],
  })

  // Fetch custom clearances
  const { data: customClearances = [] } = useQuery<CustomClearance[]>({
    queryKey: ["/api/custom-clearances"],
  })

  // Fetch customers
  const { data: importCustomers = [] } = useQuery<ImportCustomer[]>({
    queryKey: ["/api/import-customers"],
  })

  const { data: exportCustomers = [] } = useQuery<ExportCustomer[]>({
    queryKey: ["/api/export-customers"],
  })

  // Fetch job file groups
  const { data: jobFileGroups = [] } = useQuery<JobFileGroup[]>({
    queryKey: ["/api/job-file-groups"],
  })

  // Extract first name from user's full name
  const firstName = user?.fullName?.split(' ')[0] || ''

  // Stable random greeting
  const greeting = useMemo(() => {
    const greetingsWithName = firstName ? [
      `Hi ${firstName}! It's Eric here.`,
      `Hey ${firstName}, Eric checking in.`,
      `Quick update for you, ${firstName}. Eric here.`,
    ] : []
    
    const greetingsWithoutName = [
      "Hi! It's Eric here.",
      "Hey there, Eric checking in.",
      "Eric here with an update.",
      "Quick update from Eric.",
      "Hi! Eric here.",
    ]
    
    const allGreetings = [...greetingsWithName, ...greetingsWithoutName]
    return allGreetings[Math.floor(Math.random() * allGreetings.length)]
  }, [firstName])

  // Calculate days until ETA Port (all days, not business days)
  const getDaysUntilEta = (etaPort: string | null): number | null => {
    if (!etaPort) return null
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const eta = parseISO(etaPort)
      eta.setHours(0, 0, 0, 0)
      return differenceInDays(eta, today)
    } catch {
      return null
    }
  }

  // Generate Container Tracking notification message
  const generateContainerTrackingMessage = () => {
    if (!containerData) return null

    const hasDiscrepancies = (containerData.discrepancies?.length ?? 0) > 0

    if (!hasDiscrepancies) {
      const totalTracked = (containerData.matchedContainers?.length ?? 0) + (containerData.discrepancies?.length ?? 0)
      return (
        <>
          {greeting} I've checked {totalTracked} container{totalTracked !== 1 ? 's' : ''} for you and everything looks on schedule – all good!
        </>
      )
    }

    const messageParts: JSX.Element[] = []
    let hasAutoFillableData = false
    
    containerData.discrepancies?.forEach((d, idx) => {
      const parts: string[] = []
      const missingFields: string[] = []
      
      if (d.dispatchDiscrepancy) {
        if (d.dispatchDiscrepancy.missingJobData) {
          missingFields.push('Dispatch Date')
          hasAutoFillableData = true
        } else {
          const days = Math.abs(d.dispatchDiscrepancy.daysDiff!)
          const direction = d.dispatchDiscrepancy.daysDiff! > 0 ? 'later' : 'earlier'
          parts.push(`actually departed ${days} day${days === 1 ? '' : 's'} ${direction} than expected`)
        }
      }
      
      if (d.etaDiscrepancy) {
        if (d.etaDiscrepancy.missingJobData) {
          missingFields.push('ETA')
          hasAutoFillableData = true
        } else {
          const days = Math.abs(d.etaDiscrepancy.daysDiff!)
          const direction = d.etaDiscrepancy.daysDiff! > 0 ? 'later' : 'earlier'
          parts.push(`is arriving ${days} day${days === 1 ? '' : 's'} ${direction}`)
        }
      }
      
      if (d.deliveryDiscrepancy) {
        if (d.etaDiscrepancy && !d.etaDiscrepancy.missingJobData) {
          parts.push(`which leaves a ${d.deliveryDiscrepancy.daysFromArrival} day delivery gap based on its new arrival date`)
        } else if (!d.etaDiscrepancy?.missingJobData) {
          const days = d.deliveryDiscrepancy.daysFromArrival
          parts.push(`has a larger than normal delivery gap of ${days} day${days === 1 ? '' : 's'} between arrival and the delivery booking`)
        }
      }
      
      if (d.portDiscrepancy) {
        parts.push(`the port of arrival has changed to ${d.portDiscrepancy.trackingPort}`)
      }
      
      if (d.vesselDiscrepancy) {
        parts.push(`the vessel has changed to ${d.vesselDiscrepancy.trackingVessel}`)
      }
      
      if (missingFields.length === 0 && parts.length === 0) {
        return
      }
      
      let containerMsg: JSX.Element
      
      if (missingFields.length > 0 && parts.length > 0) {
        const fieldList = missingFields.length === 1 
          ? missingFields[0]
          : `${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`
        
        const discrepancyText = parts.length === 1 
          ? parts[0]
          : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
        
        containerMsg = (
          <span key={idx}>
            Container <strong>{d.containerNumber}</strong> is missing {fieldList} in the job record, and also {discrepancyText}
          </span>
        )
      } else if (missingFields.length > 0) {
        const fieldList = missingFields.length === 1 
          ? missingFields[0]
          : `${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`
        
        containerMsg = (
          <span key={idx}>
            Container <strong>{d.containerNumber}</strong> is missing {fieldList} in the job record
          </span>
        )
      } else {
        containerMsg = parts.length === 1 
          ? <span key={idx}>Container <strong>{d.containerNumber}</strong> {parts[0]}</span>
          : <span key={idx}>Container <strong>{d.containerNumber}</strong> {parts.slice(0, -1).join(', ')} and {parts[parts.length - 1]}</span>
      }
      
      messageParts.push(containerMsg)
    })

    const signOffs = [
      "Worth taking a look when you get a chance!",
      "Might be worth checking out!",
      "Just thought you should know!",
      "Something to look into when you have a moment.",
      "Thought I'd give you a heads up!",
    ]
    const signOff = signOffs[Math.floor(Math.random() * signOffs.length)]

    return (
      <>
        {greeting} I've noticed that {messageParts.map((part, idx) => (
          <span key={idx}>
            {part}
            {idx < messageParts.length - 1 && (messageParts.length === 2 ? ' and ' : idx === messageParts.length - 2 ? ', and ' : ', ')}
          </span>
        ))}. {hasAutoFillableData && (
          <>You can auto-fill {messageParts.length === 1 ? 'this' : 'these'} using the <strong>Check Current Containers</strong> button in Import Shipments. </>
        )}{signOff}
      </>
    )
  }

  // Generate Job Issues notification message
  const generateJobIssuesMessage = () => {
    const issues: JSX.Element[] = []

    // Check for import shipments with job hold
    importShipments.forEach((shipment, idx) => {
      if (shipment.jobHold) {
        const daysUntilEta = getDaysUntilEta(shipment.importDateEtaPort)
        const containerNum = shipment.trailerOrContainerNumber || 'Unknown'
        
        if (daysUntilEta !== null) {
          const daysText = daysUntilEta === 0 
            ? "today" 
            : daysUntilEta > 0 
              ? `in ${daysUntilEta} day${daysUntilEta === 1 ? '' : 's'}`
              : `${Math.abs(daysUntilEta)} day${Math.abs(daysUntilEta) === 1 ? '' : 's'} ago`
          
          issues.push(
            <span key={`hold-${idx}`}>
              Container <strong>{containerNum}</strong> (Job {shipment.jobRef}) is on hold and {daysUntilEta >= 0 ? 'arrives' : 'arrived'} {daysText}
            </span>
          )
        }
      }
    })

    // Check for import shipments linked to clearances with P.H Hold or Customs Issue
    importShipments.forEach((shipment, idx) => {
      const linkedClearance = customClearances.find(c => c.createdFromId === shipment.id)
      if (linkedClearance && (linkedClearance.status === "P.H Hold" || linkedClearance.status === "Customs Issue")) {
        const daysUntilEta = getDaysUntilEta(shipment.importDateEtaPort)
        const containerNum = shipment.trailerOrContainerNumber || 'Unknown'
        const statusText = linkedClearance.status === "P.H Hold" ? "Port Health Hold" : "Customs Issue"
        
        if (daysUntilEta !== null) {
          const daysText = daysUntilEta === 0 
            ? "today" 
            : daysUntilEta > 0 
              ? `in ${daysUntilEta} day${daysUntilEta === 1 ? '' : 's'}`
              : `${Math.abs(daysUntilEta)} day${Math.abs(daysUntilEta) === 1 ? '' : 's'} ago`
          
          issues.push(
            <span key={`clearance-${idx}`}>
              Container <strong>{containerNum}</strong> (Job {shipment.jobRef}) has a {statusText} and {daysUntilEta >= 0 ? 'arrives' : 'arrived'} {daysText}
            </span>
          )
        }
      }
    })

    if (issues.length === 0) {
      return null
    }

    return (
      <>
        Also, I've spotted some job issues you should know about: {issues.map((issue, idx) => (
          <span key={idx}>
            {issue}
            {idx < issues.length - 1 && (issues.length === 2 ? ' and ' : idx === issues.length - 2 ? ', and ' : ', ')}
          </span>
        ))}.
      </>
    )
  }

  // Generate Finance Issues notification message
  const generateFinanceIssuesMessage = () => {
    const overdueInvoices: JSX.Element[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Helper function to check if job has R.S Invoice
    const hasRSInvoice = (jobRef: number): boolean => {
      const fileGroup = jobFileGroups.find(fg => fg.jobRef === jobRef)
      if (!fileGroup || !fileGroup.rsInvoices) return false
      return (fileGroup.rsInvoices as Array<{filename: string; path: string}>).length > 0
    }

    // Check import shipments
    importShipments.forEach((shipment, idx) => {
      if (shipment.importDateEtaPort) {
        try {
          const etaDate = parseISO(shipment.importDateEtaPort)
          etaDate.setHours(0, 0, 0, 0)
          
          if (today > etaDate && !hasRSInvoice(shipment.jobRef)) {
            const customer = importCustomers.find(c => c.id === shipment.importCustomerId)
            overdueInvoices.push(
              <span key={`import-${idx}`}>
                Import Job <strong>{shipment.jobRef}</strong> ({customer?.companyName || 'Unknown Customer'})
              </span>
            )
          }
        } catch {
          // Invalid date, skip
        }
      }
    })

    // Check export shipments
    exportShipments.forEach((shipment, idx) => {
      if (shipment.etaPortDate) {
        try {
          const etaDate = parseISO(shipment.etaPortDate)
          etaDate.setHours(0, 0, 0, 0)
          
          if (today > etaDate && !hasRSInvoice(shipment.jobRef)) {
            const customer = exportCustomers.find(c => c.id === shipment.destinationCustomerId)
            overdueInvoices.push(
              <span key={`export-${idx}`}>
                Export Job <strong>{shipment.jobRef}</strong> ({customer?.companyName || 'Unknown Customer'})
              </span>
            )
          }
        } catch {
          // Invalid date, skip
        }
      }
    })

    // Check non-linked custom clearances
    customClearances.forEach((clearance, idx) => {
      if (!clearance.createdFromId && clearance.etaPort) {
        try {
          const etaDate = parseISO(clearance.etaPort)
          etaDate.setHours(0, 0, 0, 0)
          
          if (today > etaDate && !hasRSInvoice(clearance.jobRef)) {
            const customer = clearance.jobType === "import"
              ? importCustomers.find(c => c.id === clearance.importCustomerId)
              : exportCustomers.find(c => c.id === clearance.exportCustomerId)
            
            overdueInvoices.push(
              <span key={`clearance-${idx}`}>
                Clearance Job <strong>{clearance.jobRef}</strong> ({customer?.companyName || 'Unknown Customer'})
              </span>
            )
          }
        } catch {
          // Invalid date, skip
        }
      }
    })

    if (overdueInvoices.length === 0) {
      return null
    }

    return (
      <>
        One more thing – I've checked the finances and found some jobs past their ETA that haven't been invoiced yet: {overdueInvoices.map((invoice, idx) => (
          <span key={idx}>
            {invoice}
            {idx < overdueInvoices.length - 1 && (overdueInvoices.length === 2 ? ' and ' : idx === overdueInvoices.length - 2 ? ', and ' : ', ')}
          </span>
        ))}. These might need attention when you have a moment.
      </>
    )
  }

  const containerTrackingMessage = generateContainerTrackingMessage()
  const jobIssuesMessage = generateJobIssuesMessage()
  const financeIssuesMessage = generateFinanceIssuesMessage()

  const hasContainerDiscrepancies = (containerData?.discrepancies?.length ?? 0) > 0
  const hasTrackedContainers = (containerData?.matchedContainers?.length ?? 0) > 0 || hasContainerDiscrepancies

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Container Tracking Notification */}
      {containerTrackingMessage && hasTrackedContainers && (
        <Card 
          className={`border-l-4 ${!hasContainerDiscrepancies ? 'border-l-green-500' : 'border-l-yellow-500'}`}
          data-testid="container-tracking-notification"
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {!hasContainerDiscrepancies ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">
                  {!hasContainerDiscrepancies ? 'Container Tracking Update' : 'Container Updates Available'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {containerTrackingMessage}
                </p>
                {hasContainerDiscrepancies && (
                  <Button
                    onClick={() => setLocation('/import-shipments?autoCheck=true')}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    data-testid="button-review-containers"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Review in Import Shipments
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Issues Notification */}
      {jobIssuesMessage && (
        <Card 
          className="border-l-4 border-l-red-500"
          data-testid="job-issues-notification"
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">
                  Job Holds Detected
                </h3>
                <p className="text-sm text-muted-foreground">
                  {jobIssuesMessage}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finance Issues Notification */}
      {financeIssuesMessage && (
        <Card 
          className="border-l-4 border-l-orange-500"
          data-testid="finance-issues-notification"
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <PoundSterling className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">
                  Overdue Invoicing
                </h3>
                <p className="text-sm text-muted-foreground">
                  {financeIssuesMessage}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show message when there are no notifications */}
      {!containerTrackingMessage && !jobIssuesMessage && !financeIssuesMessage && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-sm mb-1">All Clear!</h3>
                <p className="text-sm text-muted-foreground">
                  {greeting} Everything's looking good – no issues to report right now!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
