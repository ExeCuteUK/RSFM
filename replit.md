# R.S International Freight Manager

## Overview

R.S International Freight Manager is a web-based enterprise solution for logistics operations, designed to manage import/export shipments, customs clearances, customer records, invoicing, and freight rate calculations. It replaces a legacy VB6 application, offering unified job referencing across Import Shipments, Export Shipments, and Custom Clearances. A key feature is the automatic generation of Custom Clearance jobs for Import Shipments marked "R.S To Clear", sharing the same job reference. The system supports multi-currency financial fields, maintains separate databases for different customer types, and uses distinct color themes for each job type for visual clarity.

The application includes comprehensive file upload functionality integrated with Google Drive, featuring a shared document storage system that automatically syncs files between linked jobs (import/export shipments and their custom clearances) via their shared `jobRef`, ensuring seamless access to documents and invoices. Key capabilities include a dual-engine OCR system for text extraction, a multi-user internal messaging system with real-time notifications, job history display on customer contact cards, quick user access with real-time presence tracking, a draggable, minimizable email composer with multi-draft support, and a team calendar powered by Google Calendar API for managing holidays and annual leave (includes UK public holidays integration). The dashboard features a tabbed interface for container management, Nisbets, import/export work, and clearance management.

**Container Tracking Comparison System:**
- **Dashboard Notification:** Async background check on page load compares all container shipments against Terminal49 tracking data; displays friendly English summary of discrepancies (ETA changes, port changes, vessel updates, dispatch/delivery dates)
- **Smart Dismissal Logic:** "All good" notifications dismissed for the day; issue notifications re-show if problems persist or change
- **Import Shipments Page:** "Check Current Containers" button provides detailed view of all tracked containers with discrepancy highlighting in red; one-click update buttons sync job data with live tracking information
- **JSON:API Parsing:** Properly hydrates container data from Terminal49's `included` array via relationships for accurate matching
- **Port Validation:** Flags port discrepancies when job has incorrect/missing port data even if Terminal49 tracking hasn't returned port info yet
- **Consolidated UI:** Delivery timing embedded in ETA card as bold note; dispatch dates displayed on single line with separator
- **Comprehensive Tracking:** Compares ETA, Port of Arrival, Vessel Name, Dispatch Date, and Delivery Date (with weekend day counting)

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

The frontend is built with React 18 and TypeScript, utilizing Vite, Wouter for routing, TanStack Query for server state, and React Hook Form with Zod for validation. The UI employs Shadcn/ui (New York style, Radix UI primitives) and Tailwind CSS, supporting light/dark themes. The design prioritizes productivity with a professional blue color scheme, Inter font, and consistent spacing. State management leverages React Query with IndexedDB persistence (1-hour cache via idb-keyval), React hooks, and localStorage. The site branding includes "R.S Freight Manager - Freight Management Suite" for page title and Open Graph metadata, with a subtle minimalist world map background on the login page.

**Performance Optimizations:**
- **IndexedDB Persistence:** TanStack Query cache persisted to IndexedDB (1-hour retention) for instant page loads on return visits
- **Smart Email Cache:** Check Mail appends new emails while preserving pagination; mutations instantly update cache without refetch
- **Optimized Infinite Scroll:** 60% threshold (reduced from 80%) with Gmail API batch size of 100 for smoother loading
- **Inline Image Support:** GET endpoint for Gmail attachments enables inline image rendering in received emails
- **Two-Stage Email Loading:** Email list uses metadata format (headers only) for fast initial load; full email content (body + attachments) loads on demand when user selects an email
- **31-Day Email Window:** Initial email fetch loads last 31 days of emails for optimal performance and relevance

