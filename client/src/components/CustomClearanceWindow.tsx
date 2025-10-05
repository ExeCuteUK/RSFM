import { useWindowManager } from '@/contexts/WindowManagerContext'
import { DraggableWindow } from './DraggableWindow'
import { CustomClearanceForm } from './custom-clearance-form'
import type { InsertCustomClearance } from '@shared/schema'

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

  const handleSubmit = (data: InsertCustomClearance) => {
    onSubmitSuccess()
    closeWindow(windowId)
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
