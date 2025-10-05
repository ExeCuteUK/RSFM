import { useWindowManager } from '@/contexts/WindowManagerContext'
import { DraggableWindow } from './DraggableWindow'
import { ImportShipmentForm } from './import-shipment-form'
import type { InsertImportShipment } from '@shared/schema'

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

  const handleSubmit = (data: InsertImportShipment) => {
    try {
      onSubmitSuccess()
      closeWindow(windowId)
    } catch (error) {
      console.error('Error in handleSubmit:', error)
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
      <div className="p-6">
        <ImportShipmentForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          defaultValues={payload.defaultValues}
        />
      </div>
    </DraggableWindow>
  )
}
