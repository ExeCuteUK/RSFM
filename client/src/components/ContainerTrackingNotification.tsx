import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, X, Package } from "lucide-react"
import { useLocation } from "wouter"

interface ContainerDiscrepancy {
  shipmentId: string
  jobRef: number
  customerName: string
  containerNumber: string
  etaDiscrepancy: {
    jobEta: string
    trackingEta: string
    daysDiff: number
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
    jobDispatch: string
    trackingDispatch: string
    daysDiff: number
  } | null
  deliveryDiscrepancy: {
    jobDelivery: string
    trackingEta: string
    daysDiff: number
    daysFromArrival: number
    weekendDaysFromArrival: number
  } | null
}

interface ContainerCheckResponse {
  discrepancies: ContainerDiscrepancy[]
  allGood: boolean
  totalChecked: number
}

export function ContainerTrackingNotification() {
  const [, setLocation] = useLocation()
  const [isDismissed, setIsDismissed] = useState(false)

  // Load check data in background - always fetch fresh when dashboard loads
  const { data, isLoading } = useQuery<ContainerCheckResponse>({
    queryKey: ["/api/terminal49/check-all-containers"],
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Always fetch fresh data when component mounts
    staleTime: 0, // Data is always considered stale to ensure fresh checks
  })

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
    if (!data) return ""

    if (data.allGood) {
      return `Hi! It's Eric here. I've checked ${data.totalChecked} container${data.totalChecked !== 1 ? 's' : ''} for you and everything looks on schedule – all good!`
    }

    const messages: string[] = []
    
    data.discrepancies.forEach((d) => {
      const parts: string[] = []
      
      if (d.dispatchDiscrepancy) {
        const days = Math.abs(d.dispatchDiscrepancy.daysDiff)
        const direction = d.dispatchDiscrepancy.daysDiff > 0 ? 'later' : 'earlier'
        parts.push(`actually departed ${days} day${days === 1 ? '' : 's'} ${direction} than expected`)
      }
      
      if (d.etaDiscrepancy) {
        const days = Math.abs(d.etaDiscrepancy.daysDiff)
        const direction = d.etaDiscrepancy.daysDiff > 0 ? 'later' : 'earlier'
        parts.push(`is arriving ${days} day${days === 1 ? '' : 's'} ${direction}`)
      }
      
      if (d.deliveryDiscrepancy) {
        parts.push(`which leaves a ${d.deliveryDiscrepancy.daysFromArrival} day delivery gap based on its new arrival date`)
      }
      
      if (d.portDiscrepancy) {
        parts.push(`the port of arrival has changed to ${d.portDiscrepancy.trackingPort}`)
      }
      
      if (d.vesselDiscrepancy) {
        parts.push(`the vessel has changed to ${d.vesselDiscrepancy.trackingVessel}`)
      }
      
      if (parts.length > 0) {
        const containerMsg = parts.length === 1 
          ? `Container ${d.containerNumber} ${parts[0]}`
          : `Container ${d.containerNumber} ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
        messages.push(containerMsg)
      }
    })

    const prefix = "Hi! It's Eric here. I've noticed that "
    return prefix + messages.join('. Also, ') + '. Worth taking a look when you get a chance!'
  }

  if (isLoading || isDismissed || !data) {
    return null
  }

  const isAllGood = data?.allGood
  const message = generateMessage()

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
