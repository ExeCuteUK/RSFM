import { ChevronLeft } from "lucide-react"
import { useState } from "react"

// Extensible status configuration - can add more statuses in the future
export const STATUS_CONFIG = {
  1: { 
    color: 'yellow', 
    bgClass: 'bg-yellow-400 dark:bg-yellow-500',
    borderClass: 'border-yellow-500 dark:border-yellow-600',
    hoverClass: 'hover:bg-yellow-500 dark:hover:bg-yellow-400',
    label: 'To Do' 
  },
  3: { 
    color: 'green', 
    bgClass: 'bg-green-400 dark:bg-green-500',
    borderClass: 'border-green-500 dark:border-green-600',
    hoverClass: 'hover:bg-green-500 dark:hover:bg-green-400',
    label: 'Completed' 
  },
  // Future extensibility examples:
  // 5: { color: 'blue', bgClass: 'bg-blue-400', borderClass: 'border-blue-500', hoverClass: 'hover:bg-blue-500', label: 'In Review' },
  // 6: { color: 'purple', bgClass: 'bg-purple-400', borderClass: 'border-purple-500', hoverClass: 'hover:bg-purple-500', label: 'Archived' },
} as const

type StatusValue = keyof typeof STATUS_CONFIG

interface StatusToggleButtonProps {
  currentStatus: number | null
  onToggle: () => void
  testId?: string
  disabled?: boolean
}

export function StatusToggleButton({ 
  currentStatus, 
  onToggle, 
  testId,
  disabled = false 
}: StatusToggleButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  // Determine current status (default to 1 if null)
  const status: StatusValue = (currentStatus === 3 ? 3 : 1) as StatusValue
  const config = STATUS_CONFIG[status]

  const handleClick = () => {
    if (disabled) return
    
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
    onToggle()
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2
        transition-all duration-200 ease-in-out
        ${config.bgClass} ${config.borderClass} ${config.hoverClass}
        hover:scale-105 hover:brightness-110
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isAnimating ? 'animate-pulse' : ''}
      `}
      title={`Click to toggle status (currently ${config.label})`}
      data-testid={testId}
    >
      {/* Arrow pointing left toward status text */}
      <ChevronLeft className="h-3 w-3 text-white dark:text-black" />
      
      {/* Status indicator dot */}
      <div className="h-2 w-2 rounded-full bg-white dark:bg-black" />
    </button>
  )
}
