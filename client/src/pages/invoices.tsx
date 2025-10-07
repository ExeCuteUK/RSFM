import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { Invoice } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileOutput, Search } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function Invoices() {
  const [searchText, setSearchText] = useState("")

  const { data: allInvoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  })

  const filteredInvoices = allInvoices.filter(invoice => {
    const searchLower = searchText.toLowerCase()
    return (
      invoice.invoiceNumber.toString().includes(searchLower) ||
      invoice.customerName?.toLowerCase().includes(searchLower) ||
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
                <TableHead className="w-[100px] text-center">Download</TableHead>
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
                    {invoice.customerName || 'N/A'}
                  </TableCell>
                  <TableCell>
                    #{invoice.jobRef}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    £{invoice.total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <a
                      href={`/api/invoices/${invoice.id}/pdf`}
                      download={`RS Invoice - ${invoice.jobRef}.pdf`}
                      data-testid={`button-download-invoice-${invoice.id}`}
                    >
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <FileOutput className="h-4 w-4" />
                      </Button>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
