import { 
  Grid3x3, 
  FolderInput, 
  FolderOutput, 
  Users, 
  FileText, 
  Settings, 
  FolderCog,
  BookOpen,
  Database,
  MessageSquare,
  Mail,
  Calendar,
  Bot
} from "lucide-react"
import { Link, useLocation } from "wouter"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { useWindowManager } from "@/contexts/WindowManagerContext"
import { queryClient } from "@/lib/queryClient"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"

const operationsOverviewItems = [
  {
    title: "Truck Journals",
    url: "/job-journals",
    icon: BookOpen,
  },
  {
    title: "Management Sheets",
    url: "/",
    icon: Grid3x3,
  },
  {
    title: "Eric",
    url: "/eric",
    icon: Bot,
  },
]

const jobManagementItems = [
  {
    title: "Import Jobs",
    url: "/import-shipments",
    icon: FolderInput,
  },
  {
    title: "Export Jobs",
    url: "/export-shipments",
    icon: FolderOutput,
  },
  {
    title: "Clearance Jobs",
    url: "/custom-clearances",
    icon: FolderCog,
  },
]

const archiveItems = [
  {
    title: "Invoice Archive",
    url: "/invoices",
    icon: FileText,
  },
  {
    title: "Contact Database", 
    url: "/contacts",
    icon: Users,
  },
]

const secondaryItems = [
  {
    title: "R.S Calendar",
    url: "/team-calendar",
    icon: Calendar,
  },
  {
    title: "Internal Messages",
    url: "/messages",
    icon: MessageSquare,
  },
  {
    title: "Backups",
    url: "/backups",
    icon: Database,
  },
  {
    title: "Settings",
    url: "/settings", 
    icon: Settings,
  },
]

export function AppSidebar() {
  const [location] = useLocation()
  const { openWindow } = useWindowManager()
  
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 10000,
  })
  
  const unreadCount = unreadData?.count || 0

  const handleSendEmail = () => {
    openWindow({
      id: `email-${Date.now()}`,
      type: 'email',
      title: 'New Email',
      payload: {
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        attachments: [],
        metadata: {}
      }
    })
  }

  const handleContactsClick = () => {
    // Invalidate all contact-related queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["/api/import-customers"] })
    queryClient.invalidateQueries({ queryKey: ["/api/export-customers"] })
    queryClient.invalidateQueries({ queryKey: ["/api/export-receivers"] })
    queryClient.invalidateQueries({ queryKey: ["/api/hauliers"] })
    queryClient.invalidateQueries({ queryKey: ["/api/shipping-lines"] })
    queryClient.invalidateQueries({ queryKey: ["/api/clearance-agents"] })
  }

  return (
    <Sidebar data-testid="sidebar-app">
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <img 
            src="/favicon-32x32.png" 
            alt="RS Freight Manager" 
            className="w-8 h-8"
          />
          <div className="flex-1">
            <h2 className="text-sm font-semibold leading-tight" data-testid="text-app-title">
              R.S. Freight Manager
            </h2>
            <p className="text-[11px] text-muted-foreground" data-testid="text-app-version">
              Version 4.2.9 Beta
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsOverviewItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    data-active={location === item.url}
                    className={location === item.url ? "bg-sidebar-accent" : ""}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Job Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {jobManagementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    data-active={location === item.url}
                    className={location === item.url ? "bg-sidebar-accent" : ""}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Archive</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {archiveItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    data-active={location === item.url}
                    className={location === item.url ? "bg-sidebar-accent" : ""}
                  >
                    <Link href={item.url} onClick={item.title === "Contact Database" ? handleContactsClick : undefined}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    data-active={location === item.url}
                    className={location === item.url ? "bg-sidebar-accent" : ""}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                      {item.title === "Internal Messages" && unreadCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto h-5 min-w-5 flex items-center justify-center px-1.5 text-[10px] font-semibold"
                          data-testid="badge-unread-count"
                        >
                          {unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-6">
        <div className="text-[11px] text-muted-foreground space-y-0.5">
          <p className="font-semibold">Engine Revisions</p>
          <p className="leading-tight">- ERIC 1.2</p>
          <p className="leading-tight">- FOCR 1.2</p>
          <p className="leading-tight">- T49T 1.2</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}