import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Link } from "wouter"
import type { Invoice } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Search, Pencil, Trash2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { CustomerInvoiceForm } from "@/components/CustomerInvoiceForm"
import { usePageHeader } from "@/contexts/PageHeaderContext"
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
  const [showInvoices, setShowInvoices] = useState(true)
  const [showCredits, setShowCredits] = useState(true)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const { toast } = useToast()
  const { setPageTitle, setActionButtons } = usePageHeader()
  
  const itemsPerPage = 200

  useEffect(() => {
    setPageTitle("Invoice Archive")
    setActionButtons(
      <Button onClick={() => setShowNewInvoice(true)} data-testid="button-new-invoice">
        <Plus className="h-4 w-4 mr-2" />
        New Invoice
      </Button>
    )

    return () => {
      setPageTitle("")
      setActionButtons(null)
    }
  }, [setPageTitle, setActionButtons])

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
    const matchesSearch = (
      invoice.invoiceNumber.toString().includes(searchLower) ||
      invoice.customerCompanyName?.toLowerCase().includes(searchLower) ||
      invoice.jobRef.toString().includes(searchLower)
    )
    const matchesType = (
      (showInvoices && invoice.type === 'invoice') ||
      (showCredits && invoice.type === 'credit_note')
    )
    
    // Date filtering
    const invoiceDate = new Date(invoice.invoiceDate)
    const matchesFromDate = !fromDate || invoiceDate >= new Date(fromDate)
    const matchesToDate = !toDate || invoiceDate <= new Date(toDate)
    
    return matchesSearch && matchesType && matchesFromDate && matchesToDate
  })

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    return b.invoiceNumber - a.invoiceNumber
  })
  
  // Pagination
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedInvoices = sortedInvoices.slice(startIndex, endIndex)
  
  // Reset to page 1 when filters change
  const resetPage = () => setCurrentPage(1)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number, customer, or job reference..."
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); resetPage(); }}
            className="pl-9"
            data-testid="input-search-invoices"
          />
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Input
            type="date"
            placeholder="From Date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); resetPage(); }}
            className="w-40"
            data-testid="input-from-date"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            placeholder="To Date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); resetPage(); }}
            className="w-40"
            data-testid="input-to-date"
          />
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex items-center gap-1">
          <Button
            variant={showInvoices ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (!showCredits) return
              setShowInvoices(!showInvoices)
              resetPage()
            }}
            data-testid="button-filter-invoices"
          >
            Invoices
          </Button>
          <Button
            variant={showCredits ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (!showInvoices) return
              setShowCredits(!showCredits)
              resetPage()
            }}
            data-testid="button-filter-credits"
          >
            Credits
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">Loading invoices...</p>
        </div>
      ) : sortedInvoices.length === 0 ? (
        <div className="text-center py-12" data-testid="empty-state">
          <p className="text-lg text-muted-foreground">
            {searchText || fromDate || toDate ? "No invoices found matching your filters" : "No invoices created yet"}
          </p>
          {(searchText || fromDate || toDate) && (
            <Button variant="outline" className="mt-4" onClick={() => { setSearchText(""); setFromDate(""); setToDate(""); resetPage(); }}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Invoice #</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="w-[150px]">Job Reference</TableHead>
                  <TableHead className="w-[150px] text-right">Amount</TableHead>
                  <TableHead className="w-[150px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((invoice) => (
                <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    <span className={invoice.type === 'credit_note' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                      {invoice.type === 'credit_note' ? 'Credit Note' : 'Invoice'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}
                  </TableCell>
                  <TableCell>
                    {invoice.customerCompanyName || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {invoice.jobRef}
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
                          <Download className="h-4 w-4" />
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
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, sortedInvoices.length)} of {sortedInvoices.length} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {invoiceToDelete?.invoiceNumber}? This action cannot be undone.
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
