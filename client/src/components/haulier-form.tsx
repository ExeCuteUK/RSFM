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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Plus } from "lucide-react"
import { useState } from "react"

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia",
  "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
  "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "Norway",
  "Oman",
  "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Swaziland", "Sweden",
  "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
]

interface HaulierFormProps {
  onSubmit: (data: InsertHaulier) => void
  onCancel: () => void
  defaultValues?: Partial<InsertHaulier>
}

export function HaulierForm({ onSubmit, onCancel, defaultValues }: HaulierFormProps) {
  const [newCountry, setNewCountry] = useState("")
  const [filteredCountries, setFilteredCountries] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newContactName, setNewContactName] = useState("")
  
  const form = useForm<InsertHaulier>({
    resolver: zodResolver(insertHaulierSchema),
    defaultValues: {
      haulierName: "",
      contactNames: [],
      homeCountry: "",
      address: "",
      telephone: "",
      mobile: "",
      email: [],
      destinationCountries: [],
      ...defaultValues
    },
  })

  const destinationCountries = form.watch("destinationCountries") || []
  const contactNames = form.watch("contactNames") || []

  const handleCountryInput = (value: string) => {
    setNewCountry(value)
    if (value.trim().length > 0) {
      const filtered = COUNTRIES.filter(country => 
        country.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10)
      setFilteredCountries(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setFilteredCountries([])
      setShowSuggestions(false)
    }
  }

  const addCountry = (countryToAdd?: string) => {
    const country = countryToAdd || newCountry
    if (!country.trim()) return
    const currentCountries = form.getValues("destinationCountries") || []
    if (!currentCountries.includes(country.trim())) {
      form.setValue("destinationCountries", [...currentCountries, country.trim()])
      setNewCountry("")
      setShowSuggestions(false)
      setFilteredCountries([])
    }
  }

  const removeCountry = (country: string) => {
    const currentCountries = form.getValues("destinationCountries") || []
    form.setValue("destinationCountries", currentCountries.filter(c => c !== country))
  }

  const addContactName = () => {
    if (!newContactName.trim()) return
    const currentNames = form.getValues("contactNames") || []
    if (!currentNames.includes(newContactName.trim())) {
      form.setValue("contactNames", [...currentNames, newContactName.trim()])
      setNewContactName("")
    }
  }

  const removeContactName = (name: string) => {
    const currentNames = form.getValues("contactNames") || []
    form.setValue("contactNames", currentNames.filter(n => n !== name))
  }

  const addEmail = () => {
    if (!newEmail.trim()) return
    const currentEmails = form.getValues("email") || []
    if (!currentEmails.includes(newEmail.trim())) {
      form.setValue("email", [...currentEmails, newEmail.trim()])
      setNewEmail("")
    }
  }

  const removeEmail = (email: string) => {
    const currentEmails = form.getValues("email") || []
    form.setValue("email", currentEmails.filter(e => e !== email))
  }

  const emails = form.watch("email") || []

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
              name="contactNames"
              render={() => (
                <FormItem>
                  <FormLabel>Haulier Contact Name</FormLabel>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter contact name"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addContactName()
                          }
                        }}
                        data-testid="input-new-contact-name"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={addContactName}
                        data-testid="button-add-contact-name"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {contactNames.length > 0 && (
                      <div className="flex flex-wrap gap-2" data-testid="list-contact-names">
                        {contactNames.map((name) => (
                          <Badge
                            key={name}
                            variant="secondary"
                            className="gap-1"
                            data-testid={`badge-contact-name-${name}`}
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => removeContactName(name)}
                              className="hover:bg-destructive/20 rounded-sm"
                              data-testid={`button-remove-contact-name-${name}`}
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
            
            <FormField
              control={form.control}
              name="homeCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Country</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-home-country">
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              render={() => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter email address"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addEmail()
                          }
                        }}
                        type="email"
                        data-testid="input-new-email"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={addEmail}
                        data-testid="button-add-email"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {emails.length > 0 && (
                      <div className="flex flex-wrap gap-2" data-testid="list-emails">
                        {emails.map((email) => (
                          <Badge
                            key={email}
                            variant="secondary"
                            className="gap-1"
                            data-testid={`badge-email-${email}`}
                          >
                            {email}
                            <button
                              type="button"
                              onClick={() => removeEmail(email)}
                              className="hover:bg-destructive/20 rounded-sm"
                              data-testid={`button-remove-email-${email}`}
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

        <Card>
          <CardHeader>
            <CardTitle>Countries Serviced</CardTitle>
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
                      <div className="relative flex-1">
                        <Input
                          placeholder="Enter country name"
                          value={newCountry}
                          onChange={(e) => handleCountryInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addCountry()
                            } else if (e.key === "Escape") {
                              setShowSuggestions(false)
                            }
                          }}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                          data-testid="input-new-country"
                        />
                        {showSuggestions && filteredCountries.length > 0 && (
                          <div className="absolute top-full left-0 z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto" data-testid="dropdown-country-suggestions">
                            {filteredCountries.map((country) => (
                              <button
                                key={country}
                                type="button"
                                onClick={() => addCountry(country)}
                                className="w-full text-left px-3 py-2 hover-elevate text-sm"
                                data-testid={`suggestion-${country}`}
                              >
                                {country}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => addCountry()}
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
