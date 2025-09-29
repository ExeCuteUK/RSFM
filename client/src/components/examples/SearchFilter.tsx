import { SearchFilter } from "../search-filter"

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
  },
  {
    key: "priority",
    label: "Priority", 
    options: [
      { value: "high", label: "High" },
      { value: "medium", label: "Medium" },
      { value: "low", label: "Low" }
    ]
  }
]

export default function SearchFilterExample() {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Shipment Search & Filter</h3>
        <SearchFilter
          searchPlaceholder="Search shipments by ID, customer, or destination..."
          filters={shipmentFilters}
          onSearch={(query) => console.log('Search:', query)}
          onFilterChange={(filters) => console.log('Filters changed:', filters)}
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Simple Search</h3>
        <SearchFilter
          searchPlaceholder="Search customers..."
          onSearch={(query) => console.log('Customer search:', query)}
        />
      </div>
    </div>
  )
}