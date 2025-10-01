import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Mail, DollarSign, Calendar } from "lucide-react"

export interface Invoice {
  id: string
  invoiceNumber: string
  customerName: string
  shipmentId: string
  amount: number
  status: "draft" | "sent" | "paid" | "overdue"
  issueDate: string
  dueDate: string
  paidDate?: string
}

interface InvoiceCardProps {
  invoice: Invoice
  onView?: (id: string) => void
  onDownload?: (id: string) => void
  onSend?: (id: string) => void
}

export function InvoiceCard({ invoice, onView, onDownload, onSend }: InvoiceCardProps) {
  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800"
  }

  return (
    <Card className="hover-elevate" data-testid={`card-invoice-${invoice.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold" data-testid={`text-invoice-number-${invoice.id}`}>
            {invoice.invoiceNumber}
          </CardTitle>
          <Badge className={statusColors[invoice.status]} data-testid={`badge-status-${invoice.id}`}>
            {invoice.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <div className="font-medium" data-testid={`text-customer-${invoice.id}`}>
            {invoice.customerName}
          </div>
          <div className="text-muted-foreground">
            Shipment #{invoice.shipmentId}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-xl font-bold" data-testid={`text-amount-${invoice.id}`}>
            £{invoice.amount.toLocaleString()}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Issued</div>
              <div className="text-muted-foreground" data-testid={`text-issue-date-${invoice.id}`}>
                {invoice.issueDate}
              </div>
            </div>
          </div>
          <div>
            <div className="font-medium">Due</div>
            <div className={`text-sm ${
              invoice.status === 'overdue' ? 'text-red-600' : 'text-muted-foreground'
            }`} data-testid={`text-due-date-${invoice.id}`}>
              {invoice.dueDate}
            </div>
          </div>
        </div>
        
        {invoice.paidDate && (
          <div className="text-sm">
            <div className="font-medium text-green-600">Paid</div>
            <div className="text-muted-foreground" data-testid={`text-paid-date-${invoice.id}`}>
              {invoice.paidDate}
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onView?.(invoice.id)}
            data-testid={`button-view-${invoice.id}`}
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDownload?.(invoice.id)}
            data-testid={`button-download-${invoice.id}`}
          >
            <Download className="h-4 w-4" />
          </Button>
          {invoice.status === 'draft' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onSend?.(invoice.id)}
              data-testid={`button-send-${invoice.id}`}
            >
              <Mail className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}