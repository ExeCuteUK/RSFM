import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertImportCustomerSchema, type InsertImportCustomer } from "@shared/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { X, Plus } from "lucide-react"
import { useState } from "react"

interface ImportCustomerFormProps {
  onSubmit: (data: InsertImportCustomer) => void
  onCancel: () => void
  defaultValues?: Partial<InsertImportCustomer>
}

export function ImportCustomerForm({ onSubmit, onCancel, defaultValues }: ImportCustomerFormProps) {
  const [newEmail, setNewEmail] = useState("")
  const [newAccountsEmail, setNewAccountsEmail] = useState("")
  const [newAgentEmail, setNewAgentEmail] = useState("")
  const [newAgentAccountsEmail, setNewAgentAccountsEmail] = useState("")
  const [newContactName, setNewContactName] = useState("")
  const [newAgentContactName, setNewAgentContactName] = useState("")
  const [showUnsavedFieldsWarning, setShowUnsavedFieldsWarning] = useState(false)
  
  const form = useForm<InsertImportCustomer>({
    resolver: zodResolver(insertImportCustomerSchema),
    defaultValues: {
      companyName: "",
      contactName: [],
      vatNumber: "",
      telephone: "",
      email: [],
      accountsEmail: [],
      address: "",
      agentName: "",
      agentContactName: [],
      agentVatNumber: "",
      agentTelephone: "",
      agentEmail: [],
      agentAccountsEmail: [],
      agentAddress: "",
      rsProcessCustomsClearance: false,
      agentInDover: "",
      vatPaymentMethod: "",
      clearanceAgentDetails: "",
      defaultDeliveryAddress: "",
      defaultSuppliersName: "",
      bookingInDetails: "",
      ...defaultValues
    },
  })

  const rsToArrangeClearance = form.watch("rsProcessCustomsClearance")
  const emails = form.watch("email") || []
  const accountsEmails = form.watch("accountsEmail") || []
  const agentEmails = form.watch("agentEmail") || []
  const agentAccountsEmails = form.watch("agentAccountsEmail") || []
  const contactNames = form.watch("contactName") || []
  const agentContactNames = form.watch("agentContactName") || []

  const addContactName = () => {
    if (!newContactName.trim()) return
    const currentNames = form.getValues("contactName") || []
    if (!currentNames.includes(newContactName.trim())) {
      form.setValue("contactName", [...currentNames, newContactName.trim()])
      setNewContactName("")
    }
  }

  const removeContactName = (name: string) => {
    const currentNames = form.getValues("contactName") || []
    form.setValue("contactName", currentNames.filter(n => n !== name))
  }

  const addAgentContactName = () => {
    if (!newAgentContactName.trim()) return
    const currentNames = form.getValues("agentContactName") || []
    if (!currentNames.includes(newAgentContactName.trim())) {
      form.setValue("agentContactName", [...currentNames, newAgentContactName.trim()])
      setNewAgentContactName("")
    }
  }

  const removeAgentContactName = (name: string) => {
    const currentNames = form.getValues("agentContactName") || []
    form.setValue("agentContactName", currentNames.filter(n => n !== name))
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

  const addAccountsEmail = () => {
    if (!newAccountsEmail.trim()) return
    const currentEmails = form.getValues("accountsEmail") || []
    if (!currentEmails.includes(newAccountsEmail.trim())) {
      form.setValue("accountsEmail", [...currentEmails, newAccountsEmail.trim()])
      setNewAccountsEmail("")
    }
  }

  const removeAccountsEmail = (email: string) => {
    const currentEmails = form.getValues("accountsEmail") || []
    form.setValue("accountsEmail", currentEmails.filter(e => e !== email))
  }

  const addAgentEmail = () => {
    if (!newAgentEmail.trim()) return
    const currentEmails = form.getValues("agentEmail") || []
    if (!currentEmails.includes(newAgentEmail.trim())) {
      form.setValue("agentEmail", [...currentEmails, newAgentEmail.trim()])
      setNewAgentEmail("")
    }
  }

  const removeAgentEmail = (email: string) => {
    const currentEmails = form.getValues("agentEmail") || []
    form.setValue("agentEmail", currentEmails.filter(e => e !== email))
  }

  const addAgentAccountsEmail = () => {
    if (!newAgentAccountsEmail.trim()) return
    const currentEmails = form.getValues("agentAccountsEmail") || []
    if (!currentEmails.includes(newAgentAccountsEmail.trim())) {
      form.setValue("agentAccountsEmail", [...currentEmails, newAgentAccountsEmail.trim()])
      setNewAgentAccountsEmail("")
    }
  }

  const removeAgentAccountsEmail = (email: string) => {
    const currentEmails = form.getValues("agentAccountsEmail") || []
    form.setValue("agentAccountsEmail", currentEmails.filter(e => e !== email))
  }

  const hasUnsavedFields = () => {
    return (
      newContactName.trim() !== "" ||
      newAgentContactName.trim() !== "" ||
      newEmail.trim() !== "" ||
      newAccountsEmail.trim() !== "" ||
      newAgentEmail.trim() !== "" ||
      newAgentAccountsEmail.trim() !== ""
    )
  }

  const handleFormSubmit = (data: InsertImportCustomer) => {
    if (hasUnsavedFields()) {
      setShowUnsavedFieldsWarning(true)
    } else {
      onSubmit(data)
    }
  }

  const handleContinueWithoutSaving = () => {
    setShowUnsavedFieldsWarning(false)
    const data = form.getValues()
    onSubmit(data)
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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
                render={() => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
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
                          placeholder="Enter accounts email address"
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-address" rows={4} />
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
                render={() => (
                  <FormItem>
                    <FormLabel>Agent Contact Name</FormLabel>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter agent contact name"
                          value={newAgentContactName}
                          onChange={(e) => setNewAgentContactName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addAgentContactName()
                            }
                          }}
                          data-testid="input-new-agent-contact-name"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={addAgentContactName}
                          data-testid="button-add-agent-contact-name"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {agentContactNames.length > 0 && (
                        <div className="flex flex-wrap gap-2" data-testid="list-agent-contact-names">
                          {agentContactNames.map((name) => (
                            <Badge
                              key={name}
                              variant="secondary"
                              className="gap-1"
                              data-testid={`badge-agent-contact-name-${name}`}
                            >
                              {name}
                              <button
                                type="button"
                                onClick={() => removeAgentContactName(name)}
                                className="hover:bg-destructive/20 rounded-sm"
                                data-testid={`button-remove-agent-contact-name-${name}`}
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
                          placeholder="Enter agent accounts email address"
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
                name="agentAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-agent-address" rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Import Information */}
        <Card>
          <CardHeader>
            <CardTitle>Import Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="rsProcessCustomsClearance"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-rs-process-customs-clearance"
                    />
                  </FormControl>
                  <FormLabel className="font-normal">R.S. To Arrange Clearance</FormLabel>
                </FormItem>
              )}
            />
            
            {rsToArrangeClearance && (
              <FormField
                control={form.control}
                name="vatPaymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-vat-payment-method">
                          <SelectValue placeholder="Select VAT payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Postponed VAT Accounting (PVA)">Postponed VAT Accounting (PVA)</SelectItem>
                        <SelectItem value="R.S Deferment">R.S Deferment</SelectItem>
                        <SelectItem value="Customer Deferment">Customer Deferment</SelectItem>
                        <SelectItem value="Flexible Accounting (FAS)">Flexible Accounting (FAS)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {!rsToArrangeClearance && (
              <>
                <FormField
                  control={form.control}
                  name="agentInDover"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clearance Agent</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-agent-in-dover" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="clearanceAgentDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clearance Agent Details</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-clearance-agent-details" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            <FormField
              control={form.control}
              name="defaultDeliveryAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Delivery Address</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-default-delivery-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="defaultSuppliersName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Suppliers Name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-default-suppliers-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bookingInDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking In Details</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-booking-in-details" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

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

    <AlertDialog open={showUnsavedFieldsWarning} onOpenChange={setShowUnsavedFieldsWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Field Information</AlertDialogTitle>
          <AlertDialogDescription>
            You have entered information in one or more fields but haven't added it using the + button. 
            Do you want to continue without saving these entries?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-go-back">Go Back</AlertDialogCancel>
          <AlertDialogAction onClick={handleContinueWithoutSaving} data-testid="button-continue">
            Continue Without Saving
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}