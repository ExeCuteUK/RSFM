import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertShippingLineSchema, type InsertShippingLine } from "@shared/schema"
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

interface ShippingLineFormProps {
  onSubmit: (data: InsertShippingLine) => void
  onCancel: () => void
  defaultValues?: Partial<InsertShippingLine>
}

export function ShippingLineForm({ onSubmit, onCancel, defaultValues }: ShippingLineFormProps) {
  const [newImportEmail, setNewImportEmail] = useState("")
  const [newExportEmail, setNewExportEmail] = useState("")
  const [newReleasesEmail, setNewReleasesEmail] = useState("")
  const [newAccountingEmail, setNewAccountingEmail] = useState("")
  
  const form = useForm<InsertShippingLine>({
    resolver: zodResolver(insertShippingLineSchema),
    defaultValues: {
      shippingLineName: "",
      shippingLineAddress: "",
      telephone: "",
      importEmail: [],
      exportEmail: [],
      releasesEmail: [],
      accountingEmail: [],
      ...defaultValues
    },
  })

  const importEmails = form.watch("importEmail") || []
  const exportEmails = form.watch("exportEmail") || []
  const releasesEmails = form.watch("releasesEmail") || []
  const accountingEmails = form.watch("accountingEmail") || []

  const addImportEmail = () => {
    if (!newImportEmail.trim()) return
    const currentEmails = form.getValues("importEmail") || []
    if (!currentEmails.includes(newImportEmail.trim())) {
      form.setValue("importEmail", [...currentEmails, newImportEmail.trim()])
      setNewImportEmail("")
    }
  }

  const removeImportEmail = (email: string) => {
    const currentEmails = form.getValues("importEmail") || []
    form.setValue("importEmail", currentEmails.filter(e => e !== email))
  }

  const addExportEmail = () => {
    if (!newExportEmail.trim()) return
    const currentEmails = form.getValues("exportEmail") || []
    if (!currentEmails.includes(newExportEmail.trim())) {
      form.setValue("exportEmail", [...currentEmails, newExportEmail.trim()])
      setNewExportEmail("")
    }
  }

  const removeExportEmail = (email: string) => {
    const currentEmails = form.getValues("exportEmail") || []
    form.setValue("exportEmail", currentEmails.filter(e => e !== email))
  }

  const addReleasesEmail = () => {
    if (!newReleasesEmail.trim()) return
    const currentEmails = form.getValues("releasesEmail") || []
    if (!currentEmails.includes(newReleasesEmail.trim())) {
      form.setValue("releasesEmail", [...currentEmails, newReleasesEmail.trim()])
      setNewReleasesEmail("")
    }
  }

  const removeReleasesEmail = (email: string) => {
    const currentEmails = form.getValues("releasesEmail") || []
    form.setValue("releasesEmail", currentEmails.filter(e => e !== email))
  }

  const addAccountingEmail = () => {
    if (!newAccountingEmail.trim()) return
    const currentEmails = form.getValues("accountingEmail") || []
    if (!currentEmails.includes(newAccountingEmail.trim())) {
      form.setValue("accountingEmail", [...currentEmails, newAccountingEmail.trim()])
      setNewAccountingEmail("")
    }
  }

  const removeAccountingEmail = (email: string) => {
    const currentEmails = form.getValues("accountingEmail") || []
    form.setValue("accountingEmail", currentEmails.filter(e => e !== email))
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
              name="shippingLineName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shipping Line Name *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-shipping-line-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="shippingLineAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shipping Line Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ""} 
                      rows={3}
                      data-testid="input-shipping-line-address" 
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="importEmail"
              render={() => (
                <FormItem>
                  <FormLabel>Import Email Contact</FormLabel>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter import email address"
                        value={newImportEmail}
                        onChange={(e) => setNewImportEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addImportEmail()
                          }
                        }}
                        type="email"
                        data-testid="input-new-import-email"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={addImportEmail}
                        data-testid="button-add-import-email"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {importEmails.length > 0 && (
                      <div className="flex flex-wrap gap-2" data-testid="list-import-emails">
                        {importEmails.map((email) => (
                          <Badge
                            key={email}
                            variant="secondary"
                            className="gap-1"
                            data-testid={`badge-import-email-${email}`}
                          >
                            {email}
                            <button
                              type="button"
                              onClick={() => removeImportEmail(email)}
                              className="hover:bg-destructive/20 rounded-sm"
                              data-testid={`button-remove-import-email-${email}`}
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
              name="exportEmail"
              render={() => (
                <FormItem>
                  <FormLabel>Export Email Contact</FormLabel>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter export email address"
                        value={newExportEmail}
                        onChange={(e) => setNewExportEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addExportEmail()
                          }
                        }}
                        type="email"
                        data-testid="input-new-export-email"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={addExportEmail}
                        data-testid="button-add-export-email"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {exportEmails.length > 0 && (
                      <div className="flex flex-wrap gap-2" data-testid="list-export-emails">
                        {exportEmails.map((email) => (
                          <Badge
                            key={email}
                            variant="secondary"
                            className="gap-1"
                            data-testid={`badge-export-email-${email}`}
                          >
                            {email}
                            <button
                              type="button"
                              onClick={() => removeExportEmail(email)}
                              className="hover:bg-destructive/20 rounded-sm"
                              data-testid={`button-remove-export-email-${email}`}
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
              name="releasesEmail"
              render={() => (
                <FormItem>
                  <FormLabel>Releases Email Contact</FormLabel>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter releases email address"
                        value={newReleasesEmail}
                        onChange={(e) => setNewReleasesEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addReleasesEmail()
                          }
                        }}
                        type="email"
                        data-testid="input-new-releases-email"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={addReleasesEmail}
                        data-testid="button-add-releases-email"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {releasesEmails.length > 0 && (
                      <div className="flex flex-wrap gap-2" data-testid="list-releases-emails">
                        {releasesEmails.map((email) => (
                          <Badge
                            key={email}
                            variant="secondary"
                            className="gap-1"
                            data-testid={`badge-releases-email-${email}`}
                          >
                            {email}
                            <button
                              type="button"
                              onClick={() => removeReleasesEmail(email)}
                              className="hover:bg-destructive/20 rounded-sm"
                              data-testid={`button-remove-releases-email-${email}`}
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
              name="accountingEmail"
              render={() => (
                <FormItem>
                  <FormLabel>Accounting Email Contact</FormLabel>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter accounting email address"
                        value={newAccountingEmail}
                        onChange={(e) => setNewAccountingEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addAccountingEmail()
                          }
                        }}
                        type="email"
                        data-testid="input-new-accounting-email"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={addAccountingEmail}
                        data-testid="button-add-accounting-email"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {accountingEmails.length > 0 && (
                      <div className="flex flex-wrap gap-2" data-testid="list-accounting-emails">
                        {accountingEmails.map((email) => (
                          <Badge
                            key={email}
                            variant="secondary"
                            className="gap-1"
                            data-testid={`badge-accounting-email-${email}`}
                          >
                            {email}
                            <button
                              type="button"
                              onClick={() => removeAccountingEmail(email)}
                              className="hover:bg-destructive/20 rounded-sm"
                              data-testid={`button-remove-accounting-email-${email}`}
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

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button type="submit" data-testid="button-submit">
            Submit
          </Button>
        </div>
      </form>
    </Form>
  )
}
