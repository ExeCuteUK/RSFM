import { KPICard } from "@/components/dashboard-kpi"
import { ShipmentCard, type Shipment } from "@/components/shipment-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, Truck, Users, DollarSign, TrendingUp, Plus } from "lucide-react"

// todo: remove mock data
const mockRecentShipments: Shipment[] = [
  {
    id: "SH001",
    customerName: "ABC Manufacturing",
    origin: "New York, NY", 
    destination: "Los Angeles, CA",
    status: "in-transit",
    pickupDate: "2024-01-15",
    deliveryDate: "2024-01-18",
    driver: "John Smith",
    weight: 1250,
    value: 15000
  },
  {
    id: "SH002",
    customerName: "Tech Solutions Inc",
    origin: "Chicago, IL",
    destination: "Miami, FL", 
    status: "pending",
    pickupDate: "2024-01-16",
    deliveryDate: "2024-01-19",
    weight: 850,
    value: 8500
  },
  {
    id: "SH003",
    customerName: "Global Logistics Ltd",
    origin: "Seattle, WA",
    destination: "Houston, TX",
    status: "delivered",
    pickupDate: "2024-01-12",
    deliveryDate: "2024-01-15", 
    driver: "Maria Rodriguez",
    weight: 2100,
    value: 22500
  }
]

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your freight operations.
          </p>
        </div>
        <Button data-testid="button-new-shipment" onClick={() => console.log('Create new shipment')}>
          <Plus className="h-4 w-4 mr-2" />
          New Shipment
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Active Shipments"
          value={147}
          change="+12% from last month"
          changeType="increase"
          icon={Package}
        />
        <KPICard
          title="Pending Deliveries"
          value={34}
          change="+5% from last month"
          changeType="increase"
          icon={Truck}
        />
        <KPICard
          title="Monthly Revenue"
          value="£45,230"
          change="+15% from last month"
          changeType="increase"
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Shipments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
              <CardTitle className="text-xl font-semibold">Recent Shipments</CardTitle>
              <Button variant="outline" size="sm" data-testid="button-view-all-shipments">
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockRecentShipments.map((shipment) => (
                <ShipmentCard
                  key={shipment.id}
                  shipment={shipment}
                  onEdit={(id) => console.log('Edit shipment:', id)}
                  onTrack={(id) => console.log('Track shipment:', id)}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold" data-testid="text-on-time-delivery">98.5%</div>
                  <div className="text-sm text-muted-foreground">On-time delivery</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Package className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold" data-testid="text-shipments-today">12</div>
                  <div className="text-sm text-muted-foreground">Shipments today</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Pending Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Overdue invoices</span>
                <span className="font-medium text-red-600" data-testid="text-overdue-invoices">3</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Pending assignments</span>
                <span className="font-medium text-yellow-600" data-testid="text-pending-assignments">7</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Customer inquiries</span>
                <span className="font-medium text-blue-600" data-testid="text-customer-inquiries">5</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}