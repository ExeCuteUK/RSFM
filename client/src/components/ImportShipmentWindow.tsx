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
    onSubmitSuccess()
    closeWindow(windowId)
  }

  const handleCancel = () => {
    closeWindow(windowId)
  }

  const title = payload.mode === 'create' ? 'New Import Shipment' : 'Edit Import Shipment'

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
        <ImportShipmentForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          defaultValues={payload.defaultValues}
        />
      </div>
    </DraggableWindow>
  )
}
