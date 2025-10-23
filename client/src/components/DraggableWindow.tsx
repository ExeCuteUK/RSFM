import { useState, useRef, useEffect, ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DraggableWindowProps {
  id: string
  title: string
  children: ReactNode
  onClose: () => void
  onMinimize?: () => void
  width?: number
  height?: number
  initialX?: number
  initialY?: number
  className?: string
}

export function DraggableWindow({
  id,
  title,
  children,
  onClose,
  onMinimize,
  width = 800,
  height = 600,
  initialX,
  initialY,
  className
}: DraggableWindowProps) {
  const [position, setPosition] = useState(() => {
    const centerX = initialX ?? (window.innerWidth - width) / 2
    const centerY = initialY ?? Math.max(50, (window.innerHeight - height) / 2 - 100)
    return { x: centerX, y: centerY }
  })
  
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const windowRef = useRef<HTMLDivElement>(null)
  
  const handleMinimize = () => {
    onMinimize?.()
  }

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    if ((e.target as HTMLElement).closest('input')) return
    if ((e.target as HTMLElement).closest('textarea')) return
    if ((e.target as HTMLElement).closest('select')) return
    if ((e.target as HTMLElement).tagName === 'A') return
    
    const rect = windowRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setIsDragging(true)
    }
  }

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y

      // Clamp to viewport
      const maxX = window.innerWidth - width
      const maxY = window.innerHeight - height
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, width, height])

  // Render window
  return (
    <div
      ref={windowRef}
      className={cn(
        "fixed z-50 shadow-2xl",
        isDragging && "cursor-move",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
      data-testid={`draggable-window-${id}`}
    >
      <Card className="h-full flex flex-col">
        {/* Window Header */}
        <div
          className="flex items-center justify-between p-3 border-b cursor-move bg-muted/30"
          onMouseDown={handleMouseDown}
          data-testid="window-header"
        >
          <h3 className="font-semibold text-sm truncate flex-1 pr-2">{title}</h3>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleMinimize}
              data-testid={`button-minimize-${id}`}
              title="Minimize"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onClose}
              data-testid={`button-close-${id}`}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Window Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </Card>
    </div>
  )
}
