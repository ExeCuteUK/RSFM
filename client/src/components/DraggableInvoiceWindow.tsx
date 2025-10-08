import { useState, useRef, useEffect } from 'react'
import { useWindowManager } from '@/contexts/WindowManagerContext'
import { Button } from '@/components/ui/button'
import { X, Minus, GripHorizontal } from 'lucide-react'
import { CustomerInvoiceForm } from './CustomerInvoiceForm'
import type { ImportShipment, ExportShipment, CustomClearance, Invoice } from '@shared/schema'

export function DraggableInvoiceWindow() {
  const { windows, activeWindow, minimizeWindow, closeWindow } = useWindowManager()
  
  // Find the active invoice window
  const invoiceWindow = windows.find(w => w.type === 'customer-invoice' && !w.isMinimized)
  
  const [position, setPosition] = useState(() => {
    const width = 960
    const height = window.innerHeight * 0.8
    return {
      x: Math.max(0, (window.innerWidth - width) / 2),
      y: Math.max(0, (window.innerHeight - height) / 2),
    }
  })
  
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const windowRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      const maxX = window.innerWidth - 960
      const maxY = window.innerHeight - (window.innerHeight * 0.8)

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect()
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
    }
  }

  const handleMinimize = () => {
    if (invoiceWindow) {
      minimizeWindow(invoiceWindow.id)
    }
  }

  const handleClose = () => {
    if (invoiceWindow) {
      closeWindow(invoiceWindow.id)
    }
  }

  if (!invoiceWindow) return null

  const { job, jobType, existingInvoice } = invoiceWindow.payload as {
    job: ImportShipment | ExportShipment | CustomClearance | null
    jobType: 'import' | 'export' | 'clearance'
    existingInvoice?: Invoice | null
  }

  return (
    <div
      ref={windowRef}
      className="fixed bg-background border border-border rounded-lg shadow-2xl z-50 flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '960px',
        height: '80vh',
      }}
      data-testid="draggable-invoice-window"
    >
      {/* Draggable Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b bg-muted/50 cursor-move rounded-t-lg"
        onMouseDown={handleMouseDown}
        data-testid="invoice-window-header"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">
            {existingInvoice ? 'Edit Invoice' : 'Create Invoice'}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleMinimize}
            data-testid="button-minimize-invoice"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleClose}
            data-testid="button-close-invoice"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Invoice Form Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <CustomerInvoiceForm
          job={job}
          jobType={jobType}
          open={true}
          onOpenChange={(open) => {
            if (!open) handleClose()
          }}
          existingInvoice={existingInvoice}
          asWindow={true}
        />
      </div>
    </div>
  )
}
