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
        return <Mail className="h-3.5 w-3.5" />
      case 'import-shipment':
        return <Package className="h-3.5 w-3.5" />
      case 'export-shipment':
        return <Ship className="h-3.5 w-3.5" />
      case 'custom-clearance':
        return <FileCheck className="h-3.5 w-3.5" />
      default:
        return null
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <Card className="p-2 shadow-lg">
        <div className="flex items-center gap-2" data-testid="window-taskbar">
          {minimizedWindows.map((window) => (
            <div
              key={window.id}
              className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-md bg-muted hover-elevate"
              data-testid={`minimized-window-${window.id}`}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-2"
                onClick={() => restoreWindow(window.id)}
                data-testid={`button-restore-${window.id}`}
              >
                {getIcon(window.type)}
                <span className="text-xs max-w-[200px] truncate">
                  {window.title}
                </span>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => closeWindow(window.id)}
                data-testid={`button-close-minimized-${window.id}`}
                title="Close"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
