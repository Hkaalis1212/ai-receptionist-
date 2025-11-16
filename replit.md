# AI Receptionist

## Overview

An intelligent AI-powered receptionist application that handles customer interactions through chat, manages appointments, and provides analytics. Built with a modern full-stack architecture using React, Express, and PostgreSQL, this system provides 24/7 automated customer service with natural conversation capabilities, appointment scheduling, and real-time analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React 18 with TypeScript, using Vite as the build tool and development server.

**UI Framework**: Implements shadcn/ui component library with Radix UI primitives, styled using Tailwind CSS with a custom design system based on the "new-york" preset. The design follows system-based principles inspired by modern SaaS platforms (Intercom, Linear, Zendesk), prioritizing clarity and professional aesthetics.

**Layout Pattern**: Split-panel layout with a 16rem fixed sidebar for navigation and a fluid main content area. The application uses a responsive design with mobile breakpoints at 768px, stacking to single column on smaller screens.

**State Management**: TanStack Query (React Query) handles server state with custom query client configuration. The application disables automatic refetching and sets infinite stale time for manual control over data freshness.

**Routing**: Uses Wouter for client-side routing, providing a lightweight alternative to React Router with four main routes: Chat, Dashboard, Appointments, and Settings.

**Theming**: Custom theme system supporting light/dark modes with system preference detection, persisted to localStorage. Uses CSS custom properties for color tokens following HSL color space.

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript, using ESM modules throughout.

**API Design**: RESTful API with endpoints for chat interactions (`/api/chat`), appointments, analytics, and settings. All API routes are prefixed with `/api` and return JSON responses.

**AI Integration**: OpenAI GPT-5 integration for natural language processing and conversation handling. The AI assistant analyzes user intent, sentiment, and extracts entities (name, email, phone, date/time, service) from messages. Supports automatic escalation based on sentiment analysis and urgency detection.

**Development Mode**: Vite middleware integration in development for HMR (Hot Module Replacement) and seamless frontend-backend integration. Production builds serve static files from `dist/public`.

**Request Logging**: Custom middleware logs all API requests with method, path, status code, duration, and response body (truncated to 80 characters).

### Data Layer

**ORM**: Drizzle ORM with PostgreSQL dialect, providing type-safe database access and schema management.

**Database Provider**: Neon Serverless PostgreSQL with connection pooling via `@neondatabase/serverless`.

**Schema Design**:
- **Messages Table**: Stores conversation messages with role (user/assistant/system), content, timestamp, and conversation reference
- **Conversations Table**: Tracks conversation metadata including status (active/completed/escalated), sentiment, intent classification, and customer contact information
- **Appointments Table**: Manages booking data with service, date/time, status (pending/confirmed/cancelled/completed), and customer details
- **Settings Table**: Stores business configuration including name, type, available services, working hours, timezone, welcome message, and escalation email
- **Working Hours Table**: Defines daily business hours with day of week, opening/closing times, and closure status

**Type Safety**: Full TypeScript integration with Zod schemas for runtime validation using `drizzle-zod` for automatic schema inference.

### External Dependencies

**AI Service**: OpenAI API (GPT-5 model) for conversational AI, intent recognition, sentiment analysis, and entity extraction. Configured via `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY` environment variables.

**Database**: Neon Serverless PostgreSQL database accessed via `DATABASE_URL` environment variable. Uses connection pooling for efficient resource management.

**UI Components**: Radix UI primitives for accessible, unstyled component foundations (accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, popover, select, slider, switch, tabs, toast, tooltip, etc.).

**Form Management**: React Hook Form with Zod resolver for type-safe form validation in settings and data entry components.

**Date Utilities**: date-fns library for date formatting and manipulation in appointment scheduling.

**Styling**: Tailwind CSS v3 with custom configuration extending the base theme with HSL color system, custom border radii, and design tokens for consistent spacing and typography.

**Build Tools**: 
- esbuild for server-side bundling in production
- Vite for frontend bundling with React plugin
- PostCSS with Tailwind and Autoprefixer

**Development Tools**:
- Replit-specific plugins for development experience (runtime error modal, cartographer, dev banner)
- TypeScript strict mode for maximum type safety
- Path aliases (`@/`, `@shared/`, `@assets/`) for clean imports