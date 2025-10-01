import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertHaulierSchema, type InsertHaulier } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Plus } from "lucide-react"
import { useState } from "react"

interface HaulierFormProps {
  onSubmit: (data: InsertHaulier) => void
  onCancel: () => void
  defaultValues?: Partial<InsertHaulier>
}

export function HaulierForm({ onSubmit, onCancel, defaultValues }: HaulierFormProps) {
  const [newCountry, setNewCountry] = useState("")
  
  const form = useForm<InsertHaulier>({
    resolver: zodResolver(insertHaulierSchema),
    defaultValues: {
      haulierName: "",
      homeCountry: "",
      address: "",
      telephone: "",
      mobile: "",
      email: "",
      destinationCountries: [],
      ...defaultValues
    },
  })

  const destinationCountries = form.watch("destinationCountries") || []

  const addCountry = () => {
    if (!newCountry.trim()) return
    const currentCountries = form.getValues("destinationCountries") || []
    if (!currentCountries.includes(newCountry.trim())) {
      form.setValue("destinationCountries", [...currentCountries, newCountry.trim()])
      setNewCountry("")
    }
  }

  const removeCountry = (country: string) => {
    const currentCountries = form.getValues("destinationCountries") || []
    form.setValue("destinationCountries", currentCountries.filter(c => c !== country))
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="haulierName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Haulier Name *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-haulier-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="homeCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Country</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-home-country" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ""} 
                      rows={3}
                      data-testid="input-address" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="telephone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telephone</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-telephone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-mobile" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} type="email" data-testid="input-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="destinationCountries"
              render={() => (
                <FormItem>
                  <FormLabel>Destination Countries Serviced</FormLabel>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter country name"
                        value={newCountry}
                        onChange={(e) => setNewCountry(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addCountry()
                          }
                        }}
                        data-testid="input-new-country"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={addCountry}
                        data-testid="button-add-country"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {destinationCountries.length > 0 && (
                      <div className="flex flex-wrap gap-2" data-testid="list-countries">
                        {destinationCountries.map((country) => (
                          <Badge
                            key={country}
                            variant="secondary"
                            className="gap-1"
                            data-testid={`badge-country-${country}`}
                          >
                            {country}
                            <button
                              type="button"
                              onClick={() => removeCountry(country)}
                              className="hover:bg-destructive/20 rounded-sm"
                              data-testid={`button-remove-country-${country}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancel
          </Button>
          <Button type="submit" data-testid="button-submit">
            {defaultValues ? "Update" : "Create"} Haulier
          </Button>
        </div>
      </form>
    </Form>
  )
}
