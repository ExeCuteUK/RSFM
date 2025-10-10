# R.S Freight Manager - Freight Management Suite

**Version:** 4.1.2 alpha

A comprehensive web-based enterprise solution for logistics operations, designed to manage import/export shipments, customs clearances, customer records, invoicing, and freight rate calculations. This application replaces the legacy VB6 RSFM system with a modern, scalable web platform.

## Overview

R.S International Freight Manager is a complete freight management system featuring unified job referencing (starting at #26001) across Import Shipments, Export Shipments, and Custom Clearances. The system automatically generates Custom Clearance jobs for Import Shipments marked "R.S To Clear", sharing the same job reference for seamless tracking.

### Key Features

- **Job Management**
  - Import/Export Shipments tracking
  - Custom Clearances with automatic generation
  - Unified job referencing system (#26001+)
  - Multi-currency financial fields
  - Status-based workflows with visual indicators
  - Container tracking via Terminal49 API integration

- **Document Management**
  - Google Drive integration for file storage
  - Shared document system with automatic syncing between linked jobs
  - Dual-engine OCR (Scribe.js for PDFs, Tesseract.js for images)
  - Automatic document attachment for specific email actions

- **Communication**
  - Multi-user internal messaging system with real-time notifications
  - Draggable email composer with multi-draft support
  - Smart recipient selection logic for clearance emails
  - Gmail integration with OAuth authentication
  - Email signature system with HTML templates

- **Financial Management**
  - Comprehensive invoicing system
  - Purchase invoice tracking
  - Auto-population of clearance invoices
  - Multi-currency support
  - Automatic expense calculations

- **Dashboard & Reporting**
  - Tabbed card interface with Container Management
  - Spreadsheet-like displays with conditional formatting
  - Job history on customer contact cards
  - Real-time user presence tracking
  - Quick user access for messaging

## Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Routing:** Wouter
- **State Management:** TanStack Query (React Query v5)
- **Forms:** React Hook Form with Zod validation
- **UI Components:** Shadcn/ui (New York style) with Radix UI primitives
- **Styling:** Tailwind CSS with light/dark theme support
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js with TypeScript (ESM)
- **Framework:** Express.js
- **Database:** PostgreSQL (Neon-backed)
- **ORM:** Drizzle ORM
- **Authentication:** Passport.js with session-based auth
- **File Storage:** Google Drive API
- **Container Tracking:** Terminal49 API

### External Integrations
- **Google Drive:** Document storage and backup
- **Gmail:** OAuth-based email sending
- **Terminal49:** Real-time container tracking
- **Scribe.js & Tesseract.js:** OCR for document processing

## Getting Started

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database (provided by Replit)
- Google Drive API credentials (configured via Replit integration)
- Gmail API credentials (configured via Replit integration)
- Terminal49 API key (optional, for container tracking)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Database (auto-configured in Replit)
DATABASE_URL=postgresql://...

# API Keys (configure via Replit Secrets)
TERMINAL49_API_KEY=your_terminal49_key
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
```

3. Push database schema:
```bash
npm run db:push
```

### Running the Application

Development mode:
```bash
npm run dev
```

The application will be available at `http://0.0.0.0:5000`

## Database Management

### Schema Changes

⚠️ **IMPORTANT:** When adding new tables or changing column types, you must update the backup/restore scripts:
- `scripts/backup-contact-databases.ts`
- `scripts/restore-contact-databases.ts`

The backup system must know about all tables and their data types (arrays, JSONB, etc.) to properly handle backups.

### Database Backups

All backups are stored in **Google Drive** at: `RS Freight Manager/Backups/`

**Current backup coverage (16 tables):**
- Users, Messages, General References
- Import Customers, Export Customers, Export Receivers
- Hauliers, Shipping Lines, Clearance Agents
- Settings
- Import Shipments, Export Shipments, Custom Clearances
- Job File Groups (shared document storage)
- Purchase Invoices, Invoices

**Run a backup:**
```bash
tsx scripts/backup-contact-databases.ts
```

This creates a ZIP archive containing:
- SQL INSERT statements for all tables
- Email signature assets (signature-template.html, rs-logo.jpg)
- Metadata JSON file

**Restore from backup:**
1. Download the ZIP from Google Drive
2. Extract the contents
3. Run the restore script:
```bash
tsx scripts/restore-contact-databases.ts
```

**Cleanup old backups:**
```bash
tsx scripts/cleanup-old-backups.ts
```

This keeps only the most recent backup and removes older ones.

### Data Import

Contact databases have been populated with production data:
- **Import Customers:** 1,424 records
- **Export Customers:** 2,007 records
- **Export Receivers:** 2,147 records

Import scripts are located in `scripts/` directory.

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components (routes)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── contexts/      # React contexts
│   └── index.html         # HTML entry point
├── server/                # Backend Express application
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   ├── index.ts           # Server entry point
│   └── vite.ts            # Vite dev server integration
├── shared/                # Shared code (frontend & backend)
│   └── schema.ts          # Database schema & Zod validators
├── scripts/               # Utility scripts
│   ├── backup-contact-databases.ts
│   ├── restore-contact-databases.ts
│   └── cleanup-old-backups.ts
└── attached_assets/       # File uploads and assets
```

## Key Architecture Decisions

### Shared Document Storage
The `job_file_groups` table centralizes files by `jobRef`, automatically syncing documents across linked import/export shipments and custom clearances.

### Automatic Custom Clearance Generation
Import Shipments marked "R.S To Clear" automatically create a linked Custom Clearance job with the same `jobRef`.

### Multi-Email Fields
Contact forms support multiple email addresses for different purposes (contact, accounts, agent emails).

### Bidirectional Document Sync
Transport documents from Export Shipments automatically sync to linked Custom Clearances and vice versa.

### Session-Based Authentication
Express sessions with PostgreSQL store (connect-pg-simple) provide secure, stateful authentication with:
- Proxy trust for HTTPS behind reverse proxy
- Secure cookies with SameSite protection
- Credential inclusion in all fetch requests

## Development Notes

### Database Migrations
Use Drizzle's push command instead of manual migrations:
```bash
npm run db:push
```

If you encounter data-loss warnings:
```bash
npm run db:push -- --force
```

### Email Functionality
- **Custom Clearance Emails:** Use data directly from clearance records
- **Smart Recipients:** Priority system for email selection (Agent Accounts → Customer Accounts → Agent → Customer)
- **Automatic Attachments:** Specific email actions trigger document attachments and status updates

### Status Indicators
- Custom Clearances use "Awaiting" prefix convention
- Recognized statuses: "Request CC", "Awaiting Entry", "Awaiting Arrival", "P.H Hold", "Customs Issue", "Fully Cleared"
- Visual indicators: Yellow (To Do), Green (Completed), Red (Issue)

### UI/UX Standards
- All contact dropdowns are alphabetically sorted
- Display cards use consistent `bg-card` styling (white/grey in light/dark mode)
- Professional blue color scheme with Inter font
- Favicon extracted from legacy VB6 application

## Production Deployment

The application is configured for Replit deployment with:
- Express server handling both API and static files
- Vite dev server integration for development
- Automatic session cookie configuration for production
- PostgreSQL connection pooling

## Support

For issues or questions about the R.S Freight Manager, refer to:
- `replit.md` - Detailed technical architecture and user preferences
- Database backup logs in Google Drive
- Development guidelines in this README

---

**Last Updated:** October 2025  
**Replacing:** RSFM 3.6 (VB6 Legacy Application)
