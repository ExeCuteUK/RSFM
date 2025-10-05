import { useWindowManager } from '@/contexts/WindowManagerContext'
import { DraggableWindow } from './DraggableWindow'
import { CustomClearanceForm } from './custom-clearance-form'
import type { InsertCustomClearance } from '@shared/schema'
import { useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'

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

  const handleSubmit = (data: InsertCustomClearance) => {
    if (payload.mode === 'create') {
      createMutation.mutate(data)
    } else {
      updateMutation.mutate(data)
    }
  }

  const handleCancel = () => {
    closeWindow(windowId)
  }

  const title = payload.mode === 'create' ? 'New Custom Clearance' : 'Edit Custom Clearance'

  return (
    <DraggableWindow
      id={windowId}
      title={title}
      onClose={handleCancel}
      onMinimize={() => minimizeWindow(windowId)}
      width={900}
      height={700}
    >
      <div className="p-6">
        <CustomClearanceForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          defaultValues={payload.defaultValues}
        />
      </div>
    </DraggableWindow>
  )
}
