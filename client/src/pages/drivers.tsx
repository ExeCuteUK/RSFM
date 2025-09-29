import { useState } from "react"
import { DriverCard, type Driver } from "@/components/driver-card"
import { SearchFilter } from "@/components/search-filter"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

// todo: remove mock data
const mockDrivers: Driver[] = [
  {
    id: "D001",
    name: "John Smith",
    email: "j.smith@freightpro.com",
    phone: "+1 (555) 234-5678", 
    licenseNumber: "CDL123456789",
    vehicleType: "Semi-truck",
    vehicleNumber: "FP-001",
    status: "available",
    currentLocation: "Dallas, TX",
    totalDeliveries: 247,
    rating: 4.8
  },
  {
    id: "D002",
    name: "Maria Rodriguez",
    email: "m.rodriguez@freightpro.com",
    phone: "+1 (555) 345-6789",
    licenseNumber: "CDL987654321", 
    vehicleType: "Box truck",
    vehicleNumber: "FP-012",
    status: "in-transit",
    currentLocation: "Phoenix, AZ",
    totalDeliveries: 189,
    rating: 4.9
  },
  {
    id: "D003",
    name: "Robert Johnson",
    email: "r.johnson@freightpro.com",
    phone: "+1 (555) 456-7890",
    licenseNumber: "CDL456789123",
    vehicleType: "Semi-truck", 
    vehicleNumber: "FP-005",
    status: "off-duty",
    currentLocation: "Atlanta, GA",
    totalDeliveries: 312,
    rating: 4.7
  },
  {
    id: "D004",
    name: "Lisa Chen",
    email: "l.chen@freightpro.com", 
    phone: "+1 (555) 567-8901",
    licenseNumber: "CDL789123456",
    vehicleType: "Flatbed truck",
    vehicleNumber: "FP-018",
    status: "available",
    currentLocation: "Portland, OR",
    totalDeliveries: 156,
    rating: 4.6
  }
]

const driverFilters = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "available", label: "Available" },
      { value: "in-transit", label: "In Transit" },
      { value: "off-duty", label: "Off Duty" }
    ]
  },
  {
    key: "vehicleType",
    label: "Vehicle Type",
    options: [
      { value: "semi-truck", label: "Semi-truck" },
      { value: "box-truck", label: "Box truck" },
      { value: "flatbed-truck", label: "Flatbed truck" }
    ]
  }
]

export default function Drivers() {
  const [filteredDrivers, setFilteredDrivers] = useState(mockDrivers)

  const handleSearch = (query: string) => {
    const filtered = mockDrivers.filter(driver => 
      driver.name.toLowerCase().includes(query.toLowerCase()) ||
      driver.email.toLowerCase().includes(query.toLowerCase()) ||
      driver.vehicleNumber.toLowerCase().includes(query.toLowerCase()) ||
      driver.currentLocation?.toLowerCase().includes(query.toLowerCase())
    )
    setFilteredDrivers(filtered)
    console.log('Search drivers:', query, 'Results:', filtered.length)
  }

  const handleFilterChange = (filters: Record<string, string>) => {
    let filtered = mockDrivers

    if (filters.status) {
      filtered = filtered.filter(driver => driver.status === filters.status)
    }

    if (filters.vehicleType) {
      const typeMap: Record<string, string> = {
        'semi-truck': 'Semi-truck',
        'box-truck': 'Box truck',
        'flatbed-truck': 'Flatbed truck'
      }
      filtered = filtered.filter(driver => driver.vehicleType === typeMap[filters.vehicleType])
    }

    setFilteredDrivers(filtered)
    console.log('Filter drivers:', filters, 'Results:', filtered.length)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Drivers</h1>
          <p className="text-muted-foreground">
            Manage your fleet drivers and vehicle assignments
          </p>
        </div>
        <Button data-testid="button-new-driver" onClick={() => console.log('Add new driver')}>
          <Plus className="h-4 w-4 mr-2" />
          New Driver
        </Button>
      </div>

      <SearchFilter
        searchPlaceholder="Search drivers by name, email, vehicle, or location..."
        filters={driverFilters}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredDrivers.map((driver) => (
          <DriverCard
            key={driver.id}
            driver={driver}
            onAssign={(id) => console.log('Assign driver:', id)}
            onContact={(id) => console.log('Contact driver:', id)}
          />
        ))}
      </div>

      {filteredDrivers.length === 0 && (
        <div className="text-center py-12" data-testid="empty-state">
          <p className="text-lg text-muted-foreground">No drivers found matching your criteria</p>
          <Button variant="outline" className="mt-4" onClick={() => setFilteredDrivers(mockDrivers)}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}