import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertHaulierSchema, type InsertHaulier, type HaulierContact } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  const [newContactName, setNewContactName] = useState("")
  const [newContactEmail, setNewContactEmail] = useState("")
  const [newExportType, setNewExportType] = useState<"To" | "From" | "To & From">("To")
  const [newCountry, setNewCountry] = useState("")
  const [filteredCountries, setFilteredCountries] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const form = useForm<InsertHaulier>({
    resolver: zodResolver(insertHaulierSchema),
    defaultValues: {
      haulierName: "",
      contacts: [],
      address: "",
      telephone: "",
      mobile: "",
      ...defaultValues
    },
  })

  const contacts = form.watch("contacts") || []

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

  const addContact = (countryToAdd?: string) => {
    const country = countryToAdd || newCountry
    if (!newContactName.trim() || !newContactEmail.trim() || !country.trim()) return
    
    const currentContacts = form.getValues("contacts") || []
    form.setValue("contacts", [
      ...currentContacts, 
      { 
        contactName: newContactName.trim(), 
        contactEmail: newContactEmail.trim(),
        exportType: newExportType,
        countryServiced: country.trim() 
      }
    ])
    setNewContactName("")
    setNewContactEmail("")
    setNewExportType("To")
    setNewCountry("")
    setShowSuggestions(false)
    setFilteredCountries([])
  }

  const removeContact = (index: number) => {
    const currentContacts = form.getValues("contacts") || []
    form.setValue("contacts", currentContacts.filter((_, i) => i !== index))
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Haulier Information</CardTitle>
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
              name="contacts"
              render={() => (
                <FormItem>
                  <FormLabel>Contacts</FormLabel>
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-3">
                        <Input
                          placeholder="Contact Name"
                          value={newContactName}
                          onChange={(e) => setNewContactName(e.target.value)}
                          data-testid="input-new-contact-name"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          placeholder="Contact Email"
                          type="email"
                          value={newContactEmail}
                          onChange={(e) => setNewContactEmail(e.target.value)}
                          data-testid="input-new-contact-email"
                        />
                      </div>
                      <div className="col-span-2">
                        <Select value={newExportType} onValueChange={(value) => setNewExportType(value as typeof newExportType)}>
                          <SelectTrigger data-testid="select-export-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="To">To</SelectItem>
                            <SelectItem value="From">From</SelectItem>
                            <SelectItem value="To & From">To & From</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 relative">
                        <Input
                          placeholder="Country Serviced"
                          value={newCountry}
                          onChange={(e) => handleCountryInput(e.target.value)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                          data-testid="input-new-country"
                        />
                        {showSuggestions && filteredCountries.length > 0 && (
                          <div className="absolute top-full left-0 z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto" data-testid="dropdown-country-suggestions">
                            {filteredCountries.map((country) => (
                              <button
                                key={country}
                                type="button"
                                onClick={() => {
                                  setNewCountry(country)
                                  setShowSuggestions(false)
                                }}
                                className="w-full text-left px-3 py-2 hover-elevate text-sm"
                                data-testid={`suggestion-${country}`}
                              >
                                {country}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => addContact()}
                          data-testid="button-add-contact"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {contacts.length > 0 && (
                      <div className="space-y-2" data-testid="list-contacts">
                        {contacts.map((contact, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between p-3 bg-secondary/50 rounded-md"
                            data-testid={`contact-${index}`}
                          >
                            <div className="grid grid-cols-4 gap-4 flex-1 text-sm">
                              <div>
                                <div className="font-medium">{contact.contactName}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">{contact.contactEmail}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">{contact.exportType}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">{contact.countryServiced}</div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeContact(index)}
                              data-testid={`button-remove-contact-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
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
