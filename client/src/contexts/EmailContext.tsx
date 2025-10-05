import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'

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

interface MinimizedEmail {
  id: string
  to: string
  subject: string
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
  minimizedEmails: MinimizedEmail[]
  emailDrafts: Record<string, EmailDraft>
  recentEmails: string[]
  openEmailComposer: (data: Omit<EmailComposerData, 'isMinimized'>) => void
  closeEmailComposer: () => void
  minimizeEmail: (email: MinimizedEmail) => void
  restoreEmail: (id: string) => void
  removeMinimizedEmail: (id: string) => void
  updateEmailDraft: (id: string, draft: EmailDraft) => void
  removeEmailDraft: (id: string) => void
  addToRecentEmails: (email: string) => void
}

const EmailContext = createContext<EmailContextType | undefined>(undefined)

export function EmailProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [emailComposerData, setEmailComposerData] = useState<EmailComposerData | null>(null)
  
  const [minimizedEmails, setMinimizedEmails] = useState<MinimizedEmail[]>(() => {
    if (!user) return []
    const stored = localStorage.getItem(`emailMinimized_${user.id}`)
    return stored ? JSON.parse(stored) : []
  })
  
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

  // Save email drafts to localStorage whenever they change
  useEffect(() => {
    if (user && Object.keys(emailDrafts).length > 0) {
      localStorage.setItem(`emailDrafts_${user.id}`, JSON.stringify(emailDrafts))
    } else if (user && Object.keys(emailDrafts).length === 0) {
      localStorage.removeItem(`emailDrafts_${user.id}`)
    }
  }, [emailDrafts, user])

  // Save minimized emails to localStorage whenever they change
  useEffect(() => {
    if (user && minimizedEmails.length > 0) {
      localStorage.setItem(`emailMinimized_${user.id}`, JSON.stringify(minimizedEmails))
    } else if (user && minimizedEmails.length === 0) {
      localStorage.removeItem(`emailMinimized_${user.id}`)
    }
  }, [minimizedEmails, user])

  // Load drafts from localStorage when user changes
  useEffect(() => {
    if (!user) {
      setMinimizedEmails([])
      setEmailDrafts({})
      return
    }
    
    const storedMinimized = localStorage.getItem(`emailMinimized_${user.id}`)
    if (storedMinimized) {
      setMinimizedEmails(JSON.parse(storedMinimized))
    }
    
    const storedDrafts = localStorage.getItem(`emailDrafts_${user.id}`)
    if (storedDrafts) {
      setEmailDrafts(JSON.parse(storedDrafts))
    }
  }, [user?.id])

  const openEmailComposer = (data: Omit<EmailComposerData, 'isMinimized'>) => {
    // If there's already an open email, minimize it first
    if (emailComposerData && !emailComposerData.isMinimized) {
      const { isMinimized: _, ...draftData } = emailComposerData
      minimizeEmail({
        id: emailComposerData.id,
        to: emailComposerData.to,
        subject: emailComposerData.subject
      })
      setEmailDrafts(prev => ({
        ...prev,
        [emailComposerData.id]: draftData
      }))
    }
    
    setEmailComposerData({ ...data, isMinimized: false })
  }

  const closeEmailComposer = () => {
    setEmailComposerData(null)
  }

  const minimizeEmail = (email: MinimizedEmail) => {
    setMinimizedEmails(prev => {
      const exists = prev.find(e => e.id === email.id)
      if (exists) return prev
      return [...prev, email]
    })
    
    if (emailComposerData?.id === email.id) {
      setEmailComposerData(null)
    }
  }

  const restoreEmail = (id: string) => {
    const draft = emailDrafts[id]
    if (!draft) return

    // If there's already an open email, minimize it first
    if (emailComposerData && !emailComposerData.isMinimized) {
      const { isMinimized: _, ...draftData } = emailComposerData
      minimizeEmail({
        id: emailComposerData.id,
        to: emailComposerData.to,
        subject: emailComposerData.subject
      })
      setEmailDrafts(prev => ({
        ...prev,
        [emailComposerData.id]: draftData
      }))
    }

    setEmailComposerData({
      id,
      ...draft,
      isMinimized: false
    })
    
    setMinimizedEmails(prev => prev.filter(e => e.id !== id))
  }

  const removeMinimizedEmail = (id: string) => {
    setMinimizedEmails(prev => prev.filter(e => e.id !== id))
    setEmailDrafts(prev => {
      const newDrafts = { ...prev }
      delete newDrafts[id]
      return newDrafts
    })
  }

  const updateEmailDraft = (id: string, draft: EmailDraft) => {
    setEmailDrafts(prev => ({
      ...prev,
      [id]: draft
    }))
  }

  const removeEmailDraft = (id: string) => {
    setEmailDrafts(prev => {
      const newDrafts = { ...prev }
      delete newDrafts[id]
      return newDrafts
    })
    setMinimizedEmails(prev => prev.filter(e => e.id !== id))
    if (emailComposerData?.id === id) {
      setEmailComposerData(null)
    }
  }

  const addToRecentEmails = (email: string) => {
    const updated = [email, ...recentEmails.filter(e => e !== email)].slice(0, 10)
    setRecentEmails(updated)
    localStorage.setItem('recentEmails', JSON.stringify(updated))
  }

  return (
    <EmailContext.Provider
      value={{
        emailComposerData,
        minimizedEmails,
        emailDrafts,
        recentEmails,
        openEmailComposer,
        closeEmailComposer,
        minimizeEmail,
        restoreEmail,
        removeMinimizedEmail,
        updateEmailDraft,
        removeEmailDraft,
        addToRecentEmails
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
