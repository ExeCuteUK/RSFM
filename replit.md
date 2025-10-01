# FreightPro - Comprehensive Freight Management Suite

## Overview

FreightPro is a modern web-based freight management system designed to replace legacy VB6 software. The application provides comprehensive tools for managing import/export shipments, custom clearances, customer records, and invoicing operations. Built with a focus on productivity and data clarity, it serves as an enterprise-grade solution for freight forwarding and logistics operations.

The system handles three main operational workflows:
- **Import Operations**: Managing incoming shipments with customs clearance tracking
- **Export Operations**: Handling outbound shipments with receiver and destination management
- **Custom Clearances**: Dedicated workflow for customs documentation and compliance

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

**Database Layer:**
- Drizzle ORM for type-safe database operations
- Neon serverless PostgreSQL as the database provider
- WebSocket support for real-time database connections
- Schema-first approach with TypeScript type inference

**Data Models:**
- `importCustomers`: Import customer records with agent information
- `exportCustomers`: Export customer records
- `exportReceivers`: Destination receiver records
- `importShipments`: Import shipment tracking and details
- `exportShipments`: Export shipment management
- `customClearances`: Customs clearance documentation and workflow
- `users`: User authentication records

### External Dependencies

**Database:**
- Neon Serverless PostgreSQL (via `@neondatabase/serverless`)
- Connection pooling with ws (WebSocket) library for Neon compatibility
- Drizzle Kit for schema migrations and database push operations

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