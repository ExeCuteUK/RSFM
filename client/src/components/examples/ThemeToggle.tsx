import { ThemeProvider } from "../theme-provider"
import { ThemeToggle } from "../theme-toggle"

export default function ThemeToggleExample() {
  return (
    <ThemeProvider>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <span>Theme toggle:</span>
          <ThemeToggle />
        </div>
      </div>
    </ThemeProvider>
  )
}