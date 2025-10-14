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
  status: 'discrepancy'
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

interface MatchedContainer {
  shipmentId: string
  jobRef: number
  customerName: string
  containerNumber: string
  status: 'matched'
  currentJobData: {
    containerNumber: string
    portOfArrival: string | null
    eta: string | null
    dispatchDate: string | null
    delivery: string | null
    vessel: string | null
  }
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

interface ContainerCheckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContainerCheckDialog({ open, onOpenChange }: ContainerCheckDialogProps) {
  const { toast } = useToast()
  const [updatingField, setUpdatingField] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery<ContainerCheckResponse>({
    queryKey: ["/api/terminal49/check-all-containers"],
    enabled: open,
  })

  const updateField = useMutation({
    mutationFn: async ({ shipmentId, field }: { shipmentId: string; field: string }) => {
      return apiRequest("PATCH", `/api/import-shipments/${shipmentId}/update-field/${field}`)
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/terminal49/check-all-containers"] })
      toast({
        title: "Success",
        description: `${variables.field.charAt(0).toUpperCase() + variables.field.slice(1)} updated with tracking data`,
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
      setUpdatingField(null)
    }
  })

  const handleFieldUpdate = (shipmentId: string, field: string) => {
    setUpdatingField(`${shipmentId}-${field}`)
    updateField.mutate({ shipmentId, field })
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
            Compare job data with live tracking information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4">
              {/* Discrepancies - Red */}
              {data?.discrepancies?.map((discrepancy) => (
                <div
                  key={discrepancy.shipmentId}
                  className="bg-card border border-border rounded-lg p-4"
                  data-testid={`container-discrepancy-${discrepancy.jobRef}`}
                >
                  <div className="flex-1 mb-3">
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

                  <div className="space-y-2">
                    {discrepancy.dispatchDiscrepancy && (
                      <div className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded p-3">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-red-900 dark:text-red-100">
                              Dispatch Date Mismatch
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleFieldUpdate(discrepancy.shipmentId, 'dispatch')}
                              disabled={updatingField === `${discrepancy.shipmentId}-dispatch`}
                              data-testid={`button-update-dispatch-${discrepancy.containerNumber}`}
                            >
                              {updatingField === `${discrepancy.shipmentId}-dispatch` ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                'Update'
                              )}
                            </Button>
                          </div>
                          <div className="mt-1 space-y-1">
                            <div>
                              <span className="text-muted-foreground">Job:</span>{' '}
                              <span className="font-medium">
                                {format(new Date(discrepancy.dispatchDiscrepancy.jobDispatch), 'dd MMM yyyy')}
                              </span>
                              {' '}<span className="text-muted-foreground">|</span>{' '}
                              <span className="text-muted-foreground">Tracking:</span>{' '}
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
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-red-900 dark:text-red-100">
                              ETA Mismatch
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleFieldUpdate(discrepancy.shipmentId, 'eta')}
                              disabled={updatingField === `${discrepancy.shipmentId}-eta`}
                              data-testid={`button-update-eta-${discrepancy.containerNumber}`}
                            >
                              {updatingField === `${discrepancy.shipmentId}-eta` ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                'Update'
                              )}
                            </Button>
                          </div>
                          <div className="mt-1 space-y-1">
                            <div>
                              <span className="text-muted-foreground">Job:</span>{' '}
                              <span className="font-medium">
                                {format(new Date(discrepancy.etaDiscrepancy.jobEta), 'dd MMM yyyy')}
                              </span>
                              {' '}<span className="text-muted-foreground">|</span>{' '}
                              <span className="text-muted-foreground">Tracking:</span>{' '}
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
                            {discrepancy.deliveryDiscrepancy && (
                              <div className="font-semibold text-red-900 dark:text-red-100 text-xs mt-1">
                                Current Delivery Plan based on new Port ETA: {discrepancy.deliveryDiscrepancy.daysFromArrival} day{discrepancy.deliveryDiscrepancy.daysFromArrival === 1 ? '' : 's'} between arrival and delivery
                                {discrepancy.deliveryDiscrepancy.weekendDaysFromArrival > 0 && (
                                  <> ({discrepancy.deliveryDiscrepancy.weekendDaysFromArrival} weekend day{discrepancy.deliveryDiscrepancy.weekendDaysFromArrival === 1 ? '' : 's'})</>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {discrepancy.portDiscrepancy && (
                      <div className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded p-3">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-red-900 dark:text-red-100">
                              Port of Arrival Mismatch
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleFieldUpdate(discrepancy.shipmentId, 'port')}
                              disabled={updatingField === `${discrepancy.shipmentId}-port`}
                              data-testid={`button-update-port-${discrepancy.containerNumber}`}
                            >
                              {updatingField === `${discrepancy.shipmentId}-port` ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                'Update'
                              )}
                            </Button>
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
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-red-900 dark:text-red-100">
                              Vessel Name Mismatch
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleFieldUpdate(discrepancy.shipmentId, 'vessel')}
                              disabled={updatingField === `${discrepancy.shipmentId}-vessel`}
                              data-testid={`button-update-vessel-${discrepancy.containerNumber}`}
                            >
                              {updatingField === `${discrepancy.shipmentId}-vessel` ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                'Update'
                              )}
                            </Button>
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

              {/* Matched Containers - Green */}
              {data?.matchedContainers?.map((container) => (
                <div
                  key={container.shipmentId}
                  className="bg-card border border-green-200 dark:border-green-900/50 rounded-lg p-4"
                  data-testid={`container-matched-${container.jobRef}`}
                >
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono">
                          JOB {container.jobRef}
                        </Badge>
                        <span className="font-medium">{container.customerName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <div>Container: {container.containerNumber}</div>
                        {container.currentJobData.portOfArrival && (
                          <div>Port: {container.currentJobData.portOfArrival}</div>
                        )}
                        {container.currentJobData.eta && (
                          <div>ETA: {format(new Date(container.currentJobData.eta), 'dd MMM yyyy')}</div>
                        )}
                      </div>
                      <div className="mt-2 font-medium text-green-700 dark:text-green-400 text-sm">
                        ✓ All data matches tracking information
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Not Tracked - Yellow Warning */}
              {data?.notTrackedContainers?.map((container) => (
                <div
                  key={container.shipmentId}
                  className="bg-card border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-4"
                  data-testid={`container-not-tracked-${container.jobRef}`}
                >
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono">
                          JOB {container.jobRef}
                        </Badge>
                        <span className="font-medium">{container.customerName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <div>Container: {container.containerNumber}</div>
                      </div>
                      <div className="mt-2 font-medium text-yellow-700 dark:text-yellow-400 text-sm">
                        Tracking not available (may take up to 1 minute to activate)
                      </div>
                    </div>
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
