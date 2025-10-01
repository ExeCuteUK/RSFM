import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input" 
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calculator, MapPin, Package, DollarSign } from "lucide-react"

export default function RateCalculator() {
  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    weight: "",
    serviceType: "",
    distance: 0,
    baseRate: 0,
    totalRate: 0
  })

  const serviceTypes = [
    { value: "standard", label: "Standard Delivery", rate: 1.0 },
    { value: "express", label: "Express Delivery", rate: 1.5 },
    { value: "overnight", label: "Overnight Delivery", rate: 2.0 }
  ]

  const calculateRate = () => {
    const weight = parseFloat(formData.weight) || 0
    const serviceMultiplier = serviceTypes.find(s => s.value === formData.serviceType)?.rate || 1.0
    
    // todo: replace with real distance calculation API
    const mockDistance = Math.floor(Math.random() * 2000) + 100
    const baseRate = (weight * 0.5) + (mockDistance * 0.8)
    const totalRate = baseRate * serviceMultiplier
    
    setFormData(prev => ({
      ...prev,
      distance: mockDistance,
      baseRate,
      totalRate
    }))
    
    console.log('Rate calculated:', { weight, distance: mockDistance, baseRate, totalRate })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Rate Calculator</h1>
        <p className="text-muted-foreground">
          Calculate shipping rates based on distance, weight, and service type
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculate Shipping Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origin">Origin</Label>
                <Input
                  id="origin"
                  placeholder="e.g., New York, NY"
                  value={formData.origin}
                  onChange={(e) => setFormData(prev => ({ ...prev, origin: e.target.value }))}
                  data-testid="input-origin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  placeholder="e.g., Los Angeles, CA"
                  value={formData.destination}
                  onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                  data-testid="input-destination"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="Enter weight in pounds"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                data-testid="input-weight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <Select 
                value={formData.serviceType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, serviceType: value }))}
              >
                <SelectTrigger data-testid="select-service-type">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={calculateRate} 
              className="w-full"
              disabled={!formData.origin || !formData.destination || !formData.weight || !formData.serviceType}
              data-testid="button-calculate"
            >
              Calculate Rate
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Rate Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.totalRate > 0 ? (
              <>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">Distance</div>
                    <div className="text-sm text-muted-foreground" data-testid="text-distance">
                      {formData.distance} miles
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">Weight</div>
                    <div className="text-sm text-muted-foreground" data-testid="text-weight">
                      {formData.weight} lbs
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Calculator className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">Service Type</div>
                    <div className="text-sm text-muted-foreground">
                      {serviceTypes.find(s => s.value === formData.serviceType)?.label}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Base Rate:</span>
                    <span data-testid="text-base-rate">£{formData.baseRate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Service Multiplier:</span>
                    <span>{serviceTypes.find(s => s.value === formData.serviceType)?.rate}x</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total Rate:</span>
                    <span data-testid="text-total-rate">£{formData.totalRate.toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => console.log('Create shipment with rate:', formData.totalRate)}
                  data-testid="button-create-shipment"
                >
                  Create Shipment with This Rate
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter shipment details to calculate rate</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}