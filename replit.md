# R.S International Freight Manager 4.0.1 alpha

## Overview

R.S International Freight Manager is a web-based freight management system designed to replace a legacy VB6 application. Its primary purpose is to manage import/export shipments, customs clearances, customer records, invoicing, and freight rate calculations, providing an enterprise-grade solution for logistics operations. The system handles three core workflows: Import Shipments, Export Shipments, and Custom Clearances, all sharing a unified job reference system starting at #26001. A key feature is the automatic generation of Custom Clearance jobs when an Import Shipment is marked "R.S To Clear", sharing the same job reference. The system also supports multi-currency financial fields and maintains separate databases for Import Customers, Export Customers, and Export Receivers. Each job type is visually differentiated with distinct color themes for clarity.

The application now includes comprehensive file upload functionality integrated with Replit's App Storage (object storage), allowing users to attach files to shipments and custom clearances. Files are stored persistently and can be downloaded directly from the system.

## User Preferences

Preferred communication style: Simple, everyday language.

**Data Import Format:**
- Address fields should be formatted with line breaks (newlines) between components for better readability in textareas
- Example format: "Moreley Way,\nPeterborough,\nPE2 9JJ" instead of "Moreley Way, Peterborough, PE2 9JJ"

**Database Population:**
- Import Customers: 1,424 records imported via `scripts/import-all-to-import-customers.ts`
  - Field mapping: 0-11 Contact Info, 12-22 Agent Info, 23-31 Import Information
  - VAT Payment Method logic: Field 24=1 → Customer Deferment (170), Field 25=1 → PVA (106), neither → R.S Deferment (1,148)
  - Multi-value fields: contactName and agentContactName (split by /), email and agentEmail (split by ,)
- Export Customers: 2,007 records imported via `scripts/import-export-customers.ts`  
- Export Receivers: 2,147 records imported via `scripts/import-export-receivers.ts`
- All imports use ##! delimiter and combine address fields with line breaks for readability

**Database Backups:**
- Contact databases are backed up in the `backups/` directory
- Backup includes: import_customers, export_customers, export_receivers, hauliers, shipping_lines, clearance_agents
- Run backup: `tsx scripts/backup-contact-databases.ts`
- Run restore: `tsx scripts/restore-contact-databases.ts`
- Backup files are SQL INSERT statements ready for production rollout

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite for development and Wouter for routing. TanStack Query manages server state and caching, while React Hook Form with Zod handles form validation. The UI leverages the Shadcn/ui component library (New York style) based on Radix UI primitives and styled with Tailwind CSS, supporting light/dark themes. The design prioritizes productivity and clarity, using a professional blue color scheme, the Inter font family, and a consistent spacing and elevation system. State management relies on React Query for server state, React hooks for local component state, and localStorage for theme persistence.

### Backend Architecture

The backend is developed with Express.js and TypeScript on Node.js, utilizing an ESM module system. It provides a RESTful API under the `/api` prefix for CRUD operations on all major entities. Zod schemas are shared between frontend and backend for validation. The storage layer uses PostgreSQL via Drizzle ORM (`DatabaseStorage`) for permanent data persistence. The system includes data models for `importCustomers`, `exportCustomers`, `exportReceivers`, `hauliers`, `shippingLines`, `clearanceAgents`, `settings`, `importShipments`, `exportShipments`, and `customClearances`, with automatic custom clearance job generation logic. All contact forms support multi-email functionality using array fields for `email`, `agentEmail`, and `accountsEmail` (Import/Export Customers only). Fax fields have been completely removed from the system. The `customClearances` table now includes a `deliveryAddress` field for better destination tracking in job journals.

**Export Receivers Database:** Uses a simplified structure with combined address field (multiline) and separate country field. Email field has been removed from this entity.

### API Endpoints

The API provides standard RESTful endpoints for managing:
-   **Import Customers**: GET, POST, PATCH, DELETE `/api/import-customers`
-   **Export Customers**: GET, POST, PATCH, DELETE `/api/export-customers`
-   **Export Receivers**: GET, POST, PATCH, DELETE `/api/export-receivers`
-   **Hauliers**: GET, POST, PATCH, DELETE `/api/hauliers`
-   **Shipping Lines**: GET, POST, PATCH, DELETE `/api/shipping-lines`
-   **Clearance Agents**: GET, POST, PATCH, DELETE `/api/clearance-agents`
-   **Settings**: GET, POST, PATCH `/api/settings` (single record for financial settings)
-   **Import Shipments**: GET, POST, PATCH, DELETE `/api/import-shipments` (auto-creates Custom Clearance if `rsToClear=true`)
-   **Export Shipments**: GET, POST, PATCH, DELETE `/api/export-shipments`
-   **Custom Clearances**: GET, POST, PATCH, DELETE `/api/custom-clearances`
-   **File Storage**: POST `/api/objects/upload` (get presigned upload URL), GET `/objects/:objectPath` (download files), POST `/api/objects/normalize` (normalize uploaded file URLs)

### Navigation Routes

Key routes include:
-   `/` (Dashboard)
-   `/job-journals` (Financial tracking for all jobs)
-   `/import-shipments`
-   `/export-shipments`
-   `/custom-clearances`
-   `/contacts` (Import Customers, Export Customers, Export Receivers, Hauliers, Shipping Lines, Clearance Agents)
-   `/invoices`
-   `/settings` (Financial & Charges configuration)

## External Dependencies

**UI Component Libraries:**
-   Radix UI primitives
-   Shadcn/ui
-   Lucide React (icons)
-   Embla Carousel

**Form & Validation:**
-   React Hook Form
-   Zod
-   @hookform/resolvers
-   Drizzle-Zod

**Utility Libraries:**
-   clsx, tailwind-merge, class-variance-authority (for CSS utilities)
-   date-fns (for date manipulation)

**File Upload & Storage:**
-   Uppy (core, react, dashboard, aws-s3)
-   @google-cloud/storage

**Development Tools:**
-   TypeScript
-   Vite (frontend bundling)
-   esbuild (backend bundling)