import { useWindowManager } from '@/contexts/WindowManagerContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, Mail, Package, Ship, FileCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function WindowTaskbar() {
  const { minimizedWindows, restoreWindow, closeWindow } = useWindowManager()

  if (minimizedWindows.length === 0) return null

  const getIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'import-shipment':
        return <Package className="h-4 w-4" />
      case 'export-shipment':
        return <Ship className="h-4 w-4" />
      case 'custom-clearance':
        return <FileCheck className="h-4 w-4" />
      default:
        return null
    }
  }

  const getSubtitle = (window: any) => {
    switch (window.type) {
      case 'email':
        return `To: ${window.payload?.to || 'No recipient'}`
      case 'import-shipment':
      case 'export-shipment':
      case 'custom-clearance':
        return window.payload?.shipment?.jobRef || window.payload?.clearance?.jobRef || 'New'
      default:
        return ''
    }
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-12 bg-background border-t border-border z-40 flex items-center gap-2 px-4"
      data-testid="window-taskbar"
    >
      {minimizedWindows.map((window) => (
        <div
          key={window.id}
          className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md hover-elevate cursor-pointer max-w-xs"
          onClick={() => restoreWindow(window.id)}
          data-testid={`minimized-window-${window.id}`}
        >
          {getIcon(window.type)}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {window.title}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {getSubtitle(window)}
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(window.id);
            }}
            data-testid={`button-close-minimized-${window.id}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  )
}
