import { useWindowManager } from '@/contexts/WindowManagerContext'
import { DraggableWindow } from './DraggableWindow'
import { ExportShipmentForm } from './export-shipment-form'
import type { InsertExportShipment } from '@shared/schema'

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

  const handleSubmit = (data: InsertExportShipment) => {
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
      <div className="p-6">
        <ExportShipmentForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          defaultValues={payload.defaultValues}
        />
      </div>
    </DraggableWindow>
  )
}
