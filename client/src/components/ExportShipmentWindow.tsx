import { useState } from 'react'
import { useWindowManager } from '@/contexts/WindowManagerContext'
import { DraggableWindow } from './DraggableWindow'
import { ExportShipmentForm } from './export-shipment-form'
import type { InsertExportShipment } from '@shared/schema'
import { useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ExportShipmentWindowProps {
  windowId: string
  payload: {
    mode: 'create' | 'edit'
    defaultValues?: Partial<InsertExportShipment>
  }
  onSubmitSuccess: () => void
}

export function ExportShipmentWindow({ windowId, payload, onSubmitSuccess }: ExportShipmentWindowProps) {
  const { closeWindow, minimizeWindow } = useWindowManager()
  const { toast } = useToast()
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const [pendingData, setPendingData] = useState<InsertExportShipment | null>(null)

  const createMutation = useMutation({
    mutationFn: async (data: InsertExportShipment) => {
      const response = await apiRequest('POST', '/api/export-shipments', data)
      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/export-shipments'] })
      toast({ title: 'Success', description: 'Export shipment created successfully' })
      onSubmitSuccess()
      closeWindow(windowId)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create export shipment',
        variant: 'destructive'
      })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: InsertExportShipment) => {
      const id = (payload.defaultValues as any)?.id
      if (!id) throw new Error('No ID provided for update')
      const response = await apiRequest('PATCH', `/api/export-shipments/${id}`, data)
      return response.json()
    },
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/export-shipments'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/custom-clearances'] })
      toast({ title: 'Success', description: 'Export shipment updated successfully' })
      
      // Show additional notification if linked clearance was synced
      if (data._syncedToClearance) {
        toast({ 
          title: 'Linked Clearance Updated', 
          description: 'The linked custom clearance has been updated with your changes'
        })
      }
      
      onSubmitSuccess()
      closeWindow(windowId)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update export shipment',
        variant: 'destructive'
      })
    }
  })

  const checkReferenceExists = async (month: number, year: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/general-references/check-exists?month=${month}&year=${year}`)
      const data = await response.json()
      return data.exists
    } catch (error) {
      console.error('Error checking reference existence:', error)
      return true // Assume exists on error to avoid blocking
    }
  }

  const handleSubmit = async (data: InsertExportShipment) => {
    if (payload.mode === 'create' && data.bookingDate) {
      // Extract month and year from booking date
      const date = new Date(data.bookingDate)
      const month = date.getMonth() + 1 // JavaScript months are 0-indexed
      const year = date.getFullYear()
      
      // Check if reference exists
      const exists = await checkReferenceExists(month, year)
      
      if (!exists) {
        // Show warning dialog
        setPendingData(data)
        setShowWarningDialog(true)
        return
      }
    }
    
    // Proceed with submission
    if (payload.mode === 'create') {
      createMutation.mutate(data)
    } else {
      updateMutation.mutate(data)
    }
  }

  const handleConfirmSubmit = () => {
    if (pendingData) {
      createMutation.mutate(pendingData)
      setPendingData(null)
    }
    setShowWarningDialog(false)
  }

  const handleCancelSubmit = () => {
    setPendingData(null)
    setShowWarningDialog(false)
  }

  const handleCancel = () => {
    try {
      closeWindow(windowId)
    } catch (error) {
      console.error('Error in handleCancel:', error)
    }
  }

  const title = payload.mode === 'create' ? 'New Export Shipment' : 'Edit Export Shipment'
  
  const getMonthName = (month: number) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return monthNames[month - 1]
  }

  return (
    <>
      <DraggableWindow
        id={windowId}
        title={title}
        onClose={handleCancel}
        onMinimize={() => {
          try {
            minimizeWindow(windowId)
          } catch (error) {
            console.error('Error minimizing window:', error)
          }
        }}
        width={900}
        height={700}
      >
        <ExportShipmentForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          defaultValues={payload.defaultValues}
        />
      </DraggableWindow>

      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent data-testid="alert-missing-reference">
          <AlertDialogHeader>
            <AlertDialogTitle>No General Reference Found</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingData?.bookingDate && (() => {
                const date = new Date(pendingData.bookingDate)
                const month = date.getMonth() + 1
                const year = date.getFullYear()
                return `No General Reference or Anpario CC entry exists for ${getMonthName(month)} ${year}. Would you like to proceed anyway?`
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSubmit} data-testid="button-cancel-submit">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} data-testid="button-confirm-submit">
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
