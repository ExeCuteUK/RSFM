import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { insertExportReceiverSchema, type InsertExportReceiver } from "@shared/schema"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ExportReceiverFormProps {
  onSubmit: (data: InsertExportReceiver) => void
  onCancel: () => void
  defaultValues?: Partial<InsertExportReceiver>
}

export function ExportReceiverForm({ onSubmit, onCancel, defaultValues }: ExportReceiverFormProps) {
  const form = useForm<InsertExportReceiver>({
    resolver: zodResolver(insertExportReceiverSchema),
    defaultValues: {
      companyName: "",
      address: "",
      country: "",
      ...defaultValues
    },
  })

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
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ""} 
                      rows={4}
                      placeholder="Enter full address (multi-line)"
                      data-testid="input-address" 
                    />
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