import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Database, Download, Upload, AlertCircle, CheckCircle2, Trash2, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  backupName: string;
  timestamp: string;
  createdAt: string;
  totalRecords: number;
  tables: Array<{ name: string; count: number }>;
}

export default function BackupsPage() {
  const { toast } = useToast();
  const [showRestoreWarning, setShowRestoreWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

  // Fetch all backups
  const { data: backups, isLoading } = useQuery<Backup[]>({
    queryKey: ["/api/backups"],
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
    mutationFn: async (backupName: string) => {
      return apiRequest("POST", `/api/backups/restore/${backupName}`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/import-customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/export-customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/export-receivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hauliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipping-lines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clearance-agents"] });
      
      toast({
        title: "Backup restored successfully",
        description: `${data.totalRecords} records restored successfully.`,
      });
      setShowRestoreWarning(false);
      setSelectedBackup(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore backup. Please try again.",
        variant: "destructive",
      });
      setShowRestoreWarning(false);
      setSelectedBackup(null);
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (backupName: string) => {
      return apiRequest("DELETE", `/api/backups/${backupName}`, {});
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

  const handleRestore = (backupName: string) => {
    setSelectedBackup(backupName);
    setShowRestoreWarning(true);
  };

  const handleDelete = (backupName: string) => {
    setSelectedBackup(backupName);
    setShowDeleteWarning(true);
  };

  const confirmRestore = () => {
    if (selectedBackup) {
      restoreBackupMutation.mutate(selectedBackup);
    }
  };

  const confirmDelete = () => {
    if (selectedBackup) {
      deleteBackupMutation.mutate(selectedBackup);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Database Backups</h1>
          <p className="text-muted-foreground">
            Manage backups for your contact databases
          </p>
        </div>
        <Button
          onClick={() => createBackupMutation.mutate()}
          disabled={createBackupMutation.isPending}
          data-testid="button-create-backup"
        >
          <Database className="h-4 w-4 mr-2" />
          {createBackupMutation.isPending ? "Creating..." : "Create New Backup"}
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>What gets backed up</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Import Customers</li>
            <li>Export Customers</li>
            <li>Export Receivers</li>
            <li>Hauliers</li>
            <li>Shipping Lines</li>
            <li>Clearance Agents</li>
          </ul>
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
                  <TableHead>Total Records</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.backupName}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <code className="text-sm">{backup.backupName}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(backup.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{backup.totalRecords} records</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {backup.tables.map((table) => (
                          <Badge 
                            key={table.name} 
                            variant="outline" 
                            className="text-xs"
                          >
                            {table.name.replace(/_/g, ' ')}: {table.count}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(backup.backupName)}
                          disabled={restoreBackupMutation.isPending}
                          data-testid={`button-restore-${backup.backupName}`}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(backup.backupName)}
                          disabled={deleteBackupMutation.isPending}
                          data-testid={`button-delete-${backup.backupName}`}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Backup Information</CardTitle>
          <CardDescription>
            Understanding the backup and restore process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Backup Files Location</h3>
            <p className="text-sm text-muted-foreground">
              Backup files are stored in the <code className="px-1 py-0.5 bg-muted rounded">backups/</code> directory
              as SQL files that can be used for production rollout. Each backup is stored in its own timestamped directory.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">What Happens During Backup</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>All contact database records are exported to SQL INSERT statements</li>
              <li>Each table gets its own backup file in a timestamped directory</li>
              <li>A metadata file is created with backup information</li>
              <li>No data is modified in your database</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">What Happens During Restore</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>All existing data in contact tables is deleted</li>
              <li>Data from the selected backup is imported</li>
              <li>Record counts are verified</li>
              <li>Process runs in a transaction for safety</li>
            </ul>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Production Rollout</AlertTitle>
            <AlertDescription>
              The backup SQL files are ready to use for production deployment. You can use them
              to populate your production database with the same contact data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <AlertDialog open={showRestoreWarning} onOpenChange={setShowRestoreWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all current data in your contact databases and replace
              it with data from <code className="px-1 py-0.5 bg-muted rounded">{selectedBackup}</code>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restore">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRestore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-restore"
            >
              Yes, Restore Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the backup <code className="px-1 py-0.5 bg-muted rounded">{selectedBackup}</code>.
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
