import { InvoiceCard } from "../invoice-card"

const mockInvoices = [
  {
    id: "I001",
    invoiceNumber: "INV-2024-001",
    customerName: "ABC Manufacturing",
    shipmentId: "SH001",
    amount: 2450,
    status: "sent" as const,
    issueDate: "2024-01-15",
    dueDate: "2024-02-14"
  },
  {
    id: "I002", 
    invoiceNumber: "INV-2024-002",
    customerName: "Tech Solutions Inc",
    shipmentId: "SH003",
    amount: 1890,
    status: "paid" as const,
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
    status: "overdue" as const,
    issueDate: "2023-12-20",
    dueDate: "2024-01-19"
  }
]

export default function InvoiceCardExample() {
  return (
    <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {mockInvoices.map((invoice) => (
        <InvoiceCard
          key={invoice.id}
          invoice={invoice}
          onView={(id) => console.log('View invoice:', id)}
          onDownload={(id) => console.log('Download invoice:', id)}
          onSend={(id) => console.log('Send invoice:', id)}
        />
      ))}
    </div>
  )
}