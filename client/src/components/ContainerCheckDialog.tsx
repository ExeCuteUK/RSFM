import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, AlertTriangle, CheckCircle2, RefreshCw, Package } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface ContainerDiscrepancy {
  shipmentId: string
  jobRef: number
  customerName: string
  containerNumber: string
  currentJobData: {
    containerNumber: string
    portOfArrival: string | null
    eta: string | null
    dispatchDate: string | null
    delivery: string | null
    vessel: string | null
  }
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

interface ContainerCheckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContainerCheckDialog({ open, onOpenChange }: ContainerCheckDialogProps) {
  const { toast } = useToast()
  const [updatingShipment, setUpdatingShipment] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery<ContainerCheckResponse>({
    queryKey: ["/api/terminal49/check-all-containers"],
    enabled: open,
  })

  const updateSingleShipment = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/import-shipments/${id}/update-from-terminal49`, {
        method: "POST",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      toast({
        title: "Success",
        description: "Shipment updated with tracking data",
      })
      refetch()
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
    onSettled: () => {
      setUpdatingShipment(null)
    }
  })

  const handleUpdate = (shipmentId: string) => {
    setUpdatingShipment(shipmentId)
    updateSingleShipment.mutate(shipmentId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Container Tracking Check
          </DialogTitle>
          <DialogDescription>
            Compare job data with live Terminal49 tracking information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data?.allGood ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">All Containers on Track</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Checked {data.totalChecked} container{data.totalChecked !== 1 ? 's' : ''} - all data matches tracking information
              </p>
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4">
              {data?.discrepancies.map((discrepancy) => (
                <div
                  key={discrepancy.shipmentId}
                  className="bg-card border border-border rounded-lg p-4"
                  data-testid={`container-discrepancy-${discrepancy.jobRef}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono">
                          JOB {discrepancy.jobRef}
                        </Badge>
                        <span className="font-medium">{discrepancy.customerName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <div>Container: {discrepancy.containerNumber}</div>
                        {discrepancy.currentJobData.portOfArrival && (
                          <div>Port: {discrepancy.currentJobData.portOfArrival}</div>
                        )}
                        {discrepancy.currentJobData.eta && (
                          <div>ETA: {format(new Date(discrepancy.currentJobData.eta), 'dd MMM yyyy')}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleUpdate(discrepancy.shipmentId)}
                      disabled={updatingShipment === discrepancy.shipmentId}
                      size="sm"
                      data-testid={`button-update-all-${discrepancy.jobRef}`}
                    >
                      {updatingShipment === discrepancy.shipmentId ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Update All
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {discrepancy.dispatchDiscrepancy && (
                      <div className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded p-3">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-red-900 dark:text-red-100">
                            Dispatch Date Mismatch
                          </div>
                          <div className="mt-1 space-y-1">
                            <div>
                              <span className="text-muted-foreground">Job Dispatch:</span>{' '}
                              <span className="font-medium">
                                {format(new Date(discrepancy.dispatchDiscrepancy.jobDispatch), 'dd MMM yyyy')}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tracking Dispatch:</span>{' '}
                              <span className="font-medium">
                                {format(new Date(discrepancy.dispatchDiscrepancy.trackingDispatch), 'dd MMM yyyy')}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {discrepancy.dispatchDiscrepancy.daysDiff > 0
                                ? `${discrepancy.dispatchDiscrepancy.daysDiff} day${discrepancy.dispatchDiscrepancy.daysDiff === 1 ? '' : 's'} later`
                                : `${Math.abs(discrepancy.dispatchDiscrepancy.daysDiff)} day${Math.abs(discrepancy.dispatchDiscrepancy.daysDiff) === 1 ? '' : 's'} earlier`
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {discrepancy.etaDiscrepancy && (
                      <div className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded p-3">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-red-900 dark:text-red-100">
                            ETA Mismatch
                          </div>
                          <div className="mt-1 space-y-1">
                            <div>
                              <span className="text-muted-foreground">Job ETA:</span>{' '}
                              <span className="font-medium">
                                {format(new Date(discrepancy.etaDiscrepancy.jobEta), 'dd MMM yyyy')}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tracking ETA:</span>{' '}
                              <span className="font-medium">
                                {format(new Date(discrepancy.etaDiscrepancy.trackingEta), 'dd MMM yyyy')}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {discrepancy.etaDiscrepancy.daysDiff > 0
                                ? `${discrepancy.etaDiscrepancy.daysDiff} day${discrepancy.etaDiscrepancy.daysDiff === 1 ? '' : 's'} later`
                                : `${Math.abs(discrepancy.etaDiscrepancy.daysDiff)} day${Math.abs(discrepancy.etaDiscrepancy.daysDiff) === 1 ? '' : 's'} earlier`
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {discrepancy.deliveryDiscrepancy && (
                      <div className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded p-3">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-red-900 dark:text-red-100">
                            Delivery vs Arrival Timing
                          </div>
                          <div className="mt-1 space-y-1">
                            <div>
                              <span className="text-muted-foreground">Job Delivery:</span>{' '}
                              <span className="font-medium">
                                {format(new Date(discrepancy.deliveryDiscrepancy.jobDelivery), 'dd MMM yyyy')}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tracking Arrival:</span>{' '}
                              <span className="font-medium">
                                {format(new Date(discrepancy.deliveryDiscrepancy.trackingEta), 'dd MMM yyyy')}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {discrepancy.deliveryDiscrepancy.daysFromArrival} day{discrepancy.deliveryDiscrepancy.daysFromArrival === 1 ? '' : 's'} between arrival and delivery
                              {discrepancy.deliveryDiscrepancy.weekendDaysFromArrival > 0 && (
                                <> ({discrepancy.deliveryDiscrepancy.weekendDaysFromArrival} weekend day{discrepancy.deliveryDiscrepancy.weekendDaysFromArrival === 1 ? '' : 's'})</>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {discrepancy.portDiscrepancy && (
                      <div className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded p-3">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-red-900 dark:text-red-100">
                            Port of Arrival Mismatch
                          </div>
                          <div className="mt-1 space-y-1">
                            <div>
                              <span className="text-muted-foreground">Job Port:</span>{' '}
                              <span className="font-medium">{discrepancy.portDiscrepancy.jobPort}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tracking Port:</span>{' '}
                              <span className="font-medium">{discrepancy.portDiscrepancy.trackingPort}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {discrepancy.vesselDiscrepancy && (
                      <div className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded p-3">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium text-red-900 dark:text-red-100">
                            Vessel Name Mismatch
                          </div>
                          <div className="mt-1 space-y-1">
                            <div>
                              <span className="text-muted-foreground">Job Vessel:</span>{' '}
                              <span className="font-medium">{discrepancy.vesselDiscrepancy.jobVessel}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tracking Vessel:</span>{' '}
                              <span className="font-medium">{discrepancy.vesselDiscrepancy.trackingVessel}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
