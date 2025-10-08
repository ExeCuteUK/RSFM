import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Link } from "wouter"
import type { Invoice } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileOutput, Search, Pencil, Trash2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { CustomerInvoiceForm } from "@/components/CustomerInvoiceForm"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function Invoices() {
  const [searchText, setSearchText] = useState("")
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null)
  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const { toast } = useToast()

  const { data: allInvoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  })

  const deleteMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      await apiRequest('DELETE', `/api/invoices/${invoiceId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] })
      toast({ title: 'Success', description: 'Invoice deleted successfully' })
      setInvoiceToDelete(null)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete invoice',
        variant: 'destructive'
      })
    }
  })

  const filteredInvoices = allInvoices.filter(invoice => {
    const searchLower = searchText.toLowerCase()
    return (
      invoice.invoiceNumber.toString().includes(searchLower) ||
      invoice.customerCompanyName?.toLowerCase().includes(searchLower) ||
      invoice.jobRef.toString().includes(searchLower)
    )
  })

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    return b.invoiceNumber - a.invoiceNumber
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Invoices</h1>
          <p className="text-muted-foreground">
            View and download customer invoices
          </p>
        </div>
        <Button onClick={() => setShowNewInvoice(true)} data-testid="button-new-invoice">
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number, customer, or job reference..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
            data-testid="input-search-invoices"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">Loading invoices...</p>
        </div>
      ) : sortedInvoices.length === 0 ? (
        <div className="text-center py-12" data-testid="empty-state">
          <p className="text-lg text-muted-foreground">
            {searchText ? "No invoices found matching your search" : "No invoices created yet"}
          </p>
          {searchText && (
            <Button variant="outline" className="mt-4" onClick={() => setSearchText("")}>
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Invoice Number</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="w-[120px]">Job Reference</TableHead>
                <TableHead className="w-[150px] text-right">Amount</TableHead>
                <TableHead className="w-[150px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.map((invoice) => (
                <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                  <TableCell className="font-medium">
                    #{invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}
                  </TableCell>
                  <TableCell>
                    {invoice.customerCompanyName || 'N/A'}
                  </TableCell>
                  <TableCell>
                    #{invoice.jobRef}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    £{invoice.total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setInvoiceToEdit(invoice)}
                        data-testid={`button-edit-invoice-${invoice.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <a
                        href={`/api/invoices/${invoice.id}/pdf`}
                        download={`RS Invoice - ${invoice.jobRef}.pdf`}
                        data-testid={`button-download-invoice-${invoice.id}`}
                      >
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <FileOutput className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={() => setInvoiceToDelete(invoice)}
                        data-testid={`button-delete-invoice-${invoice.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice #{invoiceToDelete?.invoiceNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => invoiceToDelete && deleteMutation.mutate(invoiceToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerInvoiceForm
        job={null}
        jobType={invoiceToEdit?.jobType === 'import' ? 'import' : invoiceToEdit?.jobType === 'export' ? 'export' : 'clearance'}
        open={!!invoiceToEdit || showNewInvoice}
        onOpenChange={(open) => {
          if (!open) {
            setInvoiceToEdit(null)
            setShowNewInvoice(false)
          }
        }}
        existingInvoice={invoiceToEdit}
      />
    </div>
  )
}
