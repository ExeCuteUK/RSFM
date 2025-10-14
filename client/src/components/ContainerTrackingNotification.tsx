import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, X, Package } from "lucide-react"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"

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

export function ContainerTrackingNotification() {
  const [, setLocation] = useLocation()
  const [isDismissed, setIsDismissed] = useState(false)
  const { user } = useAuth()

  // Load check data - only refetch when explicitly triggered
  const { data, isLoading } = useQuery<ContainerCheckResponse>({
    queryKey: ["/api/terminal49/check-all-containers"],
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't auto-refetch on mount
    staleTime: Infinity, // Keep data fresh indefinitely (only refetch on explicit invalidation)
  })

  // Extract first name from user's full name
  const firstName = user?.fullName?.split(' ')[0] || ''

  // Stable random greeting - only changes when data changes
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
  }, [data?.allGood, data?.discrepancies?.length, firstName])

  // Stable random sign-off - only changes when data changes
  const signOff = useMemo(() => {
    const signOffs = [
      "Worth taking a look when you get a chance!",
      "Might be worth checking out!",
      "Just thought you should know!",
      "Something to look into when you have a moment.",
      "Thought I'd give you a heads up!",
    ]
    return signOffs[Math.floor(Math.random() * signOffs.length)]
  }, [data?.allGood, data?.discrepancies?.length])

  // Reset dismissal when data changes (after updates)
  useEffect(() => {
    if (data) {
      setIsDismissed(false)
    }
  }, [data?.allGood, data?.discrepancies?.length])

  const handleDismiss = () => {
    // Only dismiss for current session - will re-appear on next dashboard visit
    setIsDismissed(true)
  }

  const generateMessage = () => {
    if (!data) return null

    // Only show discrepancies in notification (filter out not-tracked containers)
    const hasDiscrepancies = (data.discrepancies?.length ?? 0) > 0

    if (!hasDiscrepancies) {
      // Calculate total tracked containers (matched + discrepancies)
      const totalTracked = (data.matchedContainers?.length ?? 0) + (data.discrepancies?.length ?? 0)
      return (
        <>
          {greeting} I've checked {totalTracked} container{totalTracked !== 1 ? 's' : ''} for you and everything looks on schedule – all good!
        </>
      )
    }

    const messageParts: JSX.Element[] = []
    
    data.discrepancies?.forEach((d, idx) => {
      const parts: string[] = []
      const missingFields: string[] = []
      
      if (d.dispatchDiscrepancy) {
        if (d.dispatchDiscrepancy.missingJobData) {
          // Job field is empty - tracking has data available
          missingFields.push('Dispatch Date')
        } else {
          // Normal discrepancy - dates differ
          const days = Math.abs(d.dispatchDiscrepancy.daysDiff!)
          const direction = d.dispatchDiscrepancy.daysDiff! > 0 ? 'later' : 'earlier'
          parts.push(`actually departed ${days} day${days === 1 ? '' : 's'} ${direction} than expected`)
        }
      }
      
      if (d.etaDiscrepancy) {
        if (d.etaDiscrepancy.missingJobData) {
          // Job field is empty - tracking has data available
          missingFields.push('ETA')
        } else {
          // Normal discrepancy - dates differ
          const days = Math.abs(d.etaDiscrepancy.daysDiff!)
          const direction = d.etaDiscrepancy.daysDiff! > 0 ? 'later' : 'earlier'
          parts.push(`is arriving ${days} day${days === 1 ? '' : 's'} ${direction}`)
        }
      }
      
      // Handle delivery discrepancy messaging (only if ETA exists and isn't missing)
      if (d.deliveryDiscrepancy) {
        if (d.etaDiscrepancy && !d.etaDiscrepancy.missingJobData) {
          // ETA changed - use contextual message
          parts.push(`which leaves a ${d.deliveryDiscrepancy.daysFromArrival} day delivery gap based on its new arrival date`)
        } else if (!d.etaDiscrepancy?.missingJobData) {
          // No ETA change - use standalone message about delivery scheduling
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
      
      // Build combined message for this container
      if (missingFields.length === 0 && parts.length === 0) {
        // Nothing to report (shouldn't happen but defensive)
        return
      }
      
      // Construct message combining missing fields and discrepancies
      let containerMsg: JSX.Element
      
      if (missingFields.length > 0 && parts.length > 0) {
        // Both missing fields and discrepancies - combine them
        const fieldList = missingFields.length === 1 
          ? missingFields[0]
          : `${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`
        
        const discrepancyText = parts.length === 1 
          ? parts[0]
          : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
        
        containerMsg = (
          <span key={idx}>
            Container <strong>{d.containerNumber}</strong> is missing {fieldList} in the job record (available via <strong>Check Current Containers</strong> in Import Shipments), and also {discrepancyText}
          </span>
        )
      } else if (missingFields.length > 0) {
        // Only missing fields
        const fieldList = missingFields.length === 1 
          ? missingFields[0]
          : `${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`
        
        containerMsg = (
          <span key={idx}>
            Container <strong>{d.containerNumber}</strong> is missing {fieldList} in the job record, but this info is available in tracking data. You can auto-fill it using the <strong>Check Current Containers</strong> button in Import Shipments
          </span>
        )
      } else {
        // Only normal discrepancies
        containerMsg = parts.length === 1 
          ? <span key={idx}>Container <strong>{d.containerNumber}</strong> {parts[0]}</span>
          : <span key={idx}>Container <strong>{d.containerNumber}</strong> {parts.slice(0, -1).join(', ')} and {parts[parts.length - 1]}</span>
      }
      
      messageParts.push(containerMsg)
    })

    return (
      <>
        {greeting} I've noticed that {messageParts.map((part, idx) => (
          <span key={idx}>
            {part}
            {idx < messageParts.length - 1 && '. Also, '}
          </span>
        ))}. {signOff}
      </>
    )
  }

  if (isLoading || isDismissed || !data) {
    return null
  }

  // Only show notification if there are actual discrepancies OR if all containers match
  const hasDiscrepancies = (data.discrepancies?.length ?? 0) > 0
  const hasTrackedContainers = (data.matchedContainers?.length ?? 0) > 0 || hasDiscrepancies
  
  if (!hasTrackedContainers) {
    // Don't show notification if there are only untracked containers
    return null
  }

  const isAllGood = !hasDiscrepancies
  const message = generateMessage()

  // Don't render if message generation failed
  if (!message) {
    return null
  }

  return (
    <Card 
      className={`border-l-4 ${isAllGood ? 'border-l-green-500' : 'border-l-yellow-500'}`}
      data-testid="container-tracking-notification"
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          {isAllGood ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm mb-1">
                  {isAllGood ? 'Container Tracking Update' : 'Container Updates Available'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {message}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={handleDismiss}
                data-testid="button-dismiss-notification"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {!isAllGood && (
              <Button
                onClick={() => setLocation('/import-shipments')}
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
  )
}
