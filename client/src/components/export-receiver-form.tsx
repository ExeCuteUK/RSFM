import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertExportReceiverSchema, type InsertExportReceiver } from "@shared/schema"
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

interface ExportReceiverFormProps {
  onSubmit: (data: InsertExportReceiver) => void
  onCancel: () => void
  defaultValues?: Partial<InsertExportReceiver>
}

export function ExportReceiverForm({ onSubmit, onCancel, defaultValues }: ExportReceiverFormProps) {
  const [newEmail, setNewEmail] = useState("")
  
  const form = useForm<InsertExportReceiver>({
    resolver: zodResolver(insertExportReceiverSchema),
    defaultValues: {
      companyName: "",
      email: [],
      addressLine1: "",
      addressLine2: "",
      town: "",
      county: "",
      postcode: "",
      country: "",
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
            Add/Update Receiver
          </Button>
        </div>
      </form>
    </Form>
  )
}