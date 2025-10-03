import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Database, Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
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

export default function BackupsPage() {
  const { toast } = useToast();
  const [showRestoreWarning, setShowRestoreWarning] = useState(false);
  const [backupResult, setBackupResult] = useState<any>(null);

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/backups/create", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to create backup");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setBackupResult(data);
      toast({
        title: "Backup created successfully",
        description: `${data.totalRecords} records backed up across ${data.tables.length} tables.`,
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
    mutationFn: async () => {
      const response = await fetch("/api/backups/restore", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to restore backup");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Backup restored successfully",
        description: `${data.totalRecords} records restored across ${data.tables.length} tables.`,
      });
      setShowRestoreWarning(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore backup. Please try again.",
        variant: "destructive",
      });
      setShowRestoreWarning(false);
    },
  });

  const handleRestore = () => {
    setShowRestoreWarning(true);
  };

  const confirmRestore = () => {
    restoreBackupMutation.mutate();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Database Backups</h1>
        <p className="text-muted-foreground">
          Manage backups for your contact databases
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Create Backup
            </CardTitle>
            <CardDescription>
              Create a backup of all contact databases
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <Button
              onClick={() => createBackupMutation.mutate()}
              disabled={createBackupMutation.isPending}
              className="w-full"
              data-testid="button-create-backup"
            >
              <Database className="h-4 w-4 mr-2" />
              {createBackupMutation.isPending ? "Creating Backup..." : "Create Backup"}
            </Button>

            {backupResult && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Last Backup</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">
                      Total Records: {backupResult.totalRecords}
                    </p>
                    <div className="text-sm space-y-1">
                      {backupResult.tables.map((table: any) => (
                        <div key={table.name} className="flex justify-between">
                          <span>{table.name}:</span>
                          <span className="font-medium">{table.count} records</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Created: {new Date(backupResult.timestamp).toLocaleString()}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Restore Backup
            </CardTitle>
            <CardDescription>
              Restore contact databases from backup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Restoring from backup will DELETE all current data in the contact tables
                and replace it with the backed-up data. This action cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This will restore data from the backup files located in the{" "}
                <code className="px-1 py-0.5 bg-muted rounded">backups/</code> directory.
              </p>
            </div>

            <Button
              onClick={handleRestore}
              disabled={restoreBackupMutation.isPending}
              variant="destructive"
              className="w-full"
              data-testid="button-restore-backup"
            >
              <Upload className="h-4 w-4 mr-2" />
              {restoreBackupMutation.isPending ? "Restoring..." : "Restore from Backup"}
            </Button>
          </CardContent>
        </Card>
      </div>

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
              as SQL files that can be used for production rollout.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">What Happens During Backup</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>All contact database records are exported to SQL INSERT statements</li>
              <li>Each table gets its own backup file</li>
              <li>Files are timestamped for version tracking</li>
              <li>No data is modified in your database</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">What Happens During Restore</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>All existing data in contact tables is deleted</li>
              <li>Data from backup files is imported</li>
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
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all current data in your contact databases and replace
              it with the backup data. This action cannot be undone.
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
    </div>
  );
}
