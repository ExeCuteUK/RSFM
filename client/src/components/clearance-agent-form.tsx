import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertClearanceAgentSchema, type InsertClearanceAgent } from "@shared/schema"
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

interface ClearanceAgentFormProps {
  onSubmit: (data: InsertClearanceAgent) => void
  onCancel: () => void
  defaultValues?: Partial<InsertClearanceAgent>
}

export function ClearanceAgentForm({ onSubmit, onCancel, defaultValues }: ClearanceAgentFormProps) {
  const [newImportEmail, setNewImportEmail] = useState("")
  const [newExportEmail, setNewExportEmail] = useState("")
  const [newAccountingEmail, setNewAccountingEmail] = useState("")
  const [showUnsavedFieldsWarning, setShowUnsavedFieldsWarning] = useState(false)
  
  const form = useForm<InsertClearanceAgent>({
    resolver: zodResolver(insertClearanceAgentSchema),
    defaultValues: {
      agentName: "",
      agentTelephone: "",
      agentImportEmail: [],
      agentExportEmail: [],
      agentAccountingEmail: [],
      ...defaultValues
    },
  })

  const importEmails = form.watch("agentImportEmail") || []
  const exportEmails = form.watch("agentExportEmail") || []
  const accountingEmails = form.watch("agentAccountingEmail") || []

  const addImportEmail = () => {
    if (!newImportEmail.trim()) return
    const currentEmails = form.getValues("agentImportEmail") || []
    if (!currentEmails.includes(newImportEmail.trim())) {
      form.setValue("agentImportEmail", [...currentEmails, newImportEmail.trim()])
      setNewImportEmail("")
    }
  }

  const removeImportEmail = (email: string) => {
    const currentEmails = form.getValues("agentImportEmail") || []
    form.setValue("agentImportEmail", currentEmails.filter(e => e !== email))
  }

  const addExportEmail = () => {
    if (!newExportEmail.trim()) return
    const currentEmails = form.getValues("agentExportEmail") || []
    if (!currentEmails.includes(newExportEmail.trim())) {
      form.setValue("agentExportEmail", [...currentEmails, newExportEmail.trim()])
      setNewExportEmail("")
    }
  }

  const removeExportEmail = (email: string) => {
    const currentEmails = form.getValues("agentExportEmail") || []
    form.setValue("agentExportEmail", currentEmails.filter(e => e !== email))
  }

  const addAccountingEmail = () => {
    if (!newAccountingEmail.trim()) return
    const currentEmails = form.getValues("agentAccountingEmail") || []
    if (!currentEmails.includes(newAccountingEmail.trim())) {
      form.setValue("agentAccountingEmail", [...currentEmails, newAccountingEmail.trim()])
      setNewAccountingEmail("")
    }
  }

  const removeAccountingEmail = (email: string) => {
    const currentEmails = form.getValues("agentAccountingEmail") || []
    form.setValue("agentAccountingEmail", currentEmails.filter(e => e !== email))
  }

  const hasUnsavedFields = () => {
    return (
      newImportEmail.trim() !== "" ||
      newExportEmail.trim() !== "" ||
      newAccountingEmail.trim() !== ""
    )
  }

  const handleFormSubmit = (data: InsertClearanceAgent) => {
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
                  <FormLabel>Agent Name *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-agent-name" />
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
                  <FormLabel>Agent Telephone</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-agent-telephone" />
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
              name="agentImportEmail"
              render={() => (
                <FormItem>
                  <FormLabel>Agent Import Email</FormLabel>
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
              name="agentExportEmail"
              render={() => (
                <FormItem>
                  <FormLabel>Agent Export Email</FormLabel>
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
              name="agentAccountingEmail"
              render={() => (
                <FormItem>
                  <FormLabel>Agent Accounting Email</FormLabel>
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
