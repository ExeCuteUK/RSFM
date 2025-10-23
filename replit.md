# R.S International Freight Manager

## Overview

R.S International Freight Manager is a web-based enterprise solution designed to streamline logistics operations for import/export shipments, customs clearances, customer management, invoicing, and freight rate calculations. It serves as a modern replacement for a legacy VB6 application, offering unified job referencing across various job types. The system uniquely generates Custom Clearance jobs automatically for Import Shipments marked "R.S To Clear," sharing the same job reference for seamless integration. It supports multi-currency financial transactions and employs distinct color themes for visual clarity across job types.

Key features include an integrated file upload system with Google Drive for shared document storage, ensuring automatic syncing of files between linked jobs. The application also boasts a dual-engine OCR for text extraction, a multi-user internal messaging system with real-time notifications, customer contact history, real-time user presence, and a draggable email composer. A team calendar powered by the Google Calendar API manages holidays and leave. The dashboard provides a tabbed interface for container, Nisbets, import/export, and clearance management. A notable feature is the Container Tracking Comparison System, which asynchronously checks Terminal49 data, providing dashboard notifications for discrepancies (ETA, port, vessel changes) and offering detailed views with one-click updates.

## Recent Changes

**October 23, 2025 - Form Layout & Field Updates:**
- **Import & Export Shipment Forms - Quotation/Rate Information Card:**
  - Rate Out section: 3-column grid with Expenses To Charge Out at full width (col-span-3)
  - Rate In section: **3-column grid (md:grid-cols-3)** with 3 rate fields at 33.33% width each
  - **Rate Currency field hidden** - no longer displayed on either form
  - Renamed "Haulier Freight Rate In" → "Freight Rate In" on both forms
  - Additional Expenses In: col-span-3 (full width)
- **Export Form:**
  - Swapped field order in Rate In section: "Export CC Charge In" now appears before "Destination CC In"
  - Renamed "Destination Clearance Cost In" → "Destination CC In"
- **Import Form - Customs Clearance Section:**
  - "Customs Clearance Agent" text field permanently hidden
  - "Clearance Agent" dropdown and "Clearance Type" dropdown now on same line at 50% width each (2-column grid)
  - Field order: Clearance Agent first, then Clearance Type

**October 23, 2025 - Truck Journals & Management Sheets UI Improvements:**
- **Truck Journals:** Removed underlines from totals footer row, made totals row half-width with left alignment, added zebra striping for better readability, refined header and data row borders (border-b-2 for headers, border-b for data rows)
- **Truck Journals Filter Layout:** Swapped filter layout - "Currently Viewing" date label moved to left side, filter controls (Month/Year or Date Range inputs) to right side, added date label display in range mode, centered "Currently Viewing" text
- **Chronological Sorting:** Journal entries now sort chronologically (earliest to latest) when displaying "All Time" (no date filters applied)
- **Management Sheets:** Removed search text persistence - search bar starts empty on each page visit
- **Import Containers Filter:** Filtered out LCL containers from Import Containers management sheet (already shown in Import & Export Work sheet)
- **Import/Export Work Sheet - Quote Out / Net In Column:** Changed dividing line from grey to black for better contrast, added display of expensesToChargeOut and additionalExpensesIn amounts on separate lines when present (format: "Additional : £amount1, £amount2"), updated labels: "OUT:" / "IN:" (formerly "Quote:" / "Net:"), "Imp CC" (formerly "Dest CC")

## User Preferences

Preferred communication style: Simple, everyday language.

**Data Import Format:**
- Address fields should be formatted with line breaks (newlines) between components for better readability in textareas
- Example format: "Moreley Way,\nPeterborough,\nPE2 9JJ" instead of "Moreley Way, Peterborough, PE2 9JJ"

**Database Population:**
- All imports use ##! delimiter and combine address fields with line breaks for readability

**Numbering System:**
- Job references (Import/Export Shipments, Custom Clearances, General References) start at **48000**
- Invoice numbers start at **21001**

**Database Backups:**
- All backups are stored in **Google Drive** at: `RS Freight Manager/Backups/`
- RS Freight Manager folder is at **Google Drive root** (not nested in personal folders)
- Backup format: ZIP archives containing SQL INSERT statements for all database tables plus email signature assets
- **Column Name Format:** All backups use snake_case column names (e.g., `vat_number`, not `vatNumber`)
- **Array Syntax:** All backups use properly typed arrays: `'[]'::jsonb` for jsonb columns, `ARRAY[]::text[]` for text array columns
- **Special Characters:** Newlines, tabs, and special characters escaped with PostgreSQL E'' syntax
- **UI Cards Standardization:** All display cards use consistent `bg-card` styling (white in light mode, grey in dark mode) across contacts and job pages

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite, Wouter for routing, TanStack Query for server state, and React Hook Form with Zod for validation. UI components are based on Shadcn/ui (New York style, Radix UI primitives) and Tailwind CSS, supporting light/dark themes. The design emphasizes productivity with a professional blue color scheme and Inter font. State management uses React Query with IndexedDB persistence, React hooks, and localStorage. Performance is optimized with IndexedDB caching, smart email loading (metadata-first, full content on demand), and optimized infinite scroll. UX enhancements include consistent styling, improved email composer functionality, and automated timezone handling for calendar events. Critical bug fixes and UI improvements are regularly implemented, including an advanced Invoice Matching Assistant with ETA date matching, a scoring system, and support for table-formatted invoices (ZIM-style) where amounts appear before labels.

### Backend Architecture

The backend uses Express.js and TypeScript on Node.js (ESM), providing a RESTful API. Zod schemas ensure shared validation. PostgreSQL via Drizzle ORM (`DatabaseStorage`) manages persistent data. Data models encompass various entities like customers, shipments, clearances, and shared document storage. Key design decisions include a centralized `job_file_groups` table for document syncing, enhanced export shipment and custom clearance forms with auto-calculation and database-driven selections, and automated custom clearance job generation. Email templates for clearances are dynamic, utilizing data directly from records for accurate and conditional content delivery.

### API Endpoints

The API provides RESTful endpoints for managing contacts, settings, jobs, job file groups, messages, and file storage.

### Navigation Routes

Key application routes include Dashboard, Job Journals, Import/Export Shipments, Custom Clearances, Contacts, Invoices, Team Calendar, Messages, Backups, and Settings.

## External Dependencies

-   **UI Component Libraries:** Radix UI primitives, Shadcn/ui, Lucide React, Embla Carousel.
-   **Form & Validation:** React Hook Form, Zod, @hookform/resolvers, Drizzle-Zod.
-   **Utility Libraries:** clsx, tailwind-merge, class-variance-authority, date-fns.
-   **File Upload & Storage:** Google Drive API (googleapis), Multer.
-   **Container Tracking:** Terminal49 API.
-   **OCR:** Scribe.js (PDFs), Tesseract.js (images).
-   **Email & Calendar:** Gmail API, Google Calendar API (shared OAuth credentials).
-   **Email Signature System:** File-based HTML templates, logo image upload, dynamic placeholders.