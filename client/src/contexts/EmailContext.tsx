import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useWindowManager } from '@/contexts/WindowManagerContext'

interface EmailComposerData {
  id: string
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  attachments: string[]
  isMinimized: boolean
}

interface EmailDraft {
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  attachments: string[]
}

interface EmailContextType {
  emailComposerData: EmailComposerData | null
  emailDrafts: Record<string, EmailDraft>
  recentEmails: string[]
  minimizedEmails: EmailComposerData[]
  openEmailComposer: (data: Omit<EmailComposerData, 'isMinimized'>) => void
  closeEmailComposer: () => void
  updateEmailDraft: (id: string, draft: EmailDraft) => void
  removeEmailDraft: (id: string) => void
  addToRecentEmails: (email: string) => void
  restoreEmail: (id: string) => void
  removeMinimizedEmail: (id: string) => void
}

const EmailContext = createContext<EmailContextType | undefined>(undefined)

export function EmailProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { openWindow, windows, activeWindow, updateWindowPayload, restoreWindow, closeWindow } = useWindowManager()

  const [emailDrafts, setEmailDrafts] = useState<Record<string, EmailDraft>>(() => {
    if (!user) return {}
    const stored = localStorage.getItem(`emailDrafts_${user.id}`)
    return stored ? JSON.parse(stored) : {}
  })
  
  const [recentEmails, setRecentEmails] = useState<string[]>(() => {
    const stored = localStorage.getItem('recentEmails')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        return []
      }
    }
    return []
  })

  // Compute current email composer from windows
  const emailComposerData = activeWindow?.type === 'email' ? {
    id: activeWindow.id,
    ...activeWindow.payload,
    isMinimized: activeWindow.isMinimized
  } as EmailComposerData : null

  // Save email drafts to localStorage whenever they change
  useEffect(() => {
    if (user && Object.keys(emailDrafts).length > 0) {
      localStorage.setItem(`emailDrafts_${user.id}`, JSON.stringify(emailDrafts))
    } else if (user && Object.keys(emailDrafts).length === 0) {
      localStorage.removeItem(`emailDrafts_${user.id}`)
    }
  }, [emailDrafts, user])

  // Load drafts from localStorage when user changes
  useEffect(() => {
    if (!user) {
      setEmailDrafts({})
      return
    }
    
    const storedDrafts = localStorage.getItem(`emailDrafts_${user.id}`)
    if (storedDrafts) {
      setEmailDrafts(JSON.parse(storedDrafts))
    }
  }, [user?.id])

  const openEmailComposer = (data: Omit<EmailComposerData, 'isMinimized'>) => {
    try {
      // Save current email draft if there's one open
      if (emailComposerData && !emailComposerData.isMinimized) {
        const { isMinimized: _, ...draftData } = emailComposerData
        setEmailDrafts(prev => ({
          ...prev,
          [emailComposerData.id]: draftData
        }))
      }
      
      // Open email window using WindowManager
      const { id, to, cc, bcc, subject, body, attachments } = data
      openWindow({
        id,
        type: 'email',
        title: subject || 'New Email',
        payload: { to, cc, bcc, subject, body, attachments }
      })
    } catch (error) {
      console.error('Error in openEmailComposer:', error)
      throw error
    }
  }

  const closeEmailComposer = () => {
    if (emailComposerData) {
      // Remove draft when closing
      setEmailDrafts(prev => {
        const newDrafts = { ...prev }
        delete newDrafts[emailComposerData.id]
        return newDrafts
      })
    }
  }

  const updateEmailDraft = (id: string, draft: EmailDraft) => {
    setEmailDrafts(prev => ({
      ...prev,
      [id]: draft
    }))
    // Also update the window payload so restored windows have latest data
    updateWindowPayload(id, draft)
  }

  const removeEmailDraft = (id: string) => {
    setEmailDrafts(prev => {
      const newDrafts = { ...prev }
      delete newDrafts[id]
      return newDrafts
    })
  }

  const addToRecentEmails = (email: string) => {
    const updated = [email, ...recentEmails.filter(e => e !== email)].slice(0, 10)
    setRecentEmails(updated)
    localStorage.setItem('recentEmails', JSON.stringify(updated))
  }

  // Compute minimized emails from windows
  const minimizedEmails = windows
    .filter(w => w.type === 'email' && w.isMinimized)
    .map(w => ({
      id: w.id,
      ...w.payload,
      isMinimized: true
    })) as EmailComposerData[]

  const restoreEmail = (id: string) => {
    try {
      console.log('restoreEmail called with id:', id)
      console.log('Current activeWindow:', activeWindow)
      console.log('All windows:', windows)
      restoreWindow(id)
      console.log('restoreWindow completed')
    } catch (error) {
      console.error('Error in restoreEmail:', error)
      throw error
    }
  }

  const removeMinimizedEmail = (id: string) => {
    // Remove draft
    setEmailDrafts(prev => {
      const newDrafts = { ...prev }
      delete newDrafts[id]
      return newDrafts
    })
    // Close window
    closeWindow(id)
  }

  return (
    <EmailContext.Provider
      value={{
        emailComposerData,
        emailDrafts,
        recentEmails,
        minimizedEmails,
        openEmailComposer,
        closeEmailComposer,
        updateEmailDraft,
        removeEmailDraft,
        addToRecentEmails,
        restoreEmail,
        removeMinimizedEmail
      }}
    >
      {children}
    </EmailContext.Provider>
  )
}

export function useEmail() {
  const context = useContext(EmailContext)
  if (context === undefined) {
    throw new Error('useEmail must be used within an EmailProvider')
  }
  return context
}
