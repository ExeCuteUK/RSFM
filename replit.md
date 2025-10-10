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
- All backups are stored in **Google Drive** at: `RS Freight Manager/Backups/`
- RS Freight Manager folder is at **Google Drive root** (not nested in personal folders)
- Backup format: ZIP archives containing SQL INSERT statements for all database tables plus email signature assets
- Backup includes: import_customers, export_customers, export_receivers, hauliers, shipping_lines, clearance_agents, import_shipments, export_shipments, custom_clearances, job_file_groups, messages, purchase_invoices, invoices, general_references, settings, users, **email signature files** (signature-template.html, rs-logo.jpg)
- Run backup: `tsx scripts/backup-contact-databases.ts` (creates zip with database + signature files, uploads to Google Drive, cleans up local files)
- Restore: Download from Google Drive → extract → restore via `scripts/restore-contact-databases.ts` (restores both database tables and signature files to attached_assets)
- Cleanup old backups: `tsx scripts/cleanup-old-backups.ts` (keeps only most recent, deletes older backups)
- **Column Name Format:** All backups use snake_case column names (e.g., `vat_number`, not `vatNumber`)
- **Array Syntax:** All backups use properly typed arrays: `'[]'::jsonb` for jsonb columns, `ARRAY[]::text[]` for text array columns
- **Special Characters:** Newlines, tabs, and special characters escaped with PostgreSQL E'' syntax
- **Current Status:** Fresh backup created (2025-10-10) with all 5,603 contact records properly formatted. Old legacy backups removed from Google Drive.
- **UI Cards Standardization:** All display cards use consistent `bg-card` styling (white in light mode, grey in dark mode) across contacts and job pages

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite, Wouter for routing, TanStack Query for server state, and React Hook Form with Zod for validation. The UI utilizes Shadcn/ui (New York style, Radix UI primitives) and Tailwind CSS, supporting light/dark themes. The design emphasizes productivity with a professional blue color scheme, Inter font, and consistent spacing. State management uses React Query, React hooks, and localStorage.

**Site Branding:**
- Page Title: "R.S Freight Manager - Freight Management Suite"
- Open Graph Metadata: "R.S Freight Manager - Freight Management Suite"
- Login Page: Features subtle minimalist world map background with 75% transparent login card

### Backend Architecture

The backend uses Express.js and TypeScript on Node.js (ESM), providing a RESTful API under `/api`. Zod schemas ensure shared validation. PostgreSQL via Drizzle ORM (`DatabaseStorage`) handles persistent data. Data models include `importCustomers`, `exportCustomers`, `exportReceivers`, `hauliers`, `shippingLines`, `clearanceAgents`, `settings`, `importShipments`, `exportShipments`, `customClearances`, `jobFileGroups` (shared document storage), and `messages`. Automatic custom clearance job generation is integrated. Contact forms support multi-email fields. Fax fields have been removed. The `customClearances` table includes a `deliveryAddress` field.

**Key Design Decisions:**
- **Shared Document Storage:** `job_file_groups` table centralizes files by `jobRef`, automatically syncing documents across linked import/export shipments and custom clearances.
- **Export Shipments Enhancements:** Renamed "File Attachments" to "Transport Documents", added `expensesToChargeOut` and `additionalExpensesIn`, and implemented automatic bidirectional syncing of transport documents to linked custom clearances.
- **Custom Clearance Form Enhancements:** Dedicated "Charges Out" card with clearanceCharge (defaulted from settings), totalCommodityCodes, conditional costPerAdditionalHsCode field (visible only when totalCommodityCodes > 1), and dynamic expenses list. Dedicated "Haulier" card with haulier dropdown (from database), contact name, and email fields. Automatic expense calculation: "Deferment Usage Fee" auto-added for R.S Deferment customers; "Additional Commodity Codes used in clearance" auto-calculated as (totalCommodityCodes - 1) * costPerAdditionalHsCode when applicable.
- **Custom Clearance Invoice Auto-Population:** Invoice forms support clearance jobType, automatically populating customer information, shipment details, and line items (clearanceCharge as "Import/Export Customs Clearance" + expensesToChargeOut items) from clearance records.
- **Custom Clearance Email Templates:** All clearance emails use data directly from clearance records (not linked shipments):
  - **Send Invoice/Credit to Customer:** Custom body with conditional "& entry" text (hidden if no clearance documents), smart recipient priority (Agent Accounts Email → Customer Accounts Email → Agent Email → Customer Email), attaches invoice PDFs + clearance documents, includes customer reference in subject line.
  - **Send Haulier GVMS:** Pre-populates TO field with haulier email from clearance, addresses body to haulier contact name, includes haulier reference in subject line, attaches both transport documents AND clearance documents.
  - **Send Customer GVMS:** Uses same recipient priority as invoices, addresses body to customer contact name, includes customer reference in subject line, attaches clearance documents.
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