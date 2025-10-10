# R.S International Freight Manager

## Overview

R.S International Freight Manager is a web-based enterprise solution for logistics operations, designed to manage import/export shipments, customs clearances, customer records, invoicing, and freight rate calculations. It replaces a legacy VB6 application, offering unified job referencing across Import Shipments, Export Shipments, and Custom Clearances. A key feature is the automatic generation of Custom Clearance jobs for Import Shipments marked "R.S To Clear", sharing the same job reference. The system supports multi-currency financial fields, maintains separate databases for different customer types, and uses distinct color themes for each job type for visual clarity.

The application includes comprehensive file upload functionality integrated with Google Drive, featuring a shared document storage system that automatically syncs files between linked jobs (import/export shipments and their custom clearances) via their shared `jobRef`, ensuring seamless access to documents and invoices. Key capabilities include a dual-engine OCR system for text extraction, a multi-user internal messaging system with real-time notifications, job history display on customer contact cards, quick user access with real-time presence tracking, and a draggable, minimizable email composer with multi-draft support. The dashboard features a tabbed interface for container management, Nisbets, import/export work, and clearance management.

## User Preferences

Preferred communication style: Simple, everyday language.

**Data Import Format:**
- Address fields should be formatted with line breaks (newlines) between components for better readability in textareas
- Example format: "Moreley Way,\nPeterborough,\nPE2 9JJ" instead of "Moreley Way, Peterborough, PE2 9JJ"

**Database Population:**
- All imports use ##! delimiter and combine address fields with line breaks for readability

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

The frontend is built with React 18 and TypeScript, utilizing Vite, Wouter for routing, TanStack Query for server state, and React Hook Form with Zod for validation. The UI employs Shadcn/ui (New York style, Radix UI primitives) and Tailwind CSS, supporting light/dark themes. The design prioritizes productivity with a professional blue color scheme, Inter font, and consistent spacing. State management leverages React Query, React hooks, and localStorage. The site branding includes "R.S Freight Manager - Freight Management Suite" for page title and Open Graph metadata, with a subtle minimalist world map background on the login page.

### Backend Architecture

The backend uses Express.js and TypeScript on Node.js (ESM), providing a RESTful API under `/api`. Zod schemas ensure shared validation. PostgreSQL via Drizzle ORM (`DatabaseStorage`) handles persistent data. Data models include various customer types, hauliers, shipping lines, clearance agents, settings, import/export shipments, custom clearances, job file groups (shared document storage), and messages. Automatic custom clearance job generation is integrated, and contact forms support multi-email fields.

**Key Design Decisions:**
- **Shared Document Storage:** `job_file_groups` table centralizes files by `jobRef`, automatically syncing documents across linked jobs.
- **Export Shipments Enhancements:** Renamed "File Attachments" to "Transport Documents" and implemented automatic bidirectional syncing to linked custom clearances.
- **Custom Clearance Form Enhancements:** Includes a dedicated "Charges Out" card with dynamic expense calculation and a "Haulier" card with database-driven selections. Auto-calculation for "Deferment Usage Fee" and "Additional Commodity Codes" is implemented.
- **Custom Clearance Invoice Auto-Population:** Invoice forms for clearance jobs automatically populate customer information, shipment details, and line items from clearance records.
- **Custom Clearance Email Templates:** All clearance emails use data directly from clearance records, featuring smart recipient priority, conditional text, and automatic document attachments (invoices, clearance documents, transport documents).
- **UI Improvements:** All customer/receiver dropdowns are alphabetically sorted.
- **Custom Clearance Status Indicators:** Simplified status indicator system with "To Do" (Yellow), "Completed" (Green), and an optional Red for "Issue, Check Notes?". All custom clearance statuses use the "Awaiting" prefix (e.g., "Awaiting Entry", "Awaiting Arrival").

### API Endpoints

The API provides RESTful endpoints for managing contacts (customers, hauliers, shipping lines, clearance agents), settings, jobs (import/export shipments, custom clearances), job file groups, messages, and file storage (uploads/downloads).

### Navigation Routes

Key routes include `/` (Dashboard), `/job-journals`, `/import-shipments`, `/export-shipments`, `/custom-clearances`, `/contacts`, `/invoices`, and `/settings`.

## External Dependencies

-   **UI Component Libraries:** Radix UI primitives, Shadcn/ui, Lucide React, Embla Carousel.
-   **Form & Validation:** React Hook Form, Zod, @hookform/resolvers, Drizzle-Zod.
-   **Utility Libraries:** clsx, tailwind-merge, class-variance-authority, date-fns.
-   **File Upload & Storage:** Google Drive API (googleapis), Multer.
-   **Container Tracking:** Terminal49 API.
-   **OCR:** Scribe.js (PDFs), Tesseract.js (images).
-   **Email Signature System:** File-based HTML templates, logo image upload, dynamic placeholders.