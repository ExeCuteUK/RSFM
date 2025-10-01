# R.S International Freight Manager 4.0.1 alpha

## Overview

R.S International Freight Manager is a web-based freight management system designed to replace a legacy VB6 application. Its primary purpose is to manage import/export shipments, customs clearances, customer records, invoicing, and freight rate calculations, providing an enterprise-grade solution for logistics operations. The system handles three core workflows: Import Shipments, Export Shipments, and Custom Clearances, all sharing a unified job reference system starting at #26001. A key feature is the automatic generation of Custom Clearance jobs when an Import Shipment is marked "R.S To Clear", sharing the same job reference. The system also supports multi-currency financial fields and maintains separate databases for Import Customers, Export Customers, and Export Receivers. Each job type is visually differentiated with distinct color themes for clarity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite for development and Wouter for routing. TanStack Query manages server state and caching, while React Hook Form with Zod handles form validation. The UI leverages the Shadcn/ui component library (New York style) based on Radix UI primitives and styled with Tailwind CSS, supporting light/dark themes. The design prioritizes productivity and clarity, using a professional blue color scheme, the Inter font family, and a consistent spacing and elevation system. State management relies on React Query for server state, React hooks for local component state, and localStorage for theme persistence.

### Backend Architecture

The backend is developed with Express.js and TypeScript on Node.js, utilizing an ESM module system. It provides a RESTful API under the `/api` prefix for CRUD operations on all major entities. Zod schemas are shared between frontend and backend for validation. The current storage layer is an in-memory solution (`MemStorage`) implementing an `IStorage` interface, designed for future migration to PostgreSQL/Drizzle ORM. The system includes data models for `importCustomers`, `exportCustomers`, `exportReceivers`, `importShipments`, `exportShipments`, and `customClearances`, with automatic custom clearance job generation logic.

### API Endpoints

The API provides standard RESTful endpoints for managing:
-   **Import Customers**: GET, POST, PATCH, DELETE `/api/import-customers`
-   **Export Customers**: GET, POST, PATCH, DELETE `/api/export-customers`
-   **Export Receivers**: GET, POST, PATCH, DELETE `/api/export-receivers`
-   **Import Shipments**: GET, POST, PATCH, DELETE `/api/import-shipments` (auto-creates Custom Clearance if `rsToClear=true`)
-   **Export Shipments**: GET, POST, PATCH, DELETE `/api/export-shipments`
-   **Custom Clearances**: GET, POST, PATCH, DELETE `/api/custom-clearances`

### Navigation Routes

Key routes include:
-   `/` (Dashboard)
-   `/import-shipments`
-   `/export-shipments`
-   `/custom-clearances`
-   `/customers`
-   `/invoices`
-   `/rates`

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

**Development Tools:**
-   TypeScript
-   Vite (frontend bundling)
-   esbuild (backend bundling)