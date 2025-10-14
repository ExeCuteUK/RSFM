import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, X, Loader2, Package } from "lucide-react"
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
}

interface ContainerCheckResponse {
  discrepancies: ContainerDiscrepancy[]
  allGood: boolean
  totalChecked: number
}

const STORAGE_KEY = 'container_notification_dismissed'

export function ContainerTrackingNotification() {
  const [, setLocation] = useLocation()
  const [isDismissed, setIsDismissed] = useState(false)
  const [showNotification, setShowNotification] = useState(false)

  // Load check data in background - always fetch fresh when dashboard loads
  const { data, isLoading } = useQuery<ContainerCheckResponse>({
    queryKey: ["/api/terminal49/check-all-containers"],
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Always fetch fresh data when component mounts
    staleTime: 0, // Data is always considered stale to ensure fresh checks
  })

  useEffect(() => {
    if (!data || isLoading) return

    // Get dismissed data from localStorage
    const stored = localStorage.getItem(STORAGE_KEY)
    let shouldShow = true

    if (stored) {
      try {
        const dismissed = JSON.parse(stored)
        const today = new Date().toDateString()

        // Create signature of current discrepancies
        const currentSignature = data.discrepancies
          .map(d => `${d.shipmentId}-${d.etaDiscrepancy?.daysDiff}-${d.portDiscrepancy?.trackingPort}-${d.vesselDiscrepancy?.trackingVessel}`)
          .sort()
          .join('|')

        if (data.allGood) {
          // All good: only show once per day
          shouldShow = dismissed.date !== today || !dismissed.allGoodDismissed
        } else {
          // Issues found: show if it's a different day, different issues, or not dismissed
          shouldShow = dismissed.date !== today || dismissed.signature !== currentSignature
        }
      } catch {
        shouldShow = true
      }
    }

    setShowNotification(shouldShow)
  }, [data, isLoading])

  const handleDismiss = () => {
    const today = new Date().toDateString()
    
    if (data?.allGood) {
      // All good: remember we dismissed it today
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        date: today,
        allGoodDismissed: true,
        signature: ''
      }))
    } else if (data?.discrepancies) {
      // Issues: save the signature so we know if issues change
      const signature = data.discrepancies
        .map(d => `${d.shipmentId}-${d.etaDiscrepancy?.daysDiff}-${d.portDiscrepancy?.trackingPort}-${d.vesselDiscrepancy?.trackingVessel}`)
        .sort()
        .join('|')
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        date: today,
        allGoodDismissed: false,
        signature
      }))
    }
    
    setIsDismissed(true)
    setShowNotification(false)
  }

  const generateMessage = () => {
    if (!data) return ""

    if (data.allGood) {
      return `We've checked ${data.totalChecked} container${data.totalChecked !== 1 ? 's' : ''} and everything looks on schedule.`
    }

    const messages: string[] = []
    
    data.discrepancies.forEach((d) => {
      const parts: string[] = []
      
      if (d.etaDiscrepancy) {
        const days = Math.abs(d.etaDiscrepancy.daysDiff)
        const direction = d.etaDiscrepancy.daysDiff > 0 ? 'late' : 'early'
        parts.push(`arriving ${days} day${days === 1 ? '' : 's'} ${direction}`)
      }
      
      if (d.portDiscrepancy) {
        parts.push(`port changed to ${d.portDiscrepancy.trackingPort}`)
      }
      
      if (d.vesselDiscrepancy) {
        parts.push(`vessel changed to ${d.vesselDiscrepancy.trackingVessel}`)
      }
      
      if (parts.length > 0) {
        messages.push(`Container ${d.containerNumber} is ${parts.join(', ')}`)
      }
    })

    return messages.join('. ') + '. Please review these in Import Shipments.'
  }

  if (isLoading || !showNotification || isDismissed) {
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
