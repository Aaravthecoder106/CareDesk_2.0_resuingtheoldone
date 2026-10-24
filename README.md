# CareDesk 2.0 — Connected Elder Care Health Platform

CareDesk is an AI-powered healthcare platform built specifically to bridge the physical, clinical, and emotional distance between aging parents (seniors) and their family caregivers.

By replacing fragmented paper lab sheets, complex hospital portals, and stressful check-in calls with a connected digital command center, CareDesk enables adult children to monitor vitals, track longitudinal health trends, and consult an AI assistant grounded strictly in verified medical records.

---

## Key Features

- **Dual-Role Onboarding** — Dedicated onboarding pathways for **Family Caregivers** and **Seniors / Patients** (`/sign-up?role=caregiver` or `/sign-up?role=patient`).
- **10-Second Game-Style Pairing** — Instant mutual pairing using friendly 6-digit room codes (e.g. `CARE-782`). Eliminates hospital portal lock-ins and bureaucratic paperwork; codes can be shared via WhatsApp, SMS, or phone.
- **Multimodal Medical Document Digitization** — Seniors or caregivers upload PDFs or photos of lab reports and prescriptions. Google Gemini automatically extracts structured lab biomarkers, active medications, diagnoses, and plain-language summaries.
- **Caregiver Command Center & Multi-Elder Switching** — Caregivers caring for multiple family members (e.g. Mom and Dad) can switch context with a single click across Reports, Lab Trends, and AI Chat.
- **Context-Partitioned AI Health Consultations** — Family caregivers can ask questions tailored specifically to a connected elder's health (e.g. *"Are Mom's blood pressure medications safe with her new cough syrup?"*). AI conversations are isolated per `patient_id`.
- **Try-Before-Signup Guest Teaser Flow** — Drop any blood test or prescription PDF/JPG on the landing page for an instant teaser analysis without creating an account; auto-migrates cleanly into the user's library upon sign-up.
- **Native PostgreSQL Row-Level Security (RLS)** — Native database policies protect `reports`, `lab_results`, `conditions`, `medications`, and private storage buckets. Access is strictly isolated to the patient and verified, active members of their Care Circle.
- **Libraries.dev BorderBeam Integration** — High-performance animated border glow effects (`ocean` color preset) highlighting active pairing beacons and clinical consultation cards.
- **Clean Clinical UI** — Professional medical interface adhering to a deep navy (`#001736` / `#001B3D`) and electric blue (`#00E0FF`) theme with zero emojis and accessible typography.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router, Turbopack) + React 19 |
| **Language** | TypeScript (strict mode) |
| **Authentication** | Supabase Auth (`@supabase/ssr` with PKCE cookie management) |
| **Database & Vector** | Supabase (PostgreSQL 15+ with `pgvector` for clinical embeddings) |
| **AI / LLM** | Google Gemini 2.5 Flash / 1.5 Flash (Multimodal vision + clinical extraction) |
| **UI Components** | Tailwind CSS v4, Lucide React, shadcn/ui, Recharts |
| **Visual Effects** | BorderBeam (`border-beam` from Libraries.dev) |
| **Validation** | Zod + `@t3-oss/env-nextjs` |
| **Testing** | Node.js Test Runner (`node --test`), Headless Chrome DOM Verification |

---

## Architecture & Project Structure

