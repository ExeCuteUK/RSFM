import { useState } from 'react'
import { useWindowManager } from '@/contexts/WindowManagerContext'
import { DraggableWindow } from './DraggableWindow'
import { CustomClearanceForm } from './custom-clearance-form'
import type { InsertCustomClearance } from '@shared/schema'
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

interface CustomClearanceWindowProps {
  windowId: string
  payload: {
    mode: 'create' | 'edit'
    defaultValues?: Partial<InsertCustomClearance>
  }
  onSubmitSuccess: () => void
}

export function CustomClearanceWindow({ windowId, payload, onSubmitSuccess }: CustomClearanceWindowProps) {
  const { closeWindow, minimizeWindow } = useWindowManager()
  const { toast } = useToast()
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const [pendingData, setPendingData] = useState<InsertCustomClearance | null>(null)

  const createMutation = useMutation({
    mutationFn: async (data: InsertCustomClearance) => {
      const response = await apiRequest('POST', '/api/custom-clearances', data)
      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/custom-clearances'] })
      toast({ title: 'Success', description: 'Custom clearance created successfully' })
      onSubmitSuccess()
      closeWindow(windowId)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create custom clearance',
        variant: 'destructive'
      })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: InsertCustomClearance) => {
      const id = (payload.defaultValues as any)?.id
      if (!id) throw new Error('No ID provided for update')
      const response = await apiRequest('PATCH', `/api/custom-clearances/${id}`, data)
      return response.json()
    },
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/custom-clearances'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/import-shipments'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/export-shipments'] })
      toast({ title: 'Success', description: 'Custom clearance updated successfully' })
      
      // Show additional notification if linked shipment was synced
      if (data._syncedToShipment) {
        toast({ 
          title: 'Linked Shipment Updated', 
          description: 'The linked import/export shipment has been updated with your changes'
        })
      }
      
      onSubmitSuccess()
      closeWindow(windowId)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update custom clearance',
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

  const handleSubmit = async (data: InsertCustomClearance) => {
    if (payload.mode === 'create' && data.etaPort) {
      // Try to parse etaPort as a date (it's a text field that may contain a date)
      try {
        const date = new Date(data.etaPort)
        if (!isNaN(date.getTime())) {
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
      } catch (error) {
        // If etaPort is not a valid date, skip validation
        console.log('etaPort is not a valid date, skipping validation')
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
    closeWindow(windowId)
  }

  const title = payload.mode === 'create' ? 'New Custom Clearance' : 'Edit Custom Clearance'
  
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
        onMinimize={() => minimizeWindow(windowId)}
        width={900}
        height={700}
      >
        <CustomClearanceForm
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
              {pendingData?.etaPort && (() => {
                try {
                  const date = new Date(pendingData.etaPort)
                  if (!isNaN(date.getTime())) {
                    const month = date.getMonth() + 1
                    const year = date.getFullYear()
                    return `No General Reference or Anpario CC entry exists for ${getMonthName(month)} ${year}. Would you like to proceed anyway?`
                  }
                } catch (error) {
                  return 'No General Reference or Anpario CC entry exists for this month. Would you like to proceed anyway?'
                }
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