**UX & Accessibility Fixes:**
- **Login Page:** Forced light theme with explicit dark mode overrides (bg-white dark:bg-white, text-black dark:text-black) for optimal readability regardless of system theme
- **Email Reader:** White background enforced in dark mode (bg-white dark:bg-white) to ensure email content with inline styles remains readable
- **Email Composer:** Signature loading improved with query always enabled and conditional application; arrow key events (ArrowUp/ArrowDown) stopped from propagating to background email list
- **Calendar Events:** Timezone (Europe/London) automatically added to timed events (create/update) to prevent server-side timezone errors
- **Version:** Updated to 4.2.5 Beta
  - **Eric's Personality:** Container tracking notifications now feature randomized greetings (sometimes addressing the user by first name) and varied sign-off messages for a more natural experience
  - **Performance Optimization:** Container tracking excludes delivered/completed jobs from Terminal49 API checks, reducing unnecessary API calls
  - **Smart SCAC Matching:** Shipping line lookup now uses intelligent partial matching to handle name variations (e.g., "CMA CGM (UK) Shipping" correctly maps to CMDU SCAC code)
  - **Auto-Refresh Notifications:** Container tracking notifications automatically update/disappear after field updates via cache invalidation
  - **Handover Job Display:** Dashboard container table shows green "N/A" for delivery date and "Handover" for references when handover at port is enabled
  - **Import Status Improvements:** "Book Delivery" and "Send POD" status lines automatically hidden when handover is enabled; renamed "Send Customs Arrival Info" to "Notify Customer of Arrival"

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

Key routes include `/` (Dashboard), `/job-journals`, `/import-shipments`, `/export-shipments`, `/custom-clearances`, `/contacts`, `/invoices`, `/team-calendar` (renamed to "R.S Calendar" in UI), `/messages`, `/backups`, and `/settings`.

## External Dependencies

-   **UI Component Libraries:** Radix UI primitives, Shadcn/ui, Lucide React, Embla Carousel.
-   **Form & Validation:** React Hook Form, Zod, @hookform/resolvers, Drizzle-Zod.
-   **Utility Libraries:** clsx, tailwind-merge, class-variance-authority, date-fns.
-   **File Upload & Storage:** Google Drive API (googleapis), Multer.
-   **Container Tracking:** Terminal49 API.
-   **OCR:** Scribe.js (PDFs), Tesseract.js (images).
-   **Email & Calendar:** Gmail API, Google Calendar API (shared OAuth credentials).
-   **Email Signature System:** File-based HTML templates, logo image upload, dynamic placeholders.

## Deployment Configuration

### Replit Deployment

**Required Secrets** (Configure in Replit Secrets 🔒):

1. **APP_BASE_URL** (REQUIRED for Gmail OAuth)
   - Set to your published Replit domain: `https://your-app.replit.app`
   - **Critical:** Must match the redirect URI in Google Cloud Console OAuth credentials
   - **Do NOT** use the dev domain (it changes on restart, causing OAuth errors)
   - Add `${APP_BASE_URL}/api/gmail/callback` to Google Cloud Console > Credentials > Authorized redirect URIs

2. **GMAIL_CLIENT_ID** - Google OAuth client ID for email sending
3. **GMAIL_CLIENT_SECRET** - Google OAuth client secret
4. **GMAIL_REFRESH_TOKEN** - OAuth refresh token (generate via OAuth Playground)
5. **GOOGLE_SERVICE_ACCOUNT_EMAIL** - Service account email for Drive/Gmail API
6. **GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY** - Service account private key (include newlines)
7. **TERMINAL49_API_KEY** - Container tracking API key (optional)

**Gmail OAuth Setup:**
- Development environment uses dynamic domains which cause `redirect_uri_mismatch` errors
- **Solution:** Publish app first, then set `APP_BASE_URL` to published domain
- Configure redirect URI in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

### Ubuntu Server Deployment

Complete setup instructions in `DEPLOYMENT.md`. Key points:
- Uses `APP_BASE_URL` environment variable in `.env` file
- Set to server URL: `http://YOUR_SERVER_IP:5000` or `https://yourdomain.com`
- Behind HTTPS reverse proxy: Use `https://` protocol in `APP_BASE_URL`
- Automated setup via `setup.sh` script
- PM2 for process management, PostgreSQL 16 database

**Database Migrations:**
- When deploying schema changes from Replit to Ubuntu, run migrations to sync database structure
- Invoice templates migration (fixes UUID support): `npx tsx scripts/migrate-invoice-templates.ts`
- Migration scripts are safe and include data-loss checks before executing
- Always backup your database before running migrations on production systems