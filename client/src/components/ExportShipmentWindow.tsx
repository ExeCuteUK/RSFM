import { useWindowManager } from '@/contexts/WindowManagerContext'
import { DraggableWindow } from './DraggableWindow'
import { ExportShipmentForm } from './export-shipment-form'
import type { InsertExportShipment } from '@shared/schema'
import { useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'

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

  const handleSubmit = (data: InsertExportShipment) => {
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

  const title = payload.mode === 'create' ? 'New Export Shipment' : 'Edit Export Shipment'

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
      <ExportShipmentForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        defaultValues={payload.defaultValues}
      />
    </DraggableWindow>
  )
}
