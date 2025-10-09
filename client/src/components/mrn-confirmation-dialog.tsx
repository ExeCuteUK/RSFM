import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FileCheck } from "lucide-react"

interface MRNConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mrnNumber: string
  onConfirm: () => void
  onCancel: () => void
}

export function MRNConfirmationDialog({
  open,
  onOpenChange,
  mrnNumber,
  onConfirm,
  onCancel,
}: MRNConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="dialog-mrn-confirmation">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertDialogTitle>MRN Number Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            An MRN number was found in the uploaded document:
            <div className="mt-3 p-3 bg-muted rounded-md font-mono text-sm">
              {mrnNumber}
            </div>
            <div className="mt-3">
              Would you like to add this MRN number to the clearance?
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} data-testid="button-mrn-cancel">
            No, Skip
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} data-testid="button-mrn-confirm">
            Yes, Add MRN
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
