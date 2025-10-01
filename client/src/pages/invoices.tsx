import { useState } from "react"
import { InvoiceCard, type Invoice } from "@/components/invoice-card"
import { SearchFilter } from "@/components/search-filter"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

// todo: remove mock data  
const mockInvoices: Invoice[] = [
  {
    id: "I001",
    invoiceNumber: "INV-2024-001",
    customerName: "ABC Manufacturing",
    shipmentId: "SH001",
    amount: 2450,
    status: "sent",
    issueDate: "2024-01-15",
    dueDate: "2024-02-14"
  },
  {
    id: "I002",
    invoiceNumber: "INV-2024-002", 
    customerName: "Tech Solutions Inc",
    shipmentId: "SH003",
    amount: 1890,
    status: "paid",
    issueDate: "2024-01-10",
    dueDate: "2024-02-09",
    paidDate: "2024-01-28"
  },
  {
    id: "I003",
    invoiceNumber: "INV-2024-003",
    customerName: "Global Logistics Ltd",
    shipmentId: "SH005", 
    amount: 3200,
    status: "overdue",
    issueDate: "2023-12-20",
    dueDate: "2024-01-19"
  },
  {
    id: "I004",
    invoiceNumber: "INV-2024-004",
    customerName: "Retail Chain Corp",
    shipmentId: "SH007",
    amount: 1650,
    status: "draft",
    issueDate: "2024-01-18", 
    dueDate: "2024-02-17"
  },
  {
    id: "I005",
    invoiceNumber: "INV-2024-005",
    customerName: "Manufacturing Plus",
    shipmentId: "SH009",
    amount: 2850,
    status: "sent",
    issueDate: "2024-01-16",
    dueDate: "2024-02-15"
  }
]

const invoiceFilters = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "draft", label: "Draft" },
      { value: "sent", label: "Sent" },
      { value: "paid", label: "Paid" },
      { value: "overdue", label: "Overdue" }
    ]
  },
  {
    key: "amount",
    label: "Amount Range",
    options: [
      { value: "low", label: "Under £2,000" },
      { value: "medium", label: "£2,000 - £5,000" },
      { value: "high", label: "Over £5,000" }
    ]
  }
]

export default function Invoices() {
  const [filteredInvoices, setFilteredInvoices] = useState(mockInvoices)

  const handleSearch = (query: string) => {
    const filtered = mockInvoices.filter(invoice => 
      invoice.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(query.toLowerCase()) ||
      invoice.shipmentId.toLowerCase().includes(query.toLowerCase())
    )
    setFilteredInvoices(filtered)
    console.log('Search invoices:', query, 'Results:', filtered.length)
  }

  const handleFilterChange = (filters: Record<string, string>) => {
    let filtered = mockInvoices

    if (filters.status) {
      filtered = filtered.filter(invoice => invoice.status === filters.status)
    }

    if (filters.amount) {
      switch (filters.amount) {
        case 'low':
          filtered = filtered.filter(invoice => invoice.amount < 2000)
          break
        case 'medium':
          filtered = filtered.filter(invoice => invoice.amount >= 2000 && invoice.amount <= 5000)
          break
        case 'high':
          filtered = filtered.filter(invoice => invoice.amount > 5000)
          break
      }
    }

    setFilteredInvoices(filtered)
    console.log('Filter invoices:', filters, 'Results:', filtered.length)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Invoices</h1>
          <p className="text-muted-foreground">
            Manage billing and track payment status
          </p>
        </div>
        <Button data-testid="button-new-invoice" onClick={() => console.log('Create new invoice')}>
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <SearchFilter
        searchPlaceholder="Search invoices by number, customer, or shipment..."
        filters={invoiceFilters}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredInvoices.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            onView={(id) => console.log('View invoice:', id)}
            onDownload={(id) => console.log('Download invoice:', id)}
            onSend={(id) => console.log('Send invoice:', id)}
          />
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12" data-testid="empty-state">
          <p className="text-lg text-muted-foreground">No invoices found matching your criteria</p>
          <Button variant="outline" className="mt-4" onClick={() => setFilteredInvoices(mockInvoices)}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}