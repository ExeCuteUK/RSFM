import { KPICard } from "../dashboard-kpi"
import { Package, Truck, Users, DollarSign } from "lucide-react"

export default function KPICardExample() {
  return (
    <div className="p-4 grid grid-cols-2 gap-4">
      <KPICard
        title="Active Shipments"
        value={147}
        change="+12% from last month"
        changeType="increase"
        icon={Package}
      />
      <KPICard
        title="Available Drivers"
        value={23}
        change="-2% from last month"
        changeType="decrease"
        icon={Truck}
      />
      <KPICard
        title="Total Customers"
        value={542}
        change="+8% from last month"
        changeType="increase"
        icon={Users}
      />
      <KPICard
        title="Monthly Revenue"
        value="$45,230"
        change="+15% from last month"
        changeType="increase"
        icon={DollarSign}
      />
    </div>
  )
}