import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Search, Filter, X } from "lucide-react"

interface FilterOption {
  key: string
  label: string
  options: { value: string; label: string }[]
}

interface SearchFilterProps {
  searchPlaceholder?: string
  filters?: FilterOption[]
  onSearch?: (query: string) => void
  onFilterChange?: (filters: Record<string, string>) => void
  className?: string
}

export function SearchFilter({ 
  searchPlaceholder = "Search...",
  filters = [],
  onSearch,
  onFilterChange,
  className = ""
}: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
    console.log('Search triggered:', value)
  }

  const handleFilterChange = (filterKey: string, value: string) => {
    const newFilters = { ...activeFilters }
    if (value === "all") {
      delete newFilters[filterKey]
    } else {
      newFilters[filterKey] = value
    }
    setActiveFilters(newFilters)
    onFilterChange?.(newFilters)
    console.log('Filter changed:', { filterKey, value, allFilters: newFilters })
  }

  const clearFilter = (filterKey: string) => {
    const newFilters = { ...activeFilters }
    delete newFilters[filterKey]
    setActiveFilters(newFilters)
    onFilterChange?.(newFilters)
    console.log('Filter cleared:', filterKey)
  }

  const clearAllFilters = () => {
    setActiveFilters({})
    onFilterChange?.({})
    console.log('All filters cleared')
  }

  const activeFilterCount = Object.keys(activeFilters).length

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        
        {filters.length > 0 && (
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="relative"
                data-testid="button-filter"
              >
                <Filter className="h-4 w-4" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-2 h-5 w-5 p-0 text-xs"
                    data-testid="badge-filter-count"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" data-testid="popover-filters">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      data-testid="button-clear-all-filters"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                
                {filters.map((filter) => (
                  <div key={filter.key} className="space-y-2">
                    <label className="text-sm font-medium">{filter.label}</label>
                    <Select
                      value={activeFilters[filter.key] || "all"}
                      onValueChange={(value) => handleFilterChange(filter.key, value)}
                    >
                      <SelectTrigger data-testid={`select-${filter.key}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {filter.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="active-filters">
          {Object.entries(activeFilters).map(([filterKey, value]) => {
            const filter = filters.find(f => f.key === filterKey)
            const option = filter?.options.find(o => o.value === value)
            
            return (
              <Badge 
                key={filterKey} 
                variant="secondary" 
                className="gap-1"
                data-testid={`badge-filter-${filterKey}`}
              >
                {filter?.label}: {option?.label}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => clearFilter(filterKey)}
                />
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}