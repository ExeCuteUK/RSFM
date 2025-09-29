# Freight Management Suite Design Guidelines

## Design Approach
**Selected Approach:** Design System - Productivity-Focused
**Justification:** As a data-heavy enterprise application replacing legacy VB6 software, this requires maximum efficiency, learnability, and consistency. Drawing inspiration from modern productivity tools like Linear, Notion, and enterprise dashboards.

**Key Design Principles:**
- Information clarity over visual flair
- Consistent, predictable interactions
- Efficient data entry and navigation
- Professional, trustworthy appearance

## Core Design Elements

### Color Palette
**Light Mode:**
- Primary: 220 85% 45% (Professional blue)
- Background: 0 0% 98% (Near white)
- Surface: 0 0% 100% (Pure white)
- Border: 220 13% 91% (Light gray)
- Text Primary: 220 9% 25% (Dark gray)
- Text Secondary: 220 9% 46% (Medium gray)

**Dark Mode:**
- Primary: 220 85% 55% (Lighter blue for contrast)
- Background: 220 13% 9% (Very dark blue-gray)
- Surface: 220 13% 12% (Dark surface)
- Border: 220 13% 18% (Dark border)
- Text Primary: 220 9% 95% (Near white)
- Text Secondary: 220 9% 70% (Light gray)

**Status Colors:**
- Success: 142 71% 45% (Green)
- Warning: 38 92% 50% (Orange)
- Error: 0 72% 51% (Red)
- Info: 217 91% 60% (Blue)

### Typography
**Primary Font:** Inter (Google Fonts)
- Headers: 600-700 weight, sizes 24px-32px
- Body: 400-500 weight, 14px-16px
- Small text: 400 weight, 12px-14px
- Code/Data: JetBrains Mono, 400 weight

### Layout System
**Spacing Units:** Consistently use Tailwind units: 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section margins: mb-8, mt-12
- Element gaps: gap-4, gap-6
- Container max-width: max-w-7xl

### Component Library

**Navigation:**
- Sidebar navigation with collapsible sections
- Breadcrumb trails for deep navigation
- Tab navigation for related views
- Search bar prominently placed

**Data Display:**
- Clean tables with alternating row colors
- Cards for shipment/customer summaries
- Status badges with color coding
- Progress indicators for shipment tracking
- KPI cards for dashboard metrics

**Forms:**
- Single-column layouts for complex forms
- Grouped related fields
- Clear field labels and validation states
- Multi-step forms for shipment creation

**Actions:**
- Primary actions: filled buttons with primary color
- Secondary actions: outline buttons
- Destructive actions: red outline buttons
- Icon buttons for compact spaces

**Data Visualization:**
- Simple bar charts for delivery metrics
- Timeline view for shipment tracking
- Map integration placeholder for route visualization
- Calendar view for scheduling

### Specific Application Features

**Dashboard Layout:**
- Header with company branding and user menu
- Sidebar with main navigation sections
- Main content area with widgets/cards
- Status overview cards showing active shipments, pending deliveries

**Shipment Management:**
- List view with sortable columns (ID, Customer, Status, Date)
- Detailed shipment cards with progress tracking
- Modal dialogs for quick actions
- Inline editing capabilities

**Customer Management:**
- Contact cards with shipping history
- Tabbed interface for details/history/documents
- Quick search and filtering options

**Invoice/Billing:**
- Clean invoice layouts optimized for printing
- PDF export styling considerations
- Payment status indicators

### Responsive Behavior
- Desktop-first approach with mobile adaptations
- Collapsible sidebar on tablet/mobile
- Stack cards vertically on smaller screens
- Touch-friendly button sizes (44px minimum)

### Animations
- Minimal, purposeful transitions (200-300ms)
- Loading states for data fetching
- Smooth sidebar collapse/expand
- Subtle hover states on interactive elements

This design system prioritizes operational efficiency while maintaining a modern, professional appearance suitable for daily business use.