import { createContext, useContext, useState, ReactNode } from "react"

interface PageHeaderContextValue {
  pageTitle: string
  setPageTitle: (title: string) => void
  actionButtons: ReactNode
  setActionButtons: (buttons: ReactNode) => void
}

const PageHeaderContext = createContext<PageHeaderContextValue | undefined>(undefined)

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [pageTitle, setPageTitle] = useState("")
  const [actionButtons, setActionButtons] = useState<ReactNode>(null)

  return (
    <PageHeaderContext.Provider
      value={{
        pageTitle,
        setPageTitle,
        actionButtons,
        setActionButtons,
      }}
    >
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext)
  if (context === undefined) {
    throw new Error("usePageHeader must be used within a PageHeaderProvider")
  }
  return context
}
