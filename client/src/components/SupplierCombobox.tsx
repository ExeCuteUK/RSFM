import { useState, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useQuery } from "@tanstack/react-query"
import type { ImportCustomer } from "@shared/schema"

interface SupplierComboboxProps {
  value: string
  onChange: (value: string) => void
  importCustomerId?: string | null
  disabled?: boolean
}

export function SupplierCombobox({ value, onChange, importCustomerId, disabled }: SupplierComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState(value || "")

  // Fetch the import customer to get their default suppliers
  const { data: customer } = useQuery<ImportCustomer>({
    queryKey: ['/api/import-customers', importCustomerId],
    queryFn: async () => {
      const res = await fetch(`/api/import-customers/${importCustomerId}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!importCustomerId,
  })

  // Handle both string (old data) and array (after migration) formats
  const rawSuppliers = customer?.defaultSuppliersName
  const suppliers = Array.isArray(rawSuppliers) ? rawSuppliers : (rawSuppliers ? [rawSuppliers] : [])

  // Update search value when value prop changes
  useEffect(() => {
    setSearchValue(value || "")
  }, [value])

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.toLowerCase().includes(searchValue.toLowerCase())
  )

  // Check if current value is in the list
  const isExistingSupplier = suppliers.some(s => s.toLowerCase() === value?.toLowerCase())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
          type="button"
          data-testid="button-supplier-combobox"
        >
          {value || "Select or type supplier name..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search or type new supplier name..." 
            value={searchValue}
            onValueChange={(val) => {
              setSearchValue(val)
            }}
            data-testid="input-supplier-search"
          />
          <CommandList>
            {filteredSuppliers.length === 0 && searchValue && (
              <CommandEmpty>
                <div className="text-sm">
                  {searchValue ? (
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1.5 hover:bg-accent rounded-sm"
                      onClick={() => {
                        onChange(searchValue)
                        setOpen(false)
                      }}
                      data-testid="button-use-new-supplier"
                    >
                      Use "{searchValue}" (new supplier)
                    </button>
                  ) : (
                    "Type to add a new supplier"
                  )}
                </div>
              </CommandEmpty>
            )}
            {filteredSuppliers.length > 0 && (
              <CommandGroup>
                {filteredSuppliers.map((supplier) => (
                  <CommandItem
                    key={supplier}
                    value={supplier}
                    onSelect={() => {
                      onChange(supplier)
                      setSearchValue(supplier)
                      setOpen(false)
                    }}
                    data-testid={`option-supplier-${supplier}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.toLowerCase() === supplier.toLowerCase() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {supplier}
                  </CommandItem>
                ))}
                {searchValue && !isExistingSupplier && searchValue.toLowerCase() !== value?.toLowerCase() && (
                  <CommandItem
                    value={searchValue}
                    onSelect={() => {
                      onChange(searchValue)
                      setOpen(false)
                    }}
                    data-testid="option-use-new-supplier"
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    Use "{searchValue}" (new supplier)
                  </CommandItem>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
