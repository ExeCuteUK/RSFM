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
  MessageSquare
} from "lucide-react"
import { Link, useLocation } from "wouter"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"

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
    title: "Messages",
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
  
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 30000,
  })

  return (
    <Sidebar data-testid="sidebar-app">
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-bold text-sm">
            RS
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold leading-tight" data-testid="text-app-title">
              R.S International Freight Manager 4.0.1 alpha
            </h2>
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
                      {item.title === "Messages" && unreadCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto h-5 min-w-5 px-1 text-[10px] font-semibold"
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
    </Sidebar>
  )
}