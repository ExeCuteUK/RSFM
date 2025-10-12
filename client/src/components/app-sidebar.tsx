import { 
  BarChart3, 
  Package, 
  Users, 
  Truck, 
  FileText, 
  Settings, 
  FileCheck,
  BookOpen,
  Database,
  MessageSquare,
  Mail,
  Calendar
} from "lucide-react"
import { Link, useLocation } from "wouter"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { useWindowManager } from "@/contexts/WindowManagerContext"

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
} from "@/components/ui/sidebar"

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: BarChart3,
  },
  {
    title: "Job Journals",
    url: "/job-journals",
    icon: BookOpen,
  },
  {
    title: "Import Shipments",
    url: "/import-shipments",
    icon: Package,
  },
  {
    title: "Export Shipments",
    url: "/export-shipments",
    icon: Truck,
  },
  {
    title: "Custom Clearances",
    url: "/custom-clearances",
    icon: FileCheck,
  },
  {
    title: "Contacts", 
    url: "/contacts",
    icon: Users,
  },
  {
    title: "Invoices",
    url: "/invoices",
    icon: FileText,
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

const betaTestingItems = [
  {
    title: "Emails",
    url: "/emails",
    icon: Mail,
  },
]

export function AppSidebar() {
  const [location] = useLocation()
  const { openWindow } = useWindowManager()
  
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 30000,
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
              Version : 4.1.2 alpha
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>Beta Testing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {betaTestingItems.map((item) => (
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
      </SidebarContent>
    </Sidebar>
  )
}