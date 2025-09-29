import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Mail, Phone, MapPin, Package } from "lucide-react"

export interface Customer {
  id: string
  name: string
  company?: string
  email: string
  phone: string
  address: string
  totalShipments: number
  activeShipments: number
  totalValue: number
  status: "active" | "inactive"
}

interface CustomerCardProps {
  customer: Customer
  onEdit?: (id: string) => void
  onViewHistory?: (id: string) => void
}

export function CustomerCard({ customer, onEdit, onViewHistory }: CustomerCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-customer-${customer.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold" data-testid={`text-customer-name-${customer.id}`}>
              {customer.name}
            </CardTitle>
            {customer.company && (
              <p className="text-sm text-muted-foreground" data-testid={`text-company-${customer.id}`}>
                {customer.company}
              </p>
            )}
          </div>
          <Badge variant={customer.status === "active" ? "default" : "secondary"} data-testid={`badge-status-${customer.id}`}>
            {customer.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span data-testid={`text-email-${customer.id}`}>{customer.email}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span data-testid={`text-phone-${customer.id}`}>{customer.phone}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="truncate" data-testid={`text-address-${customer.id}`}>{customer.address}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium" data-testid={`text-total-shipments-${customer.id}`}>
                {customer.totalShipments}
              </div>
              <div className="text-muted-foreground">Total</div>
            </div>
          </div>
          <div>
            <div className="font-medium" data-testid={`text-active-shipments-${customer.id}`}>
              {customer.activeShipments}
            </div>
            <div className="text-muted-foreground">Active</div>
          </div>
        </div>
        
        <div className="text-sm">
          <div className="font-medium text-lg" data-testid={`text-total-value-${customer.id}`}>
            ${customer.totalValue.toLocaleString()}
          </div>
          <div className="text-muted-foreground">Total Value</div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onEdit?.(customer.id)}
            data-testid={`button-edit-${customer.id}`}
          >
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onViewHistory?.(customer.id)}
            data-testid={`button-history-${customer.id}`}
          >
            History
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}