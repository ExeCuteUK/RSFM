import { useState } from "react"
import { ShipmentCard, type Shipment } from "@/components/shipment-card"
import { SearchFilter } from "@/components/search-filter"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

// todo: remove mock data
const mockShipments: Shipment[] = [
  {
    id: "SH001",
    customerName: "ABC Manufacturing",
    origin: "New York, NY",
    destination: "Los Angeles, CA", 
    status: "in-transit",
    pickupDate: "2024-01-15",
    deliveryDate: "2024-01-18",
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
    weight: 2100,
    value: 22500
  },
  {
    id: "SH004",
    customerName: "Retail Chain Corp",
    origin: "Denver, CO",
    destination: "Phoenix, AZ",
    status: "cancelled",
    pickupDate: "2024-01-14",
    deliveryDate: "2024-01-17",
    weight: 950,
    value: 9800
  }
]

const shipmentFilters = [
  {
    key: "status",
    label: "Status", 
    options: [
      { value: "pending", label: "Pending" },
      { value: "in-transit", label: "In Transit" },
      { value: "delivered", label: "Delivered" },
      { value: "cancelled", label: "Cancelled" }
    ]
  }
]

export default function Shipments() {
  const [filteredShipments, setFilteredShipments] = useState(mockShipments)

  const handleSearch = (query: string) => {
    const filtered = mockShipments.filter(shipment => 
      shipment.id.toLowerCase().includes(query.toLowerCase()) ||
      shipment.customerName.toLowerCase().includes(query.toLowerCase()) ||
      shipment.origin.toLowerCase().includes(query.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(query.toLowerCase())
    )
    setFilteredShipments(filtered)
    console.log('Search shipments:', query, 'Results:', filtered.length)
  }

  const handleFilterChange = (filters: Record<string, string>) => {
    let filtered = mockShipments

    if (filters.status) {
      filtered = filtered.filter(shipment => shipment.status === filters.status)
    }

    setFilteredShipments(filtered)
    console.log('Filter shipments:', filters, 'Results:', filtered.length)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Shipments</h1>
          <p className="text-muted-foreground">
            Manage and track all your freight shipments
          </p>
        </div>
        <Button data-testid="button-new-shipment" onClick={() => console.log('Create new shipment')}>
          <Plus className="h-4 w-4 mr-2" />
          New Shipment
        </Button>
      </div>

      <SearchFilter
        searchPlaceholder="Search shipments by ID, customer, or destination..."
        filters={shipmentFilters}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredShipments.map((shipment) => (
          <ShipmentCard
            key={shipment.id}
            shipment={shipment}
            onEdit={(id) => console.log('Edit shipment:', id)}
            onTrack={(id) => console.log('Track shipment:', id)}
          />
        ))}
      </div>

      {filteredShipments.length === 0 && (
        <div className="text-center py-12" data-testid="empty-state">
          <p className="text-lg text-muted-foreground">No shipments found matching your criteria</p>
          <Button variant="outline" className="mt-4" onClick={() => setFilteredShipments(mockShipments)}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}