import { ShipmentCard } from "../shipment-card"

const mockShipments = [
  {
    id: "SH001",
    customerName: "ABC Manufacturing",
    origin: "New York, NY",
    destination: "Los Angeles, CA",
    status: "in-transit" as const,
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
    status: "pending" as const,
    pickupDate: "2024-01-16",
    deliveryDate: "2024-01-19",
    weight: 850,
    value: 8500
  }
]

export default function ShipmentCardExample() {
  return (
    <div className="p-4 grid gap-4 md:grid-cols-2">
      {mockShipments.map((shipment) => (
        <ShipmentCard
          key={shipment.id}
          shipment={shipment}
          onEdit={(id) => console.log('Edit shipment:', id)}
          onTrack={(id) => console.log('Track shipment:', id)}
        />
      ))}
    </div>
  )
}