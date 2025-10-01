import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarDays, MapPin, Package, User } from "lucide-react"

export type ShipmentStatus = "pending" | "in-transit" | "delivered" | "cancelled"

export interface Shipment {
  id: string
  customerName: string
  origin: string
  destination: string
  status: ShipmentStatus
  pickupDate: string
  deliveryDate: string
  weight: number
  value: number
}

interface ShipmentCardProps {
  shipment: Shipment
  onEdit?: (id: string) => void
  onTrack?: (id: string) => void
}

export function ShipmentCard({ shipment, onEdit, onTrack }: ShipmentCardProps) {
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    "in-transit": "bg-blue-100 text-blue-800", 
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800"
  }

  return (
    <Card className="hover-elevate" data-testid={`card-shipment-${shipment.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold">#{shipment.id}</CardTitle>
          <Badge className={statusColors[shipment.status]} data-testid={`badge-status-${shipment.id}`}>
            {shipment.status.replace('-', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span data-testid={`text-customer-${shipment.id}`}>{shipment.customerName}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="truncate" data-testid={`text-route-${shipment.id}`}>
            {shipment.origin} → {shipment.destination}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span data-testid={`text-dates-${shipment.id}`}>
            {shipment.pickupDate} - {shipment.deliveryDate}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span data-testid={`text-details-${shipment.id}`}>
            {shipment.weight}kg | £{shipment.value.toLocaleString()}
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onEdit?.(shipment.id)}
            data-testid={`button-edit-${shipment.id}`}
          >
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onTrack?.(shipment.id)}
            data-testid={`button-track-${shipment.id}`}
          >
            Track
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}