```text
CareDesk-ip-reviewmaker-main/
├── src/
│   ├── app/                                # Next.js App Router
│   │   ├── api/
│   │   │   ├── auth/                       # Supabase PKCE callback & session routes
│   │   │   ├── public/
│   │   │   │   ├── analyze/                # Guest report upload & chunk reassembly
│   │   │   │   ├── preview/                # Guest teaser analysis retrieval
│   │   │   │   └── migrate/                # Guest token to user account migration
│   │   │   ├── reports/                    # Report CRUD, preview, and re-analysis
│   │   │   ├── chat/                       # Context-grounded chat (partitioned by patient_id)
│   │   │   ├── analytics/                  # Stored biomarker trends & AI regeneration
│   │   │   ├── family/                     # Care Code generation, accept, confirm & members
│   │   │   ├── razorpay/                   # Order creation, verification, and webhooks
│   │   │   ├── subscription/               # Plan limits and tier status
│   │   │   └── library/                    # Vault password protection
│   │   ├── dashboard/                      # Authenticated ElderCare command center
│   │   │   ├── reports/                    # Document library with elder switcher tabs
│   │   │   ├── chat/                       # AI health chat with patient context switcher
│   │   │   ├── analytics/                  # Longitudinal biomarker trends & elder matrix
│   │   │   ├── family/                     # Care Circle pairing & room-code management
│   │   │   └── settings/                   # Security & account settings
│   │   ├── preview/[token]/                # Instant guest report teaser viewer
│   │   ├── sign-in/                        # Supabase Auth sign-in (Email + Google OAuth)
│   │   ├── sign-up/                        # Dual-role signup (Caregiver vs Senior)
│   │   ├── layout.tsx                      # Root layout, theme, and toast providers
│   │   ├── page.tsx                        # ElderCare landing page with live demo dropzone
│   │   └── globals.css                     # Tailwind variables and signature blue theme
│   ├── components/
│   │   ├── ui/                             # shadcn UI primitives (button, dialog, card, etc.)
│   │   ├── guest-migration.tsx             # Post-auth preview migration listener
│   │   ├── ai-orb.tsx                      # Thinking indicator with state animations
│   │   ├── markdown.tsx                    # Sanitized clinical markdown renderer
│   │   └── thinking-orbs/                  # GPU-accelerated canvas orb engine
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── gemini.ts                   # Gemini API client with automatic fallbacks
│   │   │   ├── analyze-report.ts           # Clinical parser (labs, meds, diagnoses, flags)
│   │   │   └── chat.ts                     # Patient-isolated RAG context builder
│   │   ├── data/
│   │   │   ├── family.ts                   # Care Circle invites, codes & member connections
│   │   │   ├── reports.ts                  # Reports data layer with RLS compliance
│   │   │   ├── chat.ts                     # Partitioned chat storage and history retrieval
│   │   │   ├── analytics.ts                # Vitals trends and aggregate health metrics
│   │   │   ├── users.ts                    # User provisioning and metadata sync
│   │   │   └── guest-migration.ts          # Atomic guest-to-patient database migration
│   │   ├── supabase/
│   │   │   ├── client.ts                   # Client-side Supabase browser client
│   │   │   ├── server.ts                   # Server-side Supabase client with cookies
│   │   │   ├── middleware.ts               # Auth token refresh and route protection
│   │   │   └── admin.ts                    # Service-role client for background system jobs
│   │   ├── validations.ts                  # Zod validation schemas
│   │   └── env.ts                          # Strict environment variable validation
│   └── middleware.ts                       # Edge middleware for auth and route protection
├── supabase/
│   └── migrations/
│       ├── 0000_initial.sql                # Base 16 tables, RLS policies, storage bucket
│       ├── 0001_user_provisioning.sql      # Triggers syncing auth.users with public.users/patients
│       ├── 0002_deletion_tombstone.sql     # Deletion tombstone table
│       ├── 0003_feedback.sql               # User feedback system
│       ├── 0004_subscriptions.sql          # Subscription status & limits
│       ├── 0005_preview_tokens.sql         # Guest teaser token store
│       ├── 0006_razorpay_orders.sql        # Server-side payment order tracking
│       ├── 0007_guest_migration.sql        # Migration tracking columns
│       ├── 0008_eldercare_security_and_chat_partitioning.sql # Storage RLS, family RLS & chat patient_id
│       └── COMBINED_ALL_MIGRATIONS.sql     # 1-click single deployment migration script
├── scripts/
│   ├── verify-browser-dom.mjs              # Headless Chrome route verification
│   └── test-eldercare-integration.mjs      # Care Code and dual-role integration tests
└── tests/
    ├── eldercare-pairing.test.ts           # Room-code validation and chat isolation tests
    ├── guest-migration.test.ts             # 20 end-to-end guest migration unit tests
    ├── provisioning.test.ts                # User and patient profile provisioning tests
    └── env.test.ts                         # Safe placeholder environment tests
```

---

## Database Schema & Row-Level Security

CareDesk enforces strict PostgreSQL Row-Level Security (RLS) across all health records.

### Core Relational Tables

| Table | Purpose | Security / Access Scope |
|-------|---------|-------------------------|
| `users` | Core user identity (references `auth.users(id)`) | User read own; service-role provisioning |
| `patients` | Patient profile (1:1 with `users`) | User read own; linked caregivers read via family |
| `reports` | Medical documents, metadata & AI summary | Read by patient or linked Care Circle members; write by patient only |
| `lab_results` | Extracted biomarker readings, units & reference flags | Read by patient or linked Care Circle members; write by patient only |
| `medications` | Active prescriptions, dosages & frequencies | Read by patient or linked Care Circle members; write by patient only |
| `conditions` | Diagnosed chronic conditions & clinical statuses | Read by patient or linked Care Circle members; write by patient only |
| `chat_messages` | Multi-turn AI consultation messages | Partitioned by `patient_id`; isolated per user/elder thread |
| `family_members` | Mutual-consent caregiver-patient connection edges | Read/managed by authorized family pairs |
| `family_invites` | 6-character room codes (`CARE-XXX`) for pairing | Token-based lookup and acceptance |
| `notifications` | In-app alerts for accepted invites & health changes | User-isolated read and acknowledge |
| `preview_tokens` | Ephemeral guest upload sessions (48h TTL) | Unauthenticated preview; migrated to patient upon signup |

### Storage Bucket Policies

Medical files uploaded to the private `reports` bucket are stored under directory paths structured by user ID:
```text
reports/<patient_id>/<filename>
```
Supabase Storage policies enforce:
- **Write Access:** Authenticated patients can only write and delete files inside their own `<auth.uid()>/` directory.
- **Read Access:** Granted if `auth.uid() == folder_owner` **OR** if `auth.uid()` is an active, confirmed member connected to `folder_owner` in `public.family_members`.

---

## Getting Started

### 1. Prerequisites

- **Node.js**: v18.18.0 or newer (Node.js 20+ recommended)
- **Supabase Account**: Free or Pro tier project ([supabase.com](https://supabase.com))
- **Google AI Studio Key**: Free Gemini API key ([aistudio.google.com](https://aistudio.google.com/apikey))

### 2. Database Setup

1. Create a new Supabase project.
2. In the Supabase Dashboard, open the **SQL Editor**.
3. Open [`supabase/migrations/COMBINED_ALL_MIGRATIONS.sql`](supabase/migrations/COMBINED_ALL_MIGRATIONS.sql), paste its full contents into the SQL Editor, and click **Run**.
   - This sets up all 16 tables, native RLS policies, the private `reports` storage bucket, user provisioning triggers, and Care Circle functions in one transaction.

### 3. Supabase Auth Configuration

1. In Supabase Dashboard, navigate to **Authentication → Providers**.
   - **Email**: Ensure Email provider is enabled. (For local development, disable *Confirm email* to allow immediate testing).
   - **Google (Optional)**: Enable Google OAuth and add your Client ID & Secret if using Google sign-in.
2. Under **Authentication → URL Configuration**, configure:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: `http://localhost:3000/**`

### 4. Environment Configuration

Copy `.env.example` to `.env` in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Google Gemini API Key
GEMINI_API_KEY=AIzaSy...

# Razorpay (Optional - for Pro/Family subscription tiers)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Resend Email (Optional - falls back to direct Care Code sharing via SMS/WhatsApp)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=CareDesk <onboarding@resend.dev>
```

### 5. Install Dependencies & Run

```bash
# Navigate to the application root
cd CareDesk-ip-reviewmaker-main

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Testing

CareDesk includes a comprehensive automated test suite covering unit logic, security validations, and headless browser DOM verification.

```bash
# Run unit and integration tests (31 tests)
npm test

# Run TypeScript typecheck with zero errors
npx tsc --noEmit

# Run automated headless Chrome cross-route verification
npm run test:browser
```

### Headless Browser Test Coverage

The `npm run test:browser` script boots an automated headless Chrome instance to verify:
- Dual-role pathway cards and live dropzone on the landing page
- BorderBeam rendering and visual elements
- Zero fake testimonials or marketing claims
- Zero emojis across the DOM
- Caregiver and Patient sign-up views
- Unauthenticated route protection on `/dashboard` (redirecting with 307 to `/sign-in`)

---

## Core API Endpoints

| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/public/analyze` | `POST` | Guest landing page report upload with chunked streaming support |
| `/api/public/preview` | `GET` | Retrieve sanitized 70% teaser preview for unauthenticated guests |
| `/api/public/migrate` | `POST` | Atomically migrate guest session into a newly registered user account |
| `/api/family/invite` | `POST` | Generate an instant 6-digit Care Code (`CARE-XXX`) for room pairing |
| `/api/family/accept` | `POST` | Accept a Care Code to immediately link an elder and caregiver |
| `/api/family/members` | `GET` | List connected family members and linked patient IDs |
| `/api/reports/list` | `GET` | List medical reports for the current user or a connected elder (`?patient=UUID`) |
| `/api/chat` | `POST` | Send an AI message; partitioned by `patientId` to reference specific records |
| `/api/chat/history` | `GET` | Retrieve conversation thread filtered by `patient_id` |
| `/api/analytics/data` | `GET` | Retrieve structured biomarker trend data for self or connected elder |

---

## Security & Privacy Guardrails

1. **Native Database Isolation**: All table queries are scoped using Supabase JWT claims (`auth.uid()`). A caregiver can only view records for elders with an active, mutually-confirmed row in `public.family_members`.
2. **Encrypted Private Storage**: The `reports` bucket is private with public access blocked. Files are downloaded exclusively via short-lived signed URLs.
3. **Partitioned AI Threads**: AI chat sessions reference only the active elder's verified lab reports and active medications, preventing clinical cross-contamination between different family members.
4. **Clinical Tone & Transparency**: All diagnostics explicitly show reference ranges, dates, and extracted biomarkers without fabricated marketing claims or automated medical diagnosis without doctor oversight.

---

## License

Private repository. All rights reserved.
