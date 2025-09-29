import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, Mail, Truck, Calendar, MapPin } from "lucide-react"

export interface Driver {
  id: string
  name: string
  email: string
  phone: string
  licenseNumber: string
  vehicleType: string
  vehicleNumber: string
  status: "available" | "in-transit" | "off-duty"
  currentLocation?: string
  totalDeliveries: number
  rating: number
}

interface DriverCardProps {
  driver: Driver
  onAssign?: (id: string) => void
  onContact?: (id: string) => void
}

export function DriverCard({ driver, onAssign, onContact }: DriverCardProps) {
  const statusColors = {
    available: "bg-green-100 text-green-800",
    "in-transit": "bg-blue-100 text-blue-800",
    "off-duty": "bg-gray-100 text-gray-800"
  }

  return (
    <Card className="hover-elevate" data-testid={`card-driver-${driver.id}`}>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${driver.name}`} />
            <AvatarFallback data-testid={`avatar-${driver.id}`}>
              {driver.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold" data-testid={`text-driver-name-${driver.id}`}>
              {driver.name}
            </CardTitle>
            <Badge className={statusColors[driver.status]} data-testid={`badge-status-${driver.id}`}>
              {driver.status.replace('-', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span data-testid={`text-phone-${driver.id}`}>{driver.phone}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span data-testid={`text-email-${driver.id}`}>{driver.email}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <span data-testid={`text-vehicle-${driver.id}`}>
            {driver.vehicleType} - {driver.vehicleNumber}
          </span>
        </div>
        
        {driver.currentLocation && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span data-testid={`text-location-${driver.id}`}>{driver.currentLocation}</span>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium" data-testid={`text-deliveries-${driver.id}`}>
              {driver.totalDeliveries}
            </div>
            <div className="text-muted-foreground">Deliveries</div>
          </div>
          <div>
            <div className="font-medium" data-testid={`text-rating-${driver.id}`}>
              {driver.rating.toFixed(1)}/5.0
            </div>
            <div className="text-muted-foreground">Rating</div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onAssign?.(driver.id)}
            disabled={driver.status !== "available"}
            data-testid={`button-assign-${driver.id}`}
          >
            Assign
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onContact?.(driver.id)}
            data-testid={`button-contact-${driver.id}`}
          >
            Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}