# R.S International Freight Manager

## Overview

R.S International Freight Manager is a web-based enterprise solution for logistics operations, designed to manage import/export shipments, customs clearances, customer records, invoicing, and freight rate calculations. It replaces a legacy VB6 application, offering unified job referencing (starting at #26001) across Import Shipments, Export Shipments, and Custom Clearances. A key feature is the automatic generation of Custom Clearance jobs for Import Shipments marked "R.S To Clear", sharing the same job reference. The system supports multi-currency financial fields and maintains separate databases for different customer types. Visual clarity is enhanced by distinct color themes for each job type.

The application includes comprehensive file upload functionality integrated with Google Drive, featuring a shared document storage system (`job_file_groups` table). This system automatically syncs files between linked jobs (import/export shipments and their custom clearances) via their shared `jobRef`, ensuring seamless access to Documents and R.S Invoices.

Key features include:
- Dual-engine OCR system (Scribe.js for PDFs, Tesseract.js for images) for text extraction, with backend functionality intact.
- Multi-user internal messaging system with real-time unread counts, notifications, and file attachments.
- Job history display on customer contact cards, showing related shipments and clickable job references.
- Quick user access and real-time presence tracking, displaying online users and unread message indicators, with one-click messaging.
- Draggable, minimizable email composer with multi-draft support, `localStorage` persistence, and automatic status updates for specific email actions (e.g., `send-haulier-ead`, `send-pod-customer`).
- Specific email functionality for Custom Clearances, including "Send Haulier EAD" with automated document attachments and status updates.
- Dashboard with tabbed card interface featuring Container Management (spreadsheet-like display with conditional cell coloring based on job statuses), Nisbets, Import/Export Work, and Clearance Management tabs.

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

The frontend is built with React 18 and TypeScript, using Vite, Wouter for routing, TanStack Query for server state, and React Hook Form with Zod for validation. The UI utilizes Shadcn/ui (New York style, Radix UI primitives) and Tailwind CSS, supporting light/dark themes. The design emphasizes productivity with a professional blue color scheme, Inter font, and consistent spacing. State management uses React Query, React hooks, and localStorage.

### Backend Architecture

The backend uses Express.js and TypeScript on Node.js (ESM), providing a RESTful API under `/api`. Zod schemas ensure shared validation. PostgreSQL via Drizzle ORM (`DatabaseStorage`) handles persistent data. Data models include `importCustomers`, `exportCustomers`, `exportReceivers`, `hauliers`, `shippingLines`, `clearanceAgents`, `settings`, `importShipments`, `exportShipments`, `customClearances`, `jobFileGroups` (shared document storage), and `messages`. Automatic custom clearance job generation is integrated. Contact forms support multi-email fields. Fax fields have been removed. The `customClearances` table includes a `deliveryAddress` field.

**Key Design Decisions:**
- **Shared Document Storage:** `job_file_groups` table centralizes files by `jobRef`, automatically syncing documents across linked import/export shipments and custom clearances.
- **Export Shipments Enhancements:** Renamed "File Attachments" to "Transport Documents", added `expensesToChargeOut` and `additionalExpensesIn`, and implemented automatic bidirectional syncing of transport documents to linked custom clearances.
- **UI Improvements:** All customer/receiver dropdowns are alphabetically sorted.
- **Custom Clearance Status Indicators:** Simplified status indicator system with "To Do" (Yellow), "Completed" (Green), and an optional Red for "Issue, Check Notes?".
- **Status Naming Convention:** All custom clearance statuses use the "Awaiting" prefix for consistency (e.g., "Awaiting Entry", "Awaiting Arrival"). The system recognizes the following statuses: "Request CC", "Awaiting Entry", "Awaiting Arrival", "P.H Hold", "Customs Issue", "Fully Cleared".

### API Endpoints

The API provides RESTful endpoints for managing:
-   **Contacts**: Import Customers, Export Customers, Export Receivers, Hauliers, Shipping Lines, Clearance Agents (GET, POST, PATCH, DELETE, including job history for customers).
-   **Settings**: Financial settings (GET, POST, PATCH).
-   **Jobs**: Import Shipments, Export Shipments, Custom Clearances (GET, POST, PATCH, DELETE, with auto-clearance generation and file syncing).
-   **Job File Groups**: Shared document storage by `jobRef` (GET, PATCH for documents and RS invoices).
-   **Messages**: Internal messaging (GET for user messages and unread count, POST, PATCH for read status, DELETE).
-   **File Storage**: Direct file uploads to Google Drive, file downloads, and URL normalization.

### Navigation Routes

Key routes include `/` (Dashboard), `/job-journals`, `/import-shipments`, `/export-shipments`, `/custom-clearances`, `/contacts`, `/invoices`, and `/settings`.

## External Dependencies

-   **UI Component Libraries:** Radix UI primitives, Shadcn/ui, Lucide React, Embla Carousel.
-   **Form & Validation:** React Hook Form, Zod, @hookform/resolvers, Drizzle-Zod.
-   **Utility Libraries:** clsx, tailwind-merge, class-variance-authority, date-fns.
-   **File Upload & Storage:** Google Drive API (googleapis), Multer for multipart uploads (50MB limit).
-   **Container Tracking:** Terminal49 API integration with SCAC code mapping.
-   **OCR:** Scribe.js (PDFs), Tesseract.js (images).
-   **Email Signature System:** File-based HTML templates, logo image upload, dynamic placeholders, `localStorage` for per-user signature toggle.
-   **Development Tools:** TypeScript, Vite, esbuild, Multer.