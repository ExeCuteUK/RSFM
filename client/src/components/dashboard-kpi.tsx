import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface KPICardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "increase" | "decrease"
  icon: LucideIcon
}

export function KPICard({ title, value, change, changeType, icon: Icon }: KPICardProps) {
  return (
    <Card data-testid={`kpi-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`text-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        {change && (
          <p className={`text-xs ${
            changeType === "increase" ? "text-green-600" : "text-red-600"
          }`} data-testid={`text-change-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  )
}