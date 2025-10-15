import { useWindowManager } from '@/contexts/WindowManagerContext'
import { DraggableWindow } from './DraggableWindow'
import { ImportShipmentForm } from './import-shipment-form'
import type { InsertImportShipment } from '@shared/schema'
import { useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'

interface ImportShipmentWindowProps {
  windowId: string
  payload: {
    mode: 'create' | 'edit'
    defaultValues?: Partial<InsertImportShipment>
  }
  onSubmitSuccess: () => void
}

export function ImportShipmentWindow({ windowId, payload, onSubmitSuccess }: ImportShipmentWindowProps) {
  const { closeWindow, minimizeWindow } = useWindowManager()
  const { toast } = useToast()

  const createMutation = useMutation({
    mutationFn: async (data: InsertImportShipment) => {
      const response = await apiRequest('POST', '/api/import-shipments', data)
      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/import-shipments'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/custom-clearances'] })
      toast({ title: 'Success', description: 'Import shipment created successfully' })
      onSubmitSuccess()
      closeWindow(windowId)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create import shipment',
        variant: 'destructive'
      })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: InsertImportShipment) => {
      const id = (payload.defaultValues as any)?.id
      if (!id) throw new Error('No ID provided for update')
      const response = await apiRequest('PATCH', `/api/import-shipments/${id}`, data)
      return response.json()
    },
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/import-shipments'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/custom-clearances'] })
      toast({ title: 'Success', description: 'Import shipment updated successfully' })
      
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
        description: error.message || 'Failed to update import shipment',
        variant: 'destructive'
      })
    }
  })

  const handleSubmit = (data: InsertImportShipment) => {
    if (payload.mode === 'create') {
      createMutation.mutate(data)
    } else {
      updateMutation.mutate(data)
    }
  }

  const handleCancel = () => {
    try {
      closeWindow(windowId)
    } catch (error) {
      console.error('Error in handleCancel:', error)
    }
  }

  const title = payload.mode === 'create' ? 'New Import Shipment' : 'Edit Import Shipment'

  return (
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
      <ImportShipmentForm
        key={(payload.defaultValues as any)?.id || 'new'}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        defaultValues={payload.defaultValues}
      />
    </DraggableWindow>
  )
}
