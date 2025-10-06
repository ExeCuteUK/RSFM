import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'

export type WindowType = 'email' | 'import-shipment' | 'export-shipment' | 'custom-clearance' | 'import-customer' | 'export-customer' | 'export-receiver' | 'haulier' | 'shipping-line' | 'clearance-agent'

export interface WindowData {
  id: string
  type: WindowType
  title: string
  payload: any
  isMinimized: boolean
  width?: number
  height?: number
  x?: number
  y?: number
}

interface MinimizedWindow {
  id: string
  type: WindowType
  title: string
}

interface WindowManagerContextType {
  windows: WindowData[]
  activeWindow: WindowData | null
  minimizedWindows: MinimizedWindow[]
  openWindow: (data: Omit<WindowData, 'isMinimized'>) => void
  closeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  restoreWindow: (id: string) => void
  updateWindowPayload: (id: string, payload: any) => void
  setActiveWindow: (id: string | null) => void
}

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined)

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [windows, setWindows] = useState<WindowData[]>(() => {
    if (!user) return []
    const stored = localStorage.getItem(`windows_${user.id}`)
    return stored ? JSON.parse(stored) : []
  })

  const [activeWindow, setActiveWindowState] = useState<WindowData | null>(() => {
    const activeWin = windows.find(w => !w.isMinimized)
    return activeWin || null
  })

  const [minimizedWindows, setMinimizedWindows] = useState<MinimizedWindow[]>(() => {
    if (!user) return []
    const stored = localStorage.getItem(`windowsMinimized_${user.id}`)
    return stored ? JSON.parse(stored) : []
  })

  // Save windows to localStorage whenever they change
  useEffect(() => {
    if (user && windows.length > 0) {
      localStorage.setItem(`windows_${user.id}`, JSON.stringify(windows))
    } else if (user && windows.length === 0) {
      localStorage.removeItem(`windows_${user.id}`)
    }
  }, [windows, user])

  // Save minimized windows to localStorage
  useEffect(() => {
    if (user && minimizedWindows.length > 0) {
      localStorage.setItem(`windowsMinimized_${user.id}`, JSON.stringify(minimizedWindows))
    } else if (user && minimizedWindows.length === 0) {
      localStorage.removeItem(`windowsMinimized_${user.id}`)
    }
  }, [minimizedWindows, user])

  // Load from localStorage when user changes
  useEffect(() => {
    if (!user) {
      setWindows([])
      setMinimizedWindows([])
      setActiveWindowState(null)
      return
    }

    const storedWindows = localStorage.getItem(`windows_${user.id}`)
    if (storedWindows) {
      const parsed = JSON.parse(storedWindows)
      console.log('[WindowManager] Loading windows from localStorage:', parsed);
      setWindows(parsed)
      const active = parsed.find((w: WindowData) => !w.isMinimized)
      setActiveWindowState(active || null)
    }

    const storedMinimized = localStorage.getItem(`windowsMinimized_${user.id}`)
    if (storedMinimized) {
      setMinimizedWindows(JSON.parse(storedMinimized))
    }
  }, [user?.id])

  const openWindow = (data: Omit<WindowData, 'isMinimized'>) => {
    try {
      // Check if window with same id already exists
      const existingWindow = windows.find(w => w.id === data.id)
      
      if (existingWindow) {
        // If it exists and is minimized, restore it
        if (existingWindow.isMinimized) {
          restoreWindow(data.id)
        } else {
          // Update its payload if it's already open
          updateWindowPayload(data.id, data.payload)
        }
        return
      }

      // Add new window and minimize currently active window in one state update
      const newWindow: WindowData = {
        ...data,
        isMinimized: false
      }

      if (activeWindow && !activeWindow.isMinimized) {
        // Minimize current active window and add new window together
        setWindows(prev => [
          ...prev.map(w => w.id === activeWindow.id ? { ...w, isMinimized: true } : w),
          newWindow
        ])
        
        setMinimizedWindows(prev => {
          // Check if already in minimized windows to prevent duplicates
          if (prev.some(w => w.id === activeWindow.id)) {
            return prev
          }
          return [
            ...prev,
            { id: activeWindow.id, type: activeWindow.type, title: activeWindow.title || 'Untitled' }
          ]
        })
      } else {
        // Just add new window
        setWindows(prev => [...prev, newWindow])
      }

      setActiveWindowState(newWindow)
    } catch (error) {
      console.error('Error in openWindow:', error)
      // Don't rethrow - let the caller handle it gracefully
    }
  }

  const closeWindow = (id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id))
    setMinimizedWindows(prev => prev.filter(w => w.id !== id))
    
    if (activeWindow?.id === id) {
      const remaining = windows.filter(w => w.id !== id && !w.isMinimized)
      setActiveWindowState(remaining[0] || null)
    }
  }

  const minimizeWindow = (id: string) => {
    const window = windows.find(w => w.id === id)
    if (!window) return

    setWindows(prev =>
      prev.map(w => w.id === id ? { ...w, isMinimized: true } : w)
    )

    setMinimizedWindows(prev => {
      // Check if already in minimized windows to prevent duplicates
      if (prev.some(w => w.id === id)) {
        return prev
      }
      return [
        ...prev,
        { id: window.id, type: window.type, title: window.title }
      ]
    })

    if (activeWindow?.id === id) {
      const remaining = windows.filter(w => w.id !== id && !w.isMinimized)
      setActiveWindowState(remaining[0] || null)
    }
  }

  const restoreWindow = (id: string) => {
    const window = windows.find(w => w.id === id)
    if (!window || !window.isMinimized) return

    // Create the restored window state
    const restoredWindow = { ...window, isMinimized: false }

    // If there's an active window, minimize it along with restoring the new window in a single update
    if (activeWindow && !activeWindow.isMinimized && activeWindow.id !== id) {
      setWindows(prev =>
        prev.map(w => {
          if (w.id === id) return restoredWindow
          if (w.id === activeWindow.id) return { ...w, isMinimized: true }
          return w
        })
      )

      setMinimizedWindows(prev => {
        const filtered = prev.filter(w => w.id !== id)
        // Check if activeWindow is already in minimized windows to prevent duplicates
        if (filtered.some(w => w.id === activeWindow.id)) {
          return filtered
        }
        return [
          ...filtered,
          { id: activeWindow.id, type: activeWindow.type, title: activeWindow.title }
        ]
      })
    } else {
      // No active window to minimize, just restore
      setWindows(prev =>
        prev.map(w => w.id === id ? restoredWindow : w)
      )

      setMinimizedWindows(prev => prev.filter(w => w.id !== id))
    }

    setActiveWindowState(restoredWindow)
  }

  const updateWindowPayload = (id: string, payload: any) => {
    setWindows(prev =>
      prev.map(w => w.id === id ? { ...w, payload: { ...w.payload, ...payload } } : w)
    )

    if (activeWindow?.id === id) {
      setActiveWindowState(prev => prev ? { ...prev, payload: { ...prev.payload, ...payload } } : null)
    }
  }

  const setActiveWindow = (id: string | null) => {
    if (id === null) {
      setActiveWindowState(null)
      return
    }

    const window = windows.find(w => w.id === id)
    if (window && !window.isMinimized) {
      setActiveWindowState(window)
    }
  }

  return (
    <WindowManagerContext.Provider
      value={{
        windows,
        activeWindow,
        minimizedWindows,
        openWindow,
        closeWindow,
        minimizeWindow,
        restoreWindow,
        updateWindowPayload,
        setActiveWindow,
      }}
    >
      {children}
    </WindowManagerContext.Provider>
  )
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext)
  if (!context) {
    throw new Error('useWindowManager must be used within WindowManagerProvider')
  }
  return context
}
