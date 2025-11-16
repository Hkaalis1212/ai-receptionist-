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

**Routing**: Uses Wouter for client-side routing, providing a lightweight alternative to React Router with six main routes: Chat, Dashboard, Appointments, Communications, Checkout, and Settings.

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
- **Appointments Table**: Manages booking data with service, date/time, status (pending/confirmed/cancelled/completed), customer details, payment amount (amountCents), payment status, Stripe payment intent ID, and lastReminderSentAt timestamp for reminder idempotency
- **SMS Messages Table**: Logs all SMS communications with Twilio message SID, direction (inbound/outbound), from/to numbers, message body, status, and optional appointment/conversation links
- **Call Logs Table**: Records voice call data including Twilio call SID, direction, from/to numbers, call status, duration, recording URL, transcript, and optional appointment/conversation links
- **Settings Table**: Stores business configuration including name, type, business phone, available services, working hours, timezone, welcome message, escalation email, ElevenLabs voice ID for phone calls, Mailchimp audience ID, and Mailchimp sync enable flag (string literal "true"/"false")

**Type Safety**: Full TypeScript integration with Zod schemas for runtime validation using `drizzle-zod` for automatic schema inference.

### External Dependencies

**AI Service**: OpenAI API (GPT-5 model) for conversational AI, intent recognition, sentiment analysis, and entity extraction. Configured via `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY` environment variables. Also powers voice call responses via Twilio integration.

**Payment Processing**: Stripe integration for secure payment processing on appointments. Configured with `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLIC_KEY`. Supports payment intents, checkout flows, and payment status tracking.

**Communications**: Twilio integration for voice calls and SMS messaging via Replit connector. Provides automated SMS notifications for appointment confirmations and payment reminders. Voice calls are handled with AI-powered TwiML responses including speech recognition and natural language processing. Webhook signature validation ensures secure communication.

**Email Marketing**: Mailchimp integration for automated customer syncing and email list management. Configured via `MAILCHIMP_API_KEY` and `MAILCHIMP_SERVER_PREFIX` environment variables. Features include automatic customer sync to selected Mailchimp audience on appointment booking, intelligent tagging based on service type, sentiment analysis, and customer status, merge fields for last contact date and service tracking, and configurable sync toggle in settings.

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

## Recent Changes (November 16, 2025)

### Multi-Channel Appointment Management
Implemented comprehensive appointment management system with full reschedule and cancel capabilities across all channels:

**Appointment Operations API:**
- GET /api/appointments/:id - Retrieve single appointment
- PUT /api/appointments/:id - Update/reschedule appointment
- POST /api/appointments/:id/cancel - Cancel appointment with notifications
- All endpoints send multi-channel notifications (Email + SMS)
- All endpoints sync with Mailchimp customer data

**Multi-Channel Support:**
- **Web Chat**: Book, reschedule, cancel via AI conversation
- **SMS**: Full appointment management via text messages
- **Voice Calls**: Speak to AI for appointment operations
- **API**: Direct REST endpoint access

**AI Enhancements:**
- Extended intent recognition: "booking", "reschedule", "cancel"
- Enhanced entity extraction: appointmentId, name, email, phone, date, time, service
- Automatic appointment lookup by customer identifiers
- Natural language processing for all appointment operations

**Email Notification System (Resend):**
- Professional HTML email templates
- Appointment confirmation emails
- Appointment cancellation emails
- Appointment reminder emails (24hr advance)
- Error propagation for proper failure handling

**Reminder Scheduler:**
- Automated background scheduler running hourly
- Checks for appointments happening tomorrow
- Sends Email + SMS reminders 24 hours in advance
- Idempotency via lastReminderSentAt timestamp with 12-hour cooldown
- Optimistic timestamp update before delivery attempts
- Manual trigger endpoint: POST /api/reminders/send
- Returns HTTP 500 when delivery fails (honest error reporting)
- Background scheduler continues processing even if individual reminders fail
- Verified with E2E testing (idempotency confirmed)

**Data Consistency:**
- All reschedule/cancel operations re-fetch fresh appointment data after updates
- Notifications always use current dates/times (no stale data bugs)
- Mailchimp sync consistent across all channels

**Error Handling:**
- Differentiated error propagation strategy:
  - Reminder endpoint: Hard-fails (HTTP 500) if notifications can't be sent
  - Booking/reschedule/cancel endpoints: Succeed with core operation, log notification failures
- Email functions throw errors that bubble up to callers
- Background scheduler resilient (logs errors and continues processing)

## Technical Debt

### Structured Notification Outcomes (Future Enhancement)
**Status**: Documented for future implementation

**Current Behavior:**
- Booking/reschedule/cancel endpoints succeed even if notifications fail
- Notification failures logged to console only
- No structured response indicating partial success

**Proposed Enhancement:**
- Create notification dispatch helper returning per-channel outcomes
- Return structured responses: `{ status: "partial-success", notifications: { email: "failed", sms: "sent" } }`
- Update API documentation and tests for partial-success semantics
- Add observability hooks (logs/metrics/alerts) for notification failures
- Coordinate client updates to surface warnings to users

**Why Deferred:**
- Breaking API change requiring coordinated client updates
- Adds complexity (new helper abstraction, expanded tests, observability infrastructure)
- Marginal immediate value compared to complexity
- Current implementation meets functional requirements
- Prioritize for next iteration when monitoring requirements are clearer