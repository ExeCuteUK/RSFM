import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

// Pages
import Dashboard from "@/pages/dashboard";
import Shipments from "@/pages/shipments";
import ImportShipments from "@/pages/import-shipments";
import ExportShipments from "@/pages/export-shipments";
import CustomClearances from "@/pages/custom-clearances";
import Customers from "@/pages/customers";
import Invoices from "@/pages/invoices";
import RateCalculator from "@/pages/rates";
import JobJournals from "@/pages/job-journals";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/shipments" component={Shipments} />
      <Route path="/import-shipments" component={ImportShipments} />
      <Route path="/export-shipments" component={ExportShipments} />
      <Route path="/custom-clearances" component={CustomClearances} />
      <Route path="/contacts" component={Customers} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/rates" component={RateCalculator} />
      <Route path="/job-journals" component={JobJournals} />
      <Route path="/tracking" component={() => <div className="p-6">Tracking page coming soon...</div>} />
      <Route path="/notifications" component={() => <div className="p-6">Notifications page coming soon...</div>} />
      <Route path="/settings" component={() => <div className="p-6">Settings page coming soon...</div>} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "18rem",       // 288px for freight management
    "--sidebar-width-icon": "3rem",   // default icon width
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1">
                <header className="flex items-center justify-between p-4 border-b border-border">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;