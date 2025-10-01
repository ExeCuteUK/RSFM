# R.S International Freight Manager 4.0.1 alpha

## Overview

R.S International Freight Manager is a modern web-based freight management system designed to replace a legacy VB6 software. The application provides comprehensive tools for managing import/export shipments, customs clearances, customer records, invoicing operations, and freight rate calculations. Built with a focus on productivity and data clarity, it serves as an enterprise-grade solution for freight forwarding and logistics operations.

The system handles three main operational workflows:
- **Import Shipments**: Managing incoming shipments with customs clearance tracking and automatic clearance job creation
- **Export Shipments**: Handling outbound shipments with receiver and destination management
- **Custom Clearances**: Dedicated workflow for customs documentation and compliance (can be auto-generated or manually created)

## Key Features

### Job Reference System
- All jobs (Import Shipments, Export Shipments, Custom Clearances) share a unified job reference counter
- Job references start at **#26001** and auto-increment sequentially
- Import Shipments with "R.S To Clear" checked automatically generate a Custom Clearance job sharing the same jobRef

### Auto-Complete from Import Customers
When creating an Import Shipment and selecting an Import Customer, the form automatically populates:
- **R.S To Clear** checkbox (from customer's `rsProcessCustomsClearance` field)
- **Customs Clearance Agent** (from customer's `agentInDover` field)
- **Delivery Address** (from customer's `defaultDeliveryAddress` field)
- **Supplier Name** (from customer's `defaultSuppliersName` field)

### Automatic Custom Clearance Job Generation
- When creating an Import Shipment with **"R.S To Clear"** checkbox enabled
- The system automatically creates a linked Custom Clearance job
- Both jobs share the **same jobRef** (e.g., both are #26001)
- The Custom Clearance is linked via `createdFromType="import"` and `createdFromId`
- If "R.S To Clear" is unchecked, no Custom Clearance is auto-generated

### Multi-Currency Support
All financial fields support four currencies:
- **GBP** (British Pounds £) - Default
- **EUR** (Euro €)
- **USD** (US Dollars $)
- **TL** (Turkish Lira ₺)

### Three Customer Databases
The system maintains separate customer databases:
1. **Import Customers**: Companies importing goods into the country
   - Stores default agents, delivery addresses, and supplier information
   - Used for auto-completing Import Shipment forms
2. **Export Customers**: Companies exporting goods
3. **Export Receivers**: International companies receiving exported goods

### Visual Differentiation
Each job type has distinct visual theming for easy identification:
- **Import Shipments**: Blue theme with Package icon
- **Export Shipments**: Green theme with Truck icon  
- **Custom Clearances**: Purple theme with FileCheck icon

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- React Hook Form with Zod for form validation and schema validation

**UI Framework:**
- Shadcn/ui component library (New York style variant) with Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Support for light/dark theme switching with localStorage persistence
- Custom CSS variables for consistent color theming across modes

**Design System:**
- Productivity-focused design approach prioritizing information clarity
- Professional blue color scheme (220 85% 45%) with neutral backgrounds
- Inter font family for general UI, JetBrains Mono for data/code display
- Consistent spacing using Tailwind units (2, 4, 6, 8, 12, 16)
- Elevation system using transparent overlays for hover/active states

**State Management:**
- React Query for server state with infinite stale time and disabled refetching
- Local component state using React hooks
- Theme state persisted to localStorage
- Form state managed by React Hook Form

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript running on Node.js
- ESM module system for modern JavaScript features
- Custom middleware for request logging with response capture
- Development-only Vite middleware integration for HMR

**API Design:**
- RESTful API endpoints under `/api` prefix
- CRUD operations for all major entities (customers, shipments, clearances)
- Validation using Zod schemas shared between frontend and backend
- JSON request/response format with standard HTTP status codes

**Storage Layer:**
- Currently using **in-memory storage** (MemStorage) for development
- Implements the IStorage interface for all CRUD operations
- Shared jobRef counter maintained across all job types
- Auto-generation logic for Custom Clearance jobs when Import Shipments have rsToClear=true
- Future: Ready for PostgreSQL/Drizzle ORM integration

**Data Models:**
- `importCustomers`: Import customer records with agent information and default values
  - Fields: companyName, contactName, email, telephone, address, rsProcessCustomsClearance, agentInDover, defaultDeliveryAddress, defaultSuppliersName
- `exportCustomers`: Export customer records
  - Fields: companyName, contactName, email, telephone, address
- `exportReceivers`: Destination receiver records
  - Fields: companyName, contactPerson, email, telephone, address
- `importShipments`: Import shipment tracking and details
  - Fields: jobRef, importCustomerId, portOfArrival, importDateEtaPort, goodsDescription, rsToClear, customsClearanceAgent, deliveryAddress, supplierName, currency, freightCharge, etc.
- `exportShipments`: Export shipment management
  - Fields: jobRef, receiverId, loadDate, incoterms, description, exportClearanceAgent, arrivalClearanceAgent, currency, rates, etc.
- `customClearances`: Customs clearance documentation and workflow
  - Fields: jobRef, jobType (import/export), importCustomerId OR receiverId, portOfArrival, goodsDescription, transportCosts, currency, createdFromType, createdFromId, etc.

### API Endpoints

**Import Customers:**
- GET `/api/import-customers` - List all
- POST `/api/import-customers` - Create new
- PATCH `/api/import-customers/:id` - Update
- DELETE `/api/import-customers/:id` - Delete

**Export Customers:**
- GET `/api/export-customers` - List all
- POST `/api/export-customers` - Create new
- PATCH `/api/export-customers/:id` - Update
- DELETE `/api/export-customers/:id` - Delete

**Export Receivers:**
- GET `/api/export-receivers` - List all
- POST `/api/export-receivers` - Create new
- PATCH `/api/export-receivers/:id` - Update
- DELETE `/api/export-receivers/:id` - Delete

**Import Shipments:**
- GET `/api/import-shipments` - List all
- POST `/api/import-shipments` - Create new (auto-creates Custom Clearance if rsToClear=true)
- PATCH `/api/import-shipments/:id` - Update
- DELETE `/api/import-shipments/:id` - Delete

**Export Shipments:**
- GET `/api/export-shipments` - List all
- POST `/api/export-shipments` - Create new
- PATCH `/api/export-shipments/:id` - Update
- DELETE `/api/export-shipments/:id` - Delete

**Custom Clearances:**
- GET `/api/custom-clearances` - List all
- POST `/api/custom-clearances` - Create new
- PATCH `/api/custom-clearances/:id` - Update
- DELETE `/api/custom-clearances/:id` - Delete

### Navigation Routes

**Main Pages:**
- `/` - Dashboard (overview and quick actions)
- `/import-shipments` - Import Shipments management (blue theme)
- `/export-shipments` - Export Shipments management (green theme)
- `/custom-clearances` - Custom Clearances management (purple theme)
- `/customers` - Customer management (tabs for Import, Export, Receivers)
- `/invoices` - Invoice generation and management
- `/rates` - Freight rate calculator
- `/tracking` - Shipment tracking (coming soon)
- `/notifications` - System notifications (coming soon)
- `/settings` - Application settings (coming soon)

### External Dependencies

**UI Component Libraries:**
- Radix UI primitives for accessible, unstyled components
- Shadcn/ui components built on top of Radix
- Lucide React for consistent iconography
- Embla Carousel for carousel functionality

**Form & Validation:**
- React Hook Form for performant form handling
- Zod for runtime schema validation
- @hookform/resolvers for Zod integration
- Drizzle-Zod for generating Zod schemas from database schemas

**Utility Libraries:**
- clsx and tailwind-merge (via cn utility) for className management
- class-variance-authority for component variant management
- date-fns for date manipulation and formatting

**Development Tools:**
- Replit-specific plugins for development (cartographer, dev-banner, runtime-error-modal)
- TypeScript with strict mode enabled
- Path aliases configured (@/, @shared/, @assets/)

**Build & Deployment:**
- Vite for frontend bundling
- esbuild for backend bundling (ESM format, external packages)
- Production build outputs to `dist/` directory
- Static assets served from `dist/public/`

## Recent Changes

### 2025-10-01: Complete Job Management System Implementation
- ✅ Implemented database schemas for three job types (Import Shipments, Export Shipments, Custom Clearances)
- ✅ Created shared jobRef counter system starting at #26001
- ✅ Built storage layer with CRUD operations for all job types
- ✅ Implemented automatic Custom Clearance job generation when Import Shipment has "R.S To Clear" checked
- ✅ Created three form components with auto-complete functionality from customer data
- ✅ Built three page components with visual differentiation (blue/green/purple themes)
- ✅ Updated navigation with separate routes for each job type
- ✅ Changed application name to "R.S International Freight Manager 4.0.1 alpha"
- ✅ Comprehensive end-to-end testing confirms all features working correctly

### Test Results (2025-10-01)
All features verified working correctly:
- Import customer creation and auto-complete to Import Shipment forms
- Auto-generation of Custom Clearance jobs (same jobRef) when "R.S To Clear" is checked
- No auto-generation when "R.S To Clear" is unchecked
- Job reference counter sequencing (26001, 26002, 26003, 26004)
- Export customer/receiver creation and Export Shipment creation
- Manual Custom Clearance creation for both import and export job types
- Currency dropdown with all four options (GBP, EUR, USD, TL)
- Visual differentiation with color themes and icons

## Project Architecture

### File Structure
```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Shadcn components
│   │   │   ├── import-customer-form.tsx
│   │   │   ├── export-customer-form.tsx
│   │   │   ├── export-receiver-form.tsx
│   │   │   ├── import-shipment-form.tsx
│   │   │   ├── export-shipment-form.tsx
│   │   │   ├── custom-clearance-form.tsx
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── theme-provider.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── pages/
│   │   │   ├── dashboard.tsx
│   │   │   ├── import-shipments.tsx
│   │   │   ├── export-shipments.tsx
│   │   │   ├── custom-clearances.tsx
│   │   │   ├── customers.tsx
│   │   │   ├── invoices.tsx
│   │   │   ├── rates.tsx
│   │   │   └── not-found.tsx
│   │   ├── lib/
│   │   │   └── queryClient.ts   # React Query setup
│   │   ├── App.tsx              # Main app with routing
│   │   └── index.css            # Global styles
├── server/
│   ├── storage.ts               # Storage interface and MemStorage
│   ├── routes.ts                # API endpoints
│   ├── vite.ts                  # Vite middleware
│   └── index.ts                 # Express server
├── shared/
│   └── schema.ts                # Shared types and Zod schemas
└── replit.md                    # This file
```

## Next Steps / Future Enhancements

### Immediate Priorities
- Remove or update legacy `/shipments` route if no longer needed
- Add error handling with onError callbacks in mutations
- Add confirmation dialogs for delete operations
- Show loading states during mutations (isPending)

### Future Features
- Invoice generation system
- Freight rate calculator integration
- Shipment tracking functionality
- Notification system
- User settings and preferences
- Report generation and analytics
- Migration from in-memory storage to PostgreSQL/Drizzle ORM
- Multi-user authentication and authorization
- Audit logging for compliance

## Technical Notes

### Development Workflow
- Run `npm run dev` to start both frontend and backend servers
- Frontend available at `http://localhost:5000`
- API endpoints at `http://localhost:5000/api`
- Hot module replacement (HMR) enabled for rapid development

### Testing
- Comprehensive Playwright-based end-to-end tests verify all workflows
- Test coverage includes CRUD operations, auto-complete, auto-generation, and visual themes
- All tests passing as of 2025-10-01

### Data Persistence
- Currently using in-memory storage (data resets on server restart)
- Production deployment will require PostgreSQL database connection
- Schema is ready for Drizzle ORM integration when needed
