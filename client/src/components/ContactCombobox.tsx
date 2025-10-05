import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";

type ContactType = "import-customer" | "export-customer" | "export-receiver";

interface Contact {
  id: string;
  companyName: string;
  contactName?: string[] | null;
}

interface ContactComboboxProps {
  type: ContactType;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ContactCombobox({
  type,
  value,
  onValueChange,
  placeholder = "Select contact...",
  disabled = false,
  className,
}: ContactComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Construct search endpoint
  const searchEndpoint = `/api/${type}s/search?query=${encodeURIComponent(debouncedQuery)}&limit=25`;

  // Fetch search results
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: [searchEndpoint],
    queryFn: async () => {
      const res = await fetch(searchEndpoint, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: open, // Only fetch when popover is open
  });

  // Get selected contact for display
  const selectedContact = contacts.find((contact) => contact.id === value);

  const handleSelect = useCallback(
    (currentValue: string) => {
      onValueChange(currentValue === value ? "" : currentValue);
      setOpen(false);
      setSearchQuery("");
    },
    [value, onValueChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
          data-testid={`button-select-${type}`}
        >
          <span className="truncate">
            {selectedContact?.companyName || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${type.replace("-", " ")}s...`}
            value={searchQuery}
            onValueChange={setSearchQuery}
            data-testid={`input-search-${type}`}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Searching...
                </span>
              </div>
            ) : contacts.length === 0 ? (
              <CommandEmpty>
                {searchQuery
                  ? "No contacts found."
                  : `Start typing to search ${type.replace("-", " ")}s...`}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.id}
                    onSelect={handleSelect}
                    data-testid={`item-${type}-${contact.id}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === contact.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 overflow-hidden">
                      <div className="font-medium truncate">
                        {contact.companyName}
                      </div>
                      {contact.contactName && contact.contactName.length > 0 && (
                        <div className="text-xs text-muted-foreground truncate">
                          {contact.contactName[0]}
                          {contact.contactName.length > 1 &&
                            ` +${contact.contactName.length - 1} more`}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
