import { DriverCard } from "../driver-card"

const mockDrivers = [
  {
    id: "D001",
    name: "John Smith", 
    email: "j.smith@freightpro.com",
    phone: "+1 (555) 234-5678",
    licenseNumber: "CDL123456789",
    vehicleType: "Semi-truck",
    vehicleNumber: "FP-001",
    status: "available" as const,
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
    status: "in-transit" as const,
    currentLocation: "Phoenix, AZ",
    totalDeliveries: 189,
    rating: 4.9
  }
]

export default function DriverCardExample() {
  return (
    <div className="p-4 grid gap-4 md:grid-cols-2">
      {mockDrivers.map((driver) => (
        <DriverCard
          key={driver.id}
          driver={driver}
          onAssign={(id) => console.log('Assign driver:', id)}
          onContact={(id) => console.log('Contact driver:', id)}
        />
      ))}
    </div>
  )
}