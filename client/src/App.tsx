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
import { WindowManagerProvider, useWindowManager } from "@/contexts/WindowManagerContext";
import { PageHeaderProvider, usePageHeader } from "@/contexts/PageHeaderContext";
import { WindowTaskbar } from "@/components/WindowTaskbar";
import { ImportShipmentWindow } from "@/components/ImportShipmentWindow";
import { ExportShipmentWindow } from "@/components/ExportShipmentWindow";
import { CustomClearanceWindow } from "@/components/CustomClearanceWindow";
import { ImportCustomerWindow } from "@/components/ImportCustomerWindow";
import { ExportCustomerWindow } from "@/components/ExportCustomerWindow";
import { ExportReceiverWindow } from "@/components/ExportReceiverWindow";
import { HaulierWindow } from "@/components/HaulierWindow";
import { ShippingLineWindow } from "@/components/ShippingLineWindow";
import { ClearanceAgentWindow } from "@/components/ClearanceAgentWindow";
import { ExpenseInvoiceWindow } from "@/components/ExpenseInvoiceWindow";
import { DraggableInvoiceWindow } from "@/components/DraggableInvoiceWindow";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useRef, useEffect } from "react";

// Pages
import Dashboard from "@/pages/dashboard";
import Eric from "@/pages/eric";
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
import MyAccount from "@/pages/my-account";
import TeamCalendar from "@/pages/team-calendar";
import Emails from "@/pages/emails";
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
      <Route path="/emails">
        {() => (
          <ProtectedRoute>
            <Emails />
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
      <Route path="/my-account">
        {() => (
          <ProtectedRoute>
            <MyAccount />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/team-calendar">
        {() => (
          <ProtectedRoute>
            <TeamCalendar />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/eric">
        {() => (
          <ProtectedRoute>
            <Eric />
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
  const { windows, activeWindow } = useWindowManager();
  const { pageTitle, actionButtons } = usePageHeader();
  
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
                {pageTitle && (
                  <h1 className={`text-xl ${pageTitle === 'Truck Journals' ? 'font-bold' : 'font-semibold'}`}>{pageTitle}</h1>
                )}
              </div>
              <div className="flex items-center gap-4">
                {actionButtons}
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
          <WindowTaskbar />
          {windows.map((window) => {
            const isActive = activeWindow?.id === window.id;
            const zIndex = isActive ? 50 : 40;
            const visibility = window.isMinimized ? 'hidden' : 'visible';
            
            return (
              <div
                key={window.id}
                style={{
                  position: 'fixed',
                  zIndex,
                  visibility,
                }}
              >
                {window.type === 'email' && <DraggableEmailComposer />}
                {window.type === 'import-shipment' && (
                  <ImportShipmentWindow
                    windowId={window.id}
                    payload={window.payload}
                    onSubmitSuccess={() => {}}
                  />
                )}
                {window.type === 'export-shipment' && (
                  <ExportShipmentWindow
                    windowId={window.id}
                    payload={window.payload}
                    onSubmitSuccess={() => {}}
                  />
                )}
                {window.type === 'custom-clearance' && (
                  <CustomClearanceWindow
                    windowId={window.id}
                    payload={window.payload}
                    onSubmitSuccess={() => {}}
                  />
                )}
                {window.type === 'import-customer' && (
                  <ImportCustomerWindow
                    windowId={window.id}
                    payload={window.payload}
                    onSubmitSuccess={() => {}}
                  />
                )}
                {window.type === 'export-customer' && (
                  <ExportCustomerWindow
                    windowId={window.id}
                    payload={window.payload}
                    onSubmitSuccess={() => {}}
                  />
                )}
                {window.type === 'export-receiver' && (
                  <ExportReceiverWindow
                    windowId={window.id}
                    payload={window.payload}
                    onSubmitSuccess={() => {}}
                  />
                )}
                {window.type === 'haulier' && (
                  <HaulierWindow
                    windowId={window.id}
                    payload={window.payload}
                    onSubmitSuccess={() => {}}
                  />
                )}
                {window.type === 'shipping-line' && (
                  <ShippingLineWindow
                    windowId={window.id}
                    payload={window.payload}
                    onSubmitSuccess={() => {}}
                  />
                )}
                {window.type === 'clearance-agent' && (
                  <ClearanceAgentWindow
                    windowId={window.id}
                    payload={window.payload}
                    onSubmitSuccess={() => {}}
                  />
                )}
                {window.type === 'expense-invoice' && (
                  <ExpenseInvoiceWindow
                    windowId={window.id}
                    payload={window.payload}
                  />
                )}
                {window.type === 'customer-invoice' && <DraggableInvoiceWindow />}
              </div>
            );
          })}
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
            <WindowManagerProvider>
              <EmailProvider>
                <PageHeaderProvider>
                  <AppContent />
                  <Toaster />
                </PageHeaderProvider>
              </EmailProvider>
            </WindowManagerProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;