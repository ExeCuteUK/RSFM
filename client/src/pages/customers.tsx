import { useState } from "react"
import { CustomerCard, type Customer } from "@/components/customer-card"
import { SearchFilter } from "@/components/search-filter"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

// todo: remove mock data
const mockCustomers: Customer[] = [
  {
    id: "C001",
    name: "Sarah Johnson",
    company: "ABC Manufacturing Corp",
    email: "sarah.j@abcmanufacturing.com",
    phone: "+1 (555) 123-4567",
    address: "123 Industrial Blvd, New York, NY 10001",
    totalShipments: 45,
    activeShipments: 3,
    totalValue: 125000,
    status: "active"
  },
  {
    id: "C002", 
    name: "Michael Chen",
    company: "Tech Solutions Inc",
    email: "m.chen@techsolutions.com",
    phone: "+1 (555) 987-6543",
    address: "456 Tech Park Dr, Chicago, IL 60601",
    totalShipments: 23,
    activeShipments: 1,
    totalValue: 67500,
    status: "active"
  },
  {
    id: "C003",
    name: "Emily Rodriguez",
    company: "Global Logistics Ltd",
    email: "e.rodriguez@globallogistics.com", 
    phone: "+1 (555) 456-7890",
    address: "789 Commerce St, Seattle, WA 98101",
    totalShipments: 67,
    activeShipments: 5,
    totalValue: 198000,
    status: "active"
  },
  {
    id: "C004",
    name: "David Thompson",
    company: "Retail Chain Corp",
    email: "d.thompson@retailchain.com",
    phone: "+1 (555) 321-9876", 
    address: "321 Market Ave, Denver, CO 80202",
    totalShipments: 12,
    activeShipments: 0,
    totalValue: 34500,
    status: "inactive"
  }
]

const customerFilters = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" }
    ]
  },
  {
    key: "shipments",
    label: "Shipments",
    options: [
      { value: "high", label: "High Volume (50+)" },
      { value: "medium", label: "Medium Volume (20-49)" },
      { value: "low", label: "Low Volume (<20)" }
    ]
  }
]

export default function Customers() {
  const [filteredCustomers, setFilteredCustomers] = useState(mockCustomers)

  const handleSearch = (query: string) => {
    const filtered = mockCustomers.filter(customer => 
      customer.name.toLowerCase().includes(query.toLowerCase()) ||
      customer.company?.toLowerCase().includes(query.toLowerCase()) ||
      customer.email.toLowerCase().includes(query.toLowerCase())
    )
    setFilteredCustomers(filtered)
    console.log('Search customers:', query, 'Results:', filtered.length)
  }

  const handleFilterChange = (filters: Record<string, string>) => {
    let filtered = mockCustomers

    if (filters.status) {
      filtered = filtered.filter(customer => customer.status === filters.status)
    }

    if (filters.shipments) {
      switch (filters.shipments) {
        case 'high':
          filtered = filtered.filter(customer => customer.totalShipments >= 50)
          break
        case 'medium':
          filtered = filtered.filter(customer => customer.totalShipments >= 20 && customer.totalShipments < 50)
          break
        case 'low':
          filtered = filtered.filter(customer => customer.totalShipments < 20)
          break
      }
    }

    setFilteredCustomers(filtered)
    console.log('Filter customers:', filters, 'Results:', filtered.length)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer relationships and shipping history
          </p>
        </div>
        <Button data-testid="button-new-customer" onClick={() => console.log('Create new customer')}>
          <Plus className="h-4 w-4 mr-2" />
          New Customer
        </Button>
      </div>

      <SearchFilter
        searchPlaceholder="Search customers by name, company, or email..."
        filters={customerFilters}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCustomers.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            onEdit={(id) => console.log('Edit customer:', id)}
            onViewHistory={(id) => console.log('View customer history:', id)}
          />
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12" data-testid="empty-state">
          <p className="text-lg text-muted-foreground">No customers found matching your criteria</p>
          <Button variant="outline" className="mt-4" onClick={() => setFilteredCustomers(mockCustomers)}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}