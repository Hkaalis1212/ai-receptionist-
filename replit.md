# AI Receptionist

## Overview
The AI Receptionist is an intelligent AI-powered application designed to automate customer interactions, manage appointments, and provide analytics. It offers 24/7 automated customer service with natural conversation capabilities, efficient appointment scheduling, and real-time insights, built with a modern full-stack architecture using React, Express, and PostgreSQL. The project aims to provide comprehensive customer service automation, enhance operational efficiency, and offer valuable business intelligence.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend uses React 18 with TypeScript, Vite, and the shadcn/ui component library, styled with Tailwind CSS, following a "new-york" design preset. It features a responsive split-panel layout with a fixed sidebar. State management is handled by TanStack Query, and client-side routing uses Wouter. Theming supports light/dark modes with system preference detection and localStorage persistence.

### Backend Architecture
The backend is built with Express.js on Node.js with TypeScript and ESM modules, providing a RESTful API for chat, appointments, analytics, and settings. It integrates with OpenAI GPT-5 for natural language processing, sentiment analysis, and entity extraction, supporting automatic escalation. Development includes Vite middleware for HMR, and production serves static files. All API requests are logged with custom middleware.

### Data Layer
Drizzle ORM with Neon Serverless PostgreSQL ensures type-safe database access and schema management. The database schema includes tables for `Messages`, `Conversations`, `Appointments`, `SMS Messages`, `Call Logs`, `Knowledge Base`, and `Settings`. Full TypeScript integration with Zod schemas and `drizzle-zod` provides runtime validation.

### UI/UX Decisions
The design follows system-based principles inspired by modern SaaS platforms, prioritizing clarity and professional aesthetics. The layout is a split-panel with a 16rem fixed sidebar and a fluid main content area, responsive with mobile breakpoints.

### Technical Implementations
*   **AI Integration**: OpenAI GPT-5 handles natural language understanding, sentiment, and entity extraction.
*   **Voice Customization**: Supports 8 languages via ElevenLabs and custom call scripts.
*   **Privacy & Compliance**: Implements call recording disclosure and personalized caller identification.
*   **Intelligent Call Routing**: Detects business hours, prioritizes VIP/urgent calls, and manages after-hours greetings.
*   **Customer Priority Tracking**: Assigns and tracks standard, VIP, and urgent priority levels across interactions.
*   **Audit Logging System**: Comprehensive logging for sensitive operations including settings and knowledge base changes.
*   **Admin Dashboard**: Provides real-time analytics, activity summaries, and an audit log viewer.
*   **Sentiment-Aware Responses**: AI adjusts response tone based on customer sentiment.
*   **Knowledge Base Management**: Full CRUD operations for FAQs, integrated into the AI's system prompt.
*   **Call Recording and Transcription**: Programmatic recording via Twilio, storing URLs and transcripts.
*   **Multi-Channel Appointment Management**: Supports booking, rescheduling, and cancellation via web chat, SMS, voice calls, and API, with multi-channel notifications (email, SMS) and Mailchimp synchronization.
*   **Email Notification System**: Uses Resend for professional HTML email templates for confirmations, cancellations, and 24-hour reminders.
*   **Reminder Scheduler**: Automated hourly scheduler for 24-hour appointment reminders with idempotency.

### Feature Specifications
*   **Chat**: Real-time customer interaction via AI.
*   **Appointments**: Scheduling, rescheduling, and cancellation with multi-channel support and notifications.
*   **Analytics**: Real-time data on conversations, appointments, calls, and revenue.
*   **Settings**: Configuration for business details, working hours, services, welcome messages, and integrations.
*   **Knowledge Base**: Centralized management of business FAQs for AI reference.

## External Dependencies

*   **AI Service**: OpenAI API (GPT-5 model) for conversational AI, configured via environment variables.
*   **Payment Processing**: Stripe for secure payments on appointments, configured with API keys.
*   **Communications**: Twilio for voice calls and SMS messaging, including AI-powered TwiML responses and webhook signature validation.
*   **Email Marketing**: Mailchimp for customer syncing and email list management, configured via API key and server prefix.
*   **Database**: Neon Serverless PostgreSQL accessed via `DATABASE_URL`.
*   **UI Components**: Radix UI primitives for accessible component foundations.
*   **Form Management**: React Hook Form with Zod resolver for type-safe form validation.
*   **Date Utilities**: date-fns library for date manipulation.
*   **Styling**: Tailwind CSS v3 for custom theming and design tokens.
*   **Build Tools**: esbuild for server bundling, Vite for frontend bundling, PostCSS.
*   **Voice Synthesis**: ElevenLabs for natural-sounding multi-language voice support in calls.
*   **Email Sending**: Resend for transactional email notifications.