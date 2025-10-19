import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { Database, Download, Upload, AlertCircle, CheckCircle2, Trash2, Clock, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Backup {
  id: string;
  name: string;
  size: string;
  createdTime: string;
}

export default function BackupsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { setPageTitle, setActionButtons } = usePageHeader();
  const [showRestoreWarning, setShowRestoreWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  const isAdmin = user?.isAdmin || false;

  // Fetch all backups
  const { data: backups, isLoading, refetch } = useQuery<Backup[]>({
    queryKey: ["/api/backups"],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache results
  });

  const diagnoseMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("GET", "/api/backups/diagnose", {});
    },
    onSuccess: (data: any) => {
      const sharedCount = data.sharedFolders?.length || 0;
      const rootCount = data.rootFolders?.length || 0;
      
      toast({
        title: "Google Drive Diagnostic Results",
        description: `Service Account: ${data.serviceAccount}\n${data.recommendation}\nShared folders: ${sharedCount}, Root folders: ${rootCount}`,
        variant: sharedCount > 0 ? "default" : "destructive",
      });
      console.log("Google Drive Diagnostic:", data);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to run diagnostic. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/backups/create", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      toast({
        title: "Backup created successfully",
        description: "A new backup has been created and saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create backup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async ({ fileId, tables }: { fileId: string; tables: string[] }) => {
      return apiRequest("POST", `/api/backups/restore/${fileId}`, { tables });
    },
    onMutate: () => {
      toast({
        title: "Restoring backup...",
        description: "This may take a moment. Please wait.",
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      // Invalidate all data queries
      queryClient.invalidateQueries({ queryKey: ["/api/import-customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/export-customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/export-receivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hauliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-lines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clearance-agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/import-shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/export-shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/custom-clearances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      
      toast({
        title: "Backup restored successfully",
        description: `${data.totalRecords} records restored successfully.`,
      });
      setShowRestoreWarning(false);
      setSelectedBackup(null);
      setSelectedTables([]);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error || "Failed to restore backup. Please try again.";
      toast({
        title: "Restore Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setShowRestoreWarning(false);
      setSelectedBackup(null);
      setSelectedTables([]);
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest("DELETE", `/api/backups/${fileId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      toast({
        title: "Backup deleted",
        description: "The backup has been deleted successfully.",
      });
      setShowDeleteWarning(false);
      setSelectedBackup(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete backup. Please try again.",
        variant: "destructive",
      });
      setShowDeleteWarning(false);
      setSelectedBackup(null);
    },
  });

  // Set page header (after mutations are declared)
  useEffect(() => {
    setPageTitle("System Backups");
    setActionButtons(
      <div className="flex gap-2">
        {isAdmin && (
          <Button
            onClick={() => diagnoseMutation.mutate()}
            disabled={diagnoseMutation.isPending}
            variant="outline"
            data-testid="button-diagnose-drive"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            {diagnoseMutation.isPending ? "Checking..." : "Check Drive Access"}
          </Button>
        )}
        <Button
          onClick={() => createBackupMutation.mutate()}
          disabled={createBackupMutation.isPending}
          data-testid="button-create-backup"
        >
          <Database className="h-4 w-4 mr-2" />
          {createBackupMutation.isPending ? "Creating..." : "Create New Backup"}
        </Button>
      </div>
    );

    return () => {
      setPageTitle("");
      setActionButtons(null);
    };
  }, [setPageTitle, setActionButtons, isAdmin, diagnoseMutation.isPending, createBackupMutation.isPending]);

  const handleRestore = (fileId: string) => {
    setSelectedBackup(fileId);
    // Set all available tables for restore
    const allTables = [
      "import_customers",
      "export_customers", 
      "export_receivers",
      "hauliers",
      "shipping_lines",
      "clearance_agents",
      "import_shipments",
      "export_shipments",
      "custom_clearances",
      "job_file_groups",
      "messages",
      "purchase_invoices",
      "invoices",
      "general_references",
      "settings",
      "users"
    ];
    setSelectedTables(allTables);
    setShowRestoreWarning(true);
  };

  const toggleTable = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName)
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const toggleAllTables = () => {
    const allTables = [
      "import_customers",
      "export_customers", 
      "export_receivers",
      "hauliers",
      "shipping_lines",
      "clearance_agents",
      "import_shipments",
      "export_shipments",
      "custom_clearances",
      "job_file_groups",
      "messages",
      "purchase_invoices",
      "invoices",
      "general_references",
      "settings",
      "users"
    ];
    setSelectedTables(prev => 
      prev.length === allTables.length ? [] : allTables
    );
  };

  const handleDelete = (fileId: string) => {
    setSelectedBackup(fileId);
    setShowDeleteWarning(true);
  };

  const confirmRestore = () => {
    if (selectedBackup && selectedTables.length > 0) {
      restoreBackupMutation.mutate({ fileId: selectedBackup, tables: selectedTables });
    } else if (selectedTables.length === 0) {
      toast({
        title: "No tables selected",
        description: "Please select at least one table to restore.",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = () => {
    if (selectedBackup) {
      deleteBackupMutation.mutate(selectedBackup);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd/MM/yy HH:mm");
  };

  return (
    <div className="p-6 space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>What gets backed up</AlertTitle>
        <AlertDescription>
          All database tables including contacts, shipments, clearances, settings, and users.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Available Backups</CardTitle>
          <CardDescription>
            {backups?.length === 0 
              ? "No backups found. Create your first backup to get started."
              : `${backups?.length || 0} backup(s) available`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading backups...</p>
            </div>
          ) : backups && backups.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Backup Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <code className="text-sm">{backup.name}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(backup.createdTime)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{(parseInt(backup.size) / 1024 / 1024).toFixed(2)} MB</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Google Drive</span>
                        <span className="text-muted-foreground/50">→</span>
                        <span>RS Freight Manager/Backups</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(backup.id)}
                            disabled={restoreBackupMutation.isPending}
                            data-testid={`button-restore-${backup.id}`}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(backup.id)}
                            disabled={deleteBackupMutation.isPending}
                            data-testid={`button-delete-${backup.id}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">View only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No backups available yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Create New Backup" above to create your first backup.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRestoreWarning} onOpenChange={setShowRestoreWarning}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {restoreBackupMutation.isPending ? "Restoring backup..." : "Restore from backup?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {restoreBackupMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait while the backup is being restored. This may take up to a minute.
                </span>
              ) : (
                <>
                  Select which tables to restore from <code className="px-1 py-0.5 bg-muted rounded">{backups?.find(b => b.id === selectedBackup)?.name || selectedBackup}</code>.
                  This will permanently delete current data in the selected tables.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {!restoreBackupMutation.isPending && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Select Tables to Restore</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllTables}
                  data-testid="button-toggle-all-tables"
                >
                  {selectedTables.length === 16 ? "Deselect All" : "Select All"}
                </Button>
              </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
              {[
                { name: "import_customers", label: "Import Customers" },
                { name: "export_customers", label: "Export Customers" },
                { name: "export_receivers", label: "Export Receivers" },
                { name: "hauliers", label: "Hauliers" },
                { name: "shipping_lines", label: "Shipping Lines" },
                { name: "clearance_agents", label: "Clearance Agents" },
                { name: "import_shipments", label: "Import Shipments" },
                { name: "export_shipments", label: "Export Shipments" },
                { name: "custom_clearances", label: "Custom Clearances" },
                { name: "job_file_groups", label: "Job File Groups" },
                { name: "messages", label: "Messages" },
                { name: "purchase_invoices", label: "Purchase Invoices" },
                { name: "invoices", label: "Invoices" },
                { name: "general_references", label: "General References" },
                { name: "settings", label: "Settings" },
                { name: "users", label: "Users" }
              ].map((table) => (
                <div
                  key={table.name}
                  className="flex items-center space-x-3 p-2 hover-elevate rounded-md"
                >
                  <Checkbox
                    id={`table-${table.name}`}
                    checked={selectedTables.includes(table.name)}
                    onCheckedChange={() => toggleTable(table.name)}
                    data-testid={`checkbox-table-${table.name}`}
                  />
                  <label
                    htmlFor={`table-${table.name}`}
                    className="flex-1 text-sm font-medium cursor-pointer"
                  >
                    {table.label}
                  </label>
                </div>
              ))}
            </div>
            
            {selectedTables.length === 0 && (
              <Alert variant="destructive" className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select at least one table to restore.
                </AlertDescription>
              </Alert>
            )}
          </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restore">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRestore}
              disabled={selectedTables.length === 0 || restoreBackupMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-restore"
            >
              {restoreBackupMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  Restore {selectedTables.length} {selectedTables.length === 1 ? 'Table' : 'Tables'}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the backup <code className="px-1 py-0.5 bg-muted rounded">{backups?.find(b => b.id === selectedBackup)?.name || selectedBackup}</code> from Google Drive.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Yes, Delete Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
