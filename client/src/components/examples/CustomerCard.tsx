import { CustomerCard } from "../customer-card"

const mockCustomers = [
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
    status: "active" as const
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
    status: "active" as const
  }
]

export default function CustomerCardExample() {
  return (
    <div className="p-4 grid gap-4 md:grid-cols-2">
      {mockCustomers.map((customer) => (
        <CustomerCard
          key={customer.id}
          customer={customer}
          onEdit={(id) => console.log('Edit customer:', id)}
          onViewHistory={(id) => console.log('View customer history:', id)}
        />
      ))}
    </div>
  )
}