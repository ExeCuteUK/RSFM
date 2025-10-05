import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { UserMenu } from "@/components/user-menu";
import { OtherUsersMenu } from "@/components/other-users-menu";
import { EmailProvider, useEmail } from "@/contexts/EmailContext";
import { DraggableEmailComposer } from "@/components/DraggableEmailComposer";
import { EmailTaskbar } from "@/components/EmailTaskbar";
import { WindowManagerProvider, useWindowManager } from "@/contexts/WindowManagerContext";
import { WindowTaskbar } from "@/components/WindowTaskbar";
import { ImportShipmentWindow } from "@/components/ImportShipmentWindow";
import { ExportShipmentWindow } from "@/components/ExportShipmentWindow";
import { CustomClearanceWindow } from "@/components/CustomClearanceWindow";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useRef, useEffect } from "react";

// Pages
import Dashboard from "@/pages/dashboard";
import Shipments from "@/pages/shipments";
import ImportShipments from "@/pages/import-shipments";
import ExportShipments from "@/pages/export-shipments";
import CustomClearances from "@/pages/custom-clearances";
import Customers from "@/pages/customers";
import Invoices from "@/pages/invoices";
import JobJournals from "@/pages/job-journals";
import ShippingLines from "@/pages/shipping-lines";
import SettingsPage from "@/pages/settings";
import BackupsPage from "@/pages/backups";
import Messages from "@/pages/messages";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/">
        {() => (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/shipments">
        {() => (
          <ProtectedRoute>
            <Shipments />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/import-shipments">
        {() => (
          <ProtectedRoute>
            <ImportShipments />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/export-shipments">
        {() => (
          <ProtectedRoute>
            <ExportShipments />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/custom-clearances">
        {() => (
          <ProtectedRoute>
            <CustomClearances />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/contacts">
        {() => (
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/invoices">
        {() => (
          <ProtectedRoute>
            <Invoices />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/job-journals">
        {() => (
          <ProtectedRoute>
            <JobJournals />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/shipping-lines">
        {() => (
          <ProtectedRoute>
            <ShippingLines />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/backups">
        {() => (
          <ProtectedRoute>
            <BackupsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/messages">
        {() => (
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/settings">
        {() => (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const previousUnreadCount = useRef<number>(0);
  const { emailComposerData, minimizedEmails } = useEmail();
  const { windows, activeWindow } = useWindowManager();
  
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 30000,
    enabled: !!user,
  });

  const unreadCount = unreadData?.count || 0;

  useEffect(() => {
    if (user && unreadCount > previousUnreadCount.current && previousUnreadCount.current !== 0) {
      toast({
        title: "New Message",
        description: `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`,
      });
    }
    previousUnreadCount.current = unreadCount;
  }, [unreadCount, user, toast]);

  const style = {
    "--sidebar-width": "18rem",       // 288px for freight management
    "--sidebar-width-icon": "3rem",   // default icon width
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        {user && <AppSidebar />}
        <div className="flex flex-col flex-1">
          {user && (
            <header className="flex items-center justify-between p-4 border-b border-border gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <OtherUsersMenu />
              </div>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <UserMenu />
              </div>
            </header>
          )}
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
      {user && (
        <>
          {minimizedEmails.length > 0 && <EmailTaskbar />}
          {emailComposerData && !emailComposerData.isMinimized && <DraggableEmailComposer />}
          <WindowTaskbar />
          {activeWindow && !activeWindow.isMinimized && (
            <>
              {activeWindow.type === 'import-shipment' && (
                <ImportShipmentWindow
                  windowId={activeWindow.id}
                  payload={activeWindow.payload}
                  onSubmitSuccess={() => {}}
                />
              )}
              {activeWindow.type === 'export-shipment' && (
                <ExportShipmentWindow
                  windowId={activeWindow.id}
                  payload={activeWindow.payload}
                  onSubmitSuccess={() => {}}
                />
              )}
              {activeWindow.type === 'custom-clearance' && (
                <CustomClearanceWindow
                  windowId={activeWindow.id}
                  payload={activeWindow.payload}
                  onSubmitSuccess={() => {}}
                />
              )}
            </>
          )}
        </>
      )}
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <EmailProvider>
              <WindowManagerProvider>
                <AppContent />
                <Toaster />
              </WindowManagerProvider>
            </EmailProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;