import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertExportCustomerSchema, type InsertExportCustomer } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

interface ExportCustomerFormProps {
  onSubmit: (data: InsertExportCustomer) => void
  onCancel: () => void
  defaultValues?: Partial<InsertExportCustomer>
}

export function ExportCustomerForm({ onSubmit, onCancel, defaultValues }: ExportCustomerFormProps) {
  const [newEmail, setNewEmail] = useState("")
  const [newAccountsEmail, setNewAccountsEmail] = useState("")
  const [newAgentEmail, setNewAgentEmail] = useState("")
  const [newAgentAccountsEmail, setNewAgentAccountsEmail] = useState("")
  
  const form = useForm<InsertExportCustomer>({
    resolver: zodResolver(insertExportCustomerSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      vatNumber: "",
      telephone: "",
      email: [],
      accountsEmail: [],
      addressLine1: "",
      addressLine2: "",
      town: "",
      county: "",
      postcode: "",
      country: "",
      agentName: "",
      agentContactName: "",
      agentVatNumber: "",
      agentTelephone: "",
      agentEmail: [],
      agentAccountsEmail: [],
      agentAddressLine1: "",
      agentAddressLine2: "",
      agentTown: "",
      agentCounty: "",
      agentPostcode: "",
      agentCountry: "",
      ...defaultValues
    },
  })

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

  const addAccountsEmail = () => {
    if (!newAccountsEmail.trim()) return
    const currentAccountsEmails = form.getValues("accountsEmail") || []
    if (!currentAccountsEmails.includes(newAccountsEmail.trim())) {
      form.setValue("accountsEmail", [...currentAccountsEmails, newAccountsEmail.trim()])
      setNewAccountsEmail("")
    }
  }

  const removeAccountsEmail = (email: string) => {
    const currentAccountsEmails = form.getValues("accountsEmail") || []
    form.setValue("accountsEmail", currentAccountsEmails.filter(e => e !== email))
  }

  const addAgentEmail = () => {
    if (!newAgentEmail.trim()) return
    const currentAgentEmails = form.getValues("agentEmail") || []
    if (!currentAgentEmails.includes(newAgentEmail.trim())) {
      form.setValue("agentEmail", [...currentAgentEmails, newAgentEmail.trim()])
      setNewAgentEmail("")
    }
  }

  const removeAgentEmail = (email: string) => {
    const currentAgentEmails = form.getValues("agentEmail") || []
    form.setValue("agentEmail", currentAgentEmails.filter(e => e !== email))
  }

  const addAgentAccountsEmail = () => {
    if (!newAgentAccountsEmail.trim()) return
    const currentAgentAccountsEmails = form.getValues("agentAccountsEmail") || []
    if (!currentAgentAccountsEmails.includes(newAgentAccountsEmail.trim())) {
      form.setValue("agentAccountsEmail", [...currentAgentAccountsEmails, newAgentAccountsEmail.trim()])
      setNewAgentAccountsEmail("")
    }
  }

  const removeAgentAccountsEmail = (email: string) => {
    const currentAgentAccountsEmails = form.getValues("agentAccountsEmail") || []
    form.setValue("agentAccountsEmail", currentAgentAccountsEmails.filter(e => e !== email))
  }

  const emails = form.watch("email") || []
  const accountsEmails = form.watch("accountsEmail") || []
  const agentEmails = form.watch("agentEmail") || []
  const agentAccountsEmails = form.watch("agentAccountsEmail") || []

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-company-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-contact-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="vatNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT Number</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-vat-number" />
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
              
              <FormField
                control={form.control}
                name="accountsEmail"
                render={() => (
                  <FormItem>
                    <FormLabel>Accounts Email</FormLabel>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter email address"
                          value={newAccountsEmail}
                          onChange={(e) => setNewAccountsEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addAccountsEmail()
                            }
                          }}
                          type="email"
                          data-testid="input-new-accounts-email"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={addAccountsEmail}
                          data-testid="button-add-accounts-email"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {accountsEmails.length > 0 && (
                        <div className="flex flex-wrap gap-2" data-testid="list-accounts-emails">
                          {accountsEmails.map((email) => (
                            <Badge
                              key={email}
                              variant="secondary"
                              className="gap-1"
                              data-testid={`badge-accounts-email-${email}`}
                            >
                              {email}
                              <button
                                type="button"
                                onClick={() => removeAccountsEmail(email)}
                                className="hover:bg-destructive/20 rounded-sm"
                                data-testid={`button-remove-accounts-email-${email}`}
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
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-address-line-1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-address-line-2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="town"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Town</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-town" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="county"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>County</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-county" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="postcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postcode</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-postcode" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-country" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Agent Information */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="agentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-agent-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agentContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-agent-contact-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agentVatNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent VAT Number</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-agent-vat-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agentTelephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telephone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-agent-telephone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agentEmail"
                render={() => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter email address"
                          value={newAgentEmail}
                          onChange={(e) => setNewAgentEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addAgentEmail()
                            }
                          }}
                          type="email"
                          data-testid="input-new-agent-email"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={addAgentEmail}
                          data-testid="button-add-agent-email"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {agentEmails.length > 0 && (
                        <div className="flex flex-wrap gap-2" data-testid="list-agent-emails">
                          {agentEmails.map((email) => (
                            <Badge
                              key={email}
                              variant="secondary"
                              className="gap-1"
                              data-testid={`badge-agent-email-${email}`}
                            >
                              {email}
                              <button
                                type="button"
                                onClick={() => removeAgentEmail(email)}
                                className="hover:bg-destructive/20 rounded-sm"
                                data-testid={`button-remove-agent-email-${email}`}
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
                name="agentAccountsEmail"
                render={() => (
                  <FormItem>
                    <FormLabel>Agent Accounts Email</FormLabel>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter email address"
                          value={newAgentAccountsEmail}
                          onChange={(e) => setNewAgentAccountsEmail(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addAgentAccountsEmail()
                            }
                          }}
                          type="email"
                          data-testid="input-new-agent-accounts-email"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={addAgentAccountsEmail}
                          data-testid="button-add-agent-accounts-email"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {agentAccountsEmails.length > 0 && (
                        <div className="flex flex-wrap gap-2" data-testid="list-agent-accounts-emails">
                          {agentAccountsEmails.map((email) => (
                            <Badge
                              key={email}
                              variant="secondary"
                              className="gap-1"
                              data-testid={`badge-agent-accounts-email-${email}`}
                            >
                              {email}
                              <button
                                type="button"
                                onClick={() => removeAgentAccountsEmail(email)}
                                className="hover:bg-destructive/20 rounded-sm"
                                data-testid={`button-remove-agent-accounts-email-${email}`}
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
                name="agentAddressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-agent-address-line-1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agentAddressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-agent-address-line-2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agentTown"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Town</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-agent-town" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agentCounty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>County</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-agent-county" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agentPostcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postcode</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-agent-postcode" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agentCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-agent-country" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            data-testid="button-cancel"
          >
            Cancel / Close
          </Button>
          <Button type="submit" data-testid="button-submit">
            Add/Update Customer
          </Button>
        </div>
      </form>
    </Form>
  )
}