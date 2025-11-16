# AI Receptionist Design Guidelines

## Design Approach
**System-Based Design** with inspiration from modern SaaS communication platforms (Intercom, Linear, Zendesk). Prioritizing clarity, efficiency, and trust-building through clean, professional interface design.

## Layout Architecture

### Main Application Structure
- **Split-panel layout**: 300px fixed sidebar (navigation, settings) + fluid main content area
- **Chat view**: Full-height message area with fixed input at bottom
- **Dashboard**: Card-based grid layout for analytics metrics
- Responsive breakpoint: Stack to single column below 768px

### Spacing System
Use Tailwind units: **2, 3, 4, 6, 8, 12, 16** for consistent rhythm
- Component padding: p-4 to p-6
- Section margins: mb-8 to mb-12
- Card spacing: gap-4 to gap-6
- Input fields: p-3 to p-4

## Typography Hierarchy

**Font Stack**: Inter (primary), system-ui fallback via Google Fonts CDN

- **H1 (Page titles)**: text-2xl, font-semibold, tracking-tight
- **H2 (Section headers)**: text-xl, font-semibold
- **H3 (Card titles)**: text-lg, font-medium
- **Body text**: text-base, font-normal, leading-relaxed
- **Small text (meta)**: text-sm, font-normal
- **Button labels**: text-sm, font-medium
- **Chat messages**: text-base, leading-normal

## Component Library

### Navigation & Layout
- **Sidebar**: Vertical nav with icon + label pattern, hover states, active indicator
- **Top bar**: Logo left, user profile/settings right, optional breadcrumbs center
- **Tabs**: Underline style for view switching (Chat, Analytics, Settings)

### Chat Interface
- **Message bubbles**: 
  - User messages: Right-aligned, max-w-md, rounded-2xl (rounded-br-sm for tail effect)
  - AI messages: Left-aligned, max-w-md, rounded-2xl (rounded-bl-sm)
  - Padding: px-4 py-3
  - Spacing between messages: space-y-3
- **Input area**: 
  - Fixed bottom position with shadow-lg
  - Flex container: input (flex-1) + send button
  - Min-height: 56px with auto-expand for multi-line
  - Border-radius: rounded-xl
- **Typing indicator**: Three animated dots, 8px each, subtle pulse
- **Timestamp**: text-xs above message groups (every 5 minutes)

### Data Display
- **Metric cards**: 
  - Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
  - Structure: Large number (text-3xl font-bold) + label (text-sm) + trend indicator
  - Padding: p-6, rounded-lg, border
- **Data tables**: 
  - Striped rows for readability
  - Sticky header, hover row highlight
  - Padding: px-4 py-3 per cell
- **Charts**: Reserve space (h-64) for integration libraries (Chart.js/Recharts)

### Forms & Inputs
- **Text inputs**: 
  - Height: h-11
  - Border: border-2, rounded-lg
  - Focus ring: ring-2, ring-offset-2
  - Placeholder: text-gray-500
- **Buttons**:
  - **Primary**: px-6 py-3, rounded-lg, font-medium
  - **Secondary**: px-5 py-2.5, rounded-lg, border-2
  - **Icon-only**: w-10 h-10, rounded-full
- **Toggles/Switches**: w-11 h-6 track, smooth transition
- **Dropdowns**: Full-width on mobile, min-w-48 on desktop

### Feedback & States
- **Loading states**: Skeleton screens (animate-pulse) for cards, shimmer for list items
- **Empty states**: Centered icon (w-16 h-16) + heading + description + CTA
- **Alerts/Toasts**: 
  - Fixed top-right position
  - Width: max-w-md
  - Padding: p-4, rounded-lg
  - Auto-dismiss after 5s with slide-out animation
- **Modals**: 
  - Max-w-lg centered
  - Backdrop blur effect
  - Padding: p-6, rounded-xl

## Icons
**Heroicons** (outline for default, solid for active states) via CDN. Use 20px (w-5 h-5) for inline, 24px (w-6 h-6) for standalone.

## Accessibility
- Focus indicators on all interactive elements (ring-2)
- ARIA labels for icon-only buttons
- Keyboard navigation support (Tab, Enter, Esc)
- Minimum touch target: 44px × 44px
- Contrast ratios meet WCAG AA standards

## Animation Guidelines
**Minimal, purposeful motion only:**
- Message send: Gentle slide-in from bottom (150ms ease-out)
- Modal enter/exit: Fade + scale (200ms)
- Hover states: No animation, instant feedback
- Loading spinners: Slow rotation (2s duration)

## Images
**Profile avatars**: 40px × 40px circles in chat, 32px in sidebar
**No decorative imagery** – focus on functional, data-driven interface
**Logo placement**: Top-left sidebar, 120px × 32px max

This design creates a **professional, efficient, and trustworthy** AI receptionist interface optimized for business use, with clear information hierarchy and seamless user flows.