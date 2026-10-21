# CareDesk — AI Agent Context & Knowledge Base (`ai_agent_context.md`)

> **Note for Future AI Agents:**  
> This file is the primary context and operating manual for CareDesk. Read this document before making any changes, running commands, or modifying architecture. It documents the entire system design, folder structure, database schema, verified tests, known quirks, and exact procedures.

---

## 1. Project Overview & Mission

**CareDesk** is an AI-powered healthcare web platform built for patients, caregivers, and families.
- **Core Functionality:** Patients upload medical reports (PDFs, scans, images) -> AI extracts structured biomarkers (lab results, medications, diagnoses, conditions) -> generates health summaries, interactive trend charts, and an AI chat assistant grounded in the user's personal medical history.
- **Key Features:**
  - **Try-Before-Signup (Guest Teaser Flow):** Guests can upload a report from the landing page, view a 70% teaser analysis without an account, and seamlessly migrate the report into their library upon sign-up.
  - **Report Library & HIPAA Storage:** Secure file storage in Supabase private buckets under user-isolated directories (`<user_id>/...`). Optional password lock with scrypt hashing and timing-safe comparison.
  - **AI Chat:** Multi-turn conversational medical assistant grounded with the patient's real reports, lab values, active medications, and conditions using Google Gemini.
  - **Health Analytics & Trends:** Interactive charts (Recharts) visualizing biomarker trends (cholesterol, glucose, etc.), condition summaries, and AI-generated health scores.
  - **Mutual-Consent Family Sharing:** Invite family members with cryptographic tokens; mutual consent RPC ensures two-way access confirmation before sharing health snapshots.
  - **Subscription & Monetization:** 3-tier model (Free Explorer, Pro Individual, Family Care) integrated with Razorpay server-side verified orders and webhooks.
  - **Bilingual Support (i18n):** English (`en`) and Hindi (`hi`) translations with React context.
  - **Authentication:** Native Supabase Auth (`@supabase/ssr`) supporting Email/Password and Google OAuth with automatic session cookie refresh and route guards.

---

## 2. Directory Layout & Nested Workspace Gotcha

> [!WARNING]
> **CRITICAL WORKSPACE STRUCTURE NOTE:**
> The root directory `C:\Users\Aarav Kumar\Downloads\CareDesk-ip-reviewmaker-main` contains:
> 1. `instructions_for_coding_ai_agent.md` — Specifies target Git repo to commit to:
>    `https://github.com/Aaravthecoder106/CareDesk_2.0_resuingtheoldone`
> 2. `ai_agent_context.md` (this file)
> 3. `CareDesk-ip-reviewmaker-main/` — **The actual Next.js application root!**
> 
> When running terminal commands (`npm install`, `npm test`, `npm run dev`, `npx tsc`, `git`), **always execute them inside `CareDesk-ip-reviewmaker-main`** (or `cd CareDesk-ip-reviewmaker-main` first).

```text
CareDesk-ip-reviewmaker-main/ (Workspace Root)
├── instructions_for_coding_ai_agent.md     # Git commit repo instruction
├── ai_agent_context.md                    # This master context file
└── CareDesk-ip-reviewmaker-main/          # Actual Next.js Project Root
    ├── .claude/                           # Claude IDE configuration
    ├── .env.example                       # Environment template (Supabase + Gemini + Razorpay)
    ├── package.json                       # Dependencies & scripts (@supabase/ssr, next, react 19)
    ├── next.config.ts                     # Next.js config (security headers, turbopack)
    ├── tsconfig.json                      # Main TypeScript config
    ├── tsconfig.tests.json                # Test runner TypeScript config
    ├── eslint.config.mjs                  # Flat ESLint config
    ├── components.json                    # shadcn/ui configuration
    ├── public/                            # Static SVG/PNG assets
    ├── scripts/
    │   └── verify-rls.mjs                 # Cross-user RLS isolation audit script
    ├── supabase/
    │   └── migrations/
    │       ├── 0000_initial.sql           # Base 16 tables, native auth.uid() RLS, storage, functions
    │       ├── 0001_user_provisioning.sql # Trigger on auth.users auto-syncing public.users & patients
    │       ├── 0002_deletion_tombstone.sql# deleted_users table preventing account resurrection
    │       ├── 0003_feedback.sql          # feedback table for in-app widget
    │       ├── 0004_subscriptions.sql     # subscriptions table
    │       ├── 0005_preview_tokens.sql    # preview_tokens for guest landing page teaser
    │       ├── 0006_razorpay_orders.sql   # razorpay_orders server tracking
    │       ├── 0007_guest_migration.sql   # migrated_user_id & migrated_at tracking
    │       └── COMBINED_ALL_MIGRATIONS.sql# All migrations in 1 runnable script
    ├── tests/
    │   ├── env.test.ts                    # Environment placeholder defaults unit test
    │   ├── guest-migration.test.ts        # 19 comprehensive guest migration unit tests
    │   ├── provisioning.test.ts           # User identity mapping & profile unit tests
    │   └── public-analyze-chunks.test.ts  # Chunk reassembly unit test
    └── src/
        ├── env.ts                         # Zod-validated environment config (@t3-oss/env-nextjs)
        ├── middleware.ts                  # Supabase session refresh & protected route guard
        ├── app/
        │   ├── layout.tsx                 # Root layout with providers & fonts
        │   ├── page.tsx                   # Landing page (hero, features, guest upload)
        │   ├── about/page.tsx             # About Us page
        │   ├── privacy/page.tsx           # Privacy Policy page
        │   ├── preview/[token]/page.tsx   # 70% teaser preview for guest upload
        │   ├── sign-in/page.tsx           # Supabase Auth sign-in (Email/Pass + Google OAuth)
        │   ├── sign-up/page.tsx           # Supabase Auth sign-up (Email/Pass + Google OAuth)
        │   ├── dashboard/                 # Protected patient area
        │   │   ├── layout.tsx             # Shell (Sidebar, MobileNav, GuestMigration, Feedback)
        │   │   ├── page.tsx               # Dashboard home
        │   │   ├── reports/page.tsx       # Report Library (upload, status, password gate)
        │   │   ├── chat/page.tsx          # Grounded AI Chat UI
        │   │   ├── analytics/page.tsx     # Biomarker charts & insights UI
        │   │   ├── family/page.tsx        # Family members & invite management
        │   │   ├── settings/page.tsx      # Library password management
        │   │   └── upgrade/page.tsx       # Pricing tiers & Razorpay checkout
        │   └── api/                       # Next.js Route Handlers
        │       ├── auth/
        │       │   ├── callback/route.ts  # Supabase OAuth PKCE code exchange & email confirm
        │       │   └── sign-out/route.ts  # Server-side cookie clear & sign-out
        │       ├── public/
        │       │   ├── analyze/route.ts   # Guest report upload & chunked assembler
        │       │   ├── preview/route.ts   # Guest preview lookup
        │       │   └── migrate/route.ts   # Post-signup migration worker
        │       ├── reports/
        │       │   ├── upload/route.ts    # Direct report upload
        │       │   ├── presign/route.ts   # Direct-to-storage presigned URLs
        │       │   ├── list/route.ts      # Fetch user's reports
        │       │   ├── delete/route.ts    # Delete report + storage file + audit log
        │       │   ├── analyze/route.ts   # Trigger background AI re-analysis
        │       │   ├── analyze-image/     # Gemini Vision image analysis
        │       │   └── preview/route.ts   # Signed URL generator for private PDFs
        │       ├── chat/
        │       │   ├── route.ts           # Grounded AI Chat endpoint
        │       │   ├── history/route.ts   # Retrieve chat messages
        │       │   └── clear/route.ts     # Clear chat history
        │       ├── analytics/
        │       │   ├── data/route.ts      # Read stored snapshot
        │       │   └── regenerate/route.ts# AI regenerate health score & trends
        │       ├── family/
        │       │   ├── invite/route.ts    # Create tokenized family invite
        │       │   ├── invites/route.ts   # Get pending invites
        │       │   ├── members/route.ts   # Get accepted family members
        │       │   ├── accept/route.ts    # Accept invite token via RPC
        │       │   └── member/route.ts    # Confirm/remove family member
        │       ├── library/
        │       │   └── password/route.ts  # Set/verify/remove library password
        │       ├── razorpay/
        │       │   ├── order/route.ts     # Create server-bound order
        │       │   ├── verify/route.ts    # Verify HMAC payment signature
        │       │   ├── cancel/route.ts    # Cancel order
        │       │   └── webhook/route.ts   # Razorpay payment.captured webhook
        │       ├── subscription/
        │       │   └── status/route.ts    # Current plan & usage limits
        │       ├── feedback/route.ts      # In-app user feedback
        │       └── notifications/route.ts # User notifications
        ├── components/
        │   ├── ui/                        # Button, Card, Dialog, Avatar, Dropdown, etc.
        │   ├── auth-context.tsx           # Supabase Auth provider (useUser, useAuth, Show)
        │   ├── feedback-widget.tsx        # Floating user feedback modal
        │   ├── guest-migration.tsx        # Post-signup client migrator with retry latch
        │   ├── header.tsx                 # Public marketing header
        │   ├── logo.tsx                   # Brand logo component
        │   ├── mobile-nav.tsx             # Mobile dashboard bottom navigation
        │   ├── providers.tsx              # AuthProvider, React Query, Theme, Language
        │   ├── sidebar.tsx                # Desktop dashboard sidebar
        │   └── user-menu.tsx              # Supabase user menu & sign-out
        └── lib/
            ├── api-helpers.ts             # Standardized API response utilities
            ├── chunk-upload.ts            # Chunk reassembly utility
            ├── guest-migration.ts         # Pure domain logic for guest data migration
            ├── logger.ts                  # Structured JSON/console logger
            ├── rate-limit.ts              # Sliding-window in-memory rate limiters
            ├── razorpay.ts                # Razorpay client & plan configurations
            ├── utils.ts                   # clsx/tailwind-merge helper
            ├── validations.ts             # Zod validation schemas for all routes
            ├── ai/
            │   ├── gemini.ts              # Gemini client with fallback & retry logic
            │   ├── analyze-report.ts      # Multi-stage extraction pipeline
            │   └── chat.ts                # Medical context builder & chat handler
            │   └── embeddings.ts          # Gemini embedding helper
            ├── data/
            │   ├── analytics.ts           # Analytics queries & AI regeneration
            │   ├── audit.ts               # HIPAA audit logger
            │   ├── chat.ts                # Chat message persistence
            │   ├── family.ts              # Family sharing queries & RPC triggers
            │   ├── library.ts             # Scrypt password hashing & verification
            │   ├── provisioning.ts        # Supabase user & patient self-heal
            │   ├── provisioning-map.ts    # Mapping functions for user rows
            │   ├── reports.ts             # Report CRUD operations
            │   ├── subscriptions.ts       # Tier queries & usage limit checks
            │   └── users.ts               # User identity & profile provisioning
            ├── email/
            │   └── family-invite.ts       # Resend / FormSubmit invite dispatch
            ├── i18n/
            │   ├── language-context.tsx   # React language context & selector hook
            │   └── translations.ts        # Complete English & Hindi strings
            └── supabase/
                ├── admin.ts               # Service-role Supabase client (bypasses RLS)
                ├── client.ts              # Browser Supabase client (@supabase/ssr)
                ├── server.ts              # Server Supabase client with cookies (@supabase/ssr)
                ├── middleware.ts          # Auth cookie refresh for Next.js middleware
                └── types.ts               # Full Database TypeScript definitions
```

---

## 3. Tech Stack Matrix

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Next.js 15.5.20 (App Router) | Turbopack enabled for `dev` and `build` |
| **Runtime & Language** | React 19.1.0, TypeScript 5.x | Strict mode enabled |
| **Authentication** | Supabase Auth (`@supabase/ssr`) | Native cookie session management, Email/Password, Google OAuth, PKCE exchange |
| **Database & Storage** | Supabase (PostgreSQL 15+) | Native `auth.uid()` RLS on every table; private `reports` storage bucket with folder isolation |
| **AI Models** | Google Gemini (`@google/generative-ai`) | Primary: `gemini-3-flash-preview`; Fallback: `gemini-flash-lite-latest`; Embeddings: `text-embedding-004` |
| **Payments** | Razorpay SDK (`razorpay` v2.9) | Server-bound orders, HMAC SHA256 signature verification |
| **Styling** | Tailwind CSS v4 + `@base-ui/react` | Modern CSS variables, dark/light theme support |
| **Component Library** | shadcn/ui + Lucide Icons | Clean accessible components |
| **Form & Env Validation** | Zod v4 + `@t3-oss/env-nextjs` | Build-safe env schema with placeholder defaults |
| **Email Delivery** | Resend (`resend` v6.18) | Fallback to FormSubmit / shareable invite token |
| **Charts** | Recharts v3.9 | Interactive lab biomarker trends |

---

## 4. What Was Done & Verified (Engineering Audit)

### Clerk Complete Removal & Supabase Auth Migration (2026-10-21)
1. **Clerk Elimination:**
   - Completely uninstalled `@clerk/nextjs` and `@clerk/ui`.
   - Removed all `CLERK_*` and `NEXT_PUBLIC_CLERK_*` variables from `src/env.ts` and `.env.example`.
   - Removed all Clerk webhooks, shims, and catch-all routes (`[[...sign-in]]`, `[[...sign-up]]`).
   - Cleaned all residual `@clerk` imports across 100% of the codebase.
2. **Supabase Auth Implementation (`@supabase/ssr`):**
   - Implemented browser client (`src/lib/supabase/client.ts`) with `createBrowserClient`.
   - Implemented server client (`src/lib/supabase/server.ts`) with `createServerClient` reading/writing cookies via Next.js `cookies()`.
   - Implemented cookie session refresh in `src/middleware.ts` & `src/lib/supabase/middleware.ts` with route protection redirecting `/dashboard(.*)` to `/sign-in`.
   - Built custom branded `/sign-in` and `/sign-up` UI with Email/Password + Google OAuth and Next.js `<Suspense>` boundaries.
   - Built PKCE OAuth and email verification exchange in `/api/auth/callback/route.ts`.
   - Built server sign-out in `/api/auth/sign-out/route.ts`.
   - Built `AuthProvider` in `src/components/auth-context.tsx` offering `useUser()`, `useAuth()`, and `<Show>` components.
3. **Database Schema Modernization:**
   - `public.users.id` converted to `UUID REFERENCES auth.users(id) ON DELETE CASCADE`.
   - All relational foreign keys (`patient_id`, `user_id`, `owner_id`, `member_id`, `actor_id`) converted to `UUID`.
   - All RLS policies updated to native PostgreSQL `auth.uid()`.
   - PostgreSQL trigger `on_auth_user_created` created on `auth.users` to automatically synchronize `public.users` and `public.patients`.
   - Storage RLS policies updated to `(storage.foldername(name))[1] = auth.uid()::text`.
   - Complete consolidated migration available at `supabase/migrations/COMBINED_ALL_MIGRATIONS.sql`.
4. **Verification Gates Passed:**
   - **Unit Tests:** `npm test` -> **27/27 tests passed** (0 failures).
   - **TypeScript Application:** `npx tsc --noEmit` -> **0 errors (Exit code 0)**.
   - **TypeScript Tests:** `npx tsc -p tsconfig.tests.json` -> **0 errors (Exit code 0)**.
   - **Linter:** `npm run lint` -> **0 warnings, 0 errors (Exit code 0)**.
   - **Production Build:** `npm run build` -> **All 47 static & dynamic routes compiled and optimized (Exit code 0)**.

---

## 5. Architectural Deep Dives

### A. Authentication & User Provisioning (Native Supabase Auth)
1. **Identity Provider:** Supabase Auth manages users in the `auth.users` table.
2. **Session Storage:** `@supabase/ssr` stores access and refresh tokens in HTTP cookies.
3. **Middleware Token Refresh:** `src/middleware.ts` calls `updateSession()`, which refreshes expired JWT tokens on incoming requests and sets updated cookies on both request and response.
4. **PostgreSQL Trigger Provisioning:**
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.users (id, email, first_name, last_name, role)
     VALUES (
       NEW.id,
       NEW.email,
       COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1)),
       COALESCE(NEW.raw_user_meta_data->>'last_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2)),
       'patient'
     ) ON CONFLICT (id) DO NOTHING;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```
5. **Privilege Escalation Prevention:** The `role` column defaults to `'patient'` and is excluded from normal user UPDATE grants.

### B. Guest Teaser & Post-Signup Migration Flow
1. **Unauthenticated Upload:**
   - A visitor on `/` uploads a medical report (up to 20 MB).
   - If the file is >3 MB, the client chunks it to bypass Vercel's ~4.5 MB request body limit.
   - `/api/public/analyze` reassembles the chunks in Supabase storage (`__guest__/_uploads/<uploadId>/`), calls Gemini for structured data extraction, and stores the result in `public.preview_tokens`.
   - Returns a `token` to the client.
2. **Preview Page:**
   - Visitor navigates to `/preview/[token]`.
   - Sees a 70% blurred teaser preview highlighting extracted lab flags and summary, prompting them to create an account.
   - The token is saved in `localStorage.setItem('caredesk_preview_token', token)`.
3. **Sign-up & Automatic Migration:**
   - The visitor clicks "Sign Up", creating an account via Supabase Auth.
   - Redirects to `/dashboard`.
   - The `<GuestMigration />` component mounted in `DashboardLayout` detects `caredesk_preview_token`.
   - Calls `POST /api/public/migrate`.
   - Migration logic in `src/lib/guest-migration.ts`:
     - Ensures the user is provisioned in `public.users` and `public.patients`.
     - Moves the file in Supabase storage from `__guest__/` to `<userId>/<timestamp>-<filename>`.
     - Inserts the report into `public.reports` with status `ready`.
     - Inserts extracted records into `public.lab_results`, `public.medications`, `public.conditions`.
     - Stamps `preview_tokens` with `migrated_user_id` and `migrated_at` to prevent replay attacks.
     - Clears the token from `localStorage` and redirects to `/dashboard/reports`.

### C. AI Report Analysis & Grounded Chat Pipeline
1. **Analysis Pipeline (`src/lib/ai/analyze-report.ts`):**
   - Files under 18 MB are passed directly as inline data (PDF/Image) to Gemini.
   - Structured JSON is requested via strict prompt format.
   - Extracted results are written to normalized relational tables (`lab_results`, `medications`, `conditions`).
2. **AI Chat Pipeline (`src/lib/ai/chat.ts`):**
   - Retrieves the patient's top 20 recent reports, 50 latest lab results, active medications, and conditions from Supabase.
   - Synthesizes this into a contextual medical system prompt.
   - Calls Gemini (`gemini-3-flash-preview` with automatic fallback to `gemini-flash-lite-latest` on 429/503/404 errors).
   - Saves both user query and assistant reply in `chat_messages`.

### D. Subscriptions & Payments (Razorpay)
1. **Plan Tiers:** Defined in `src/lib/razorpay.ts`:
   - `free`: 2 lifetime uploads, standard AI chat (5 msgs/day).
   - `pro_individual_monthly` / `pro_individual_annual`: 10 reports/month, unlimited chat, trend graphs.
   - `family_monthly` / `family_annual`: Unlimited reports, 5 member profiles.
2. **Server-Bound Orders (`/api/razorpay/order`):**
   - Order amount is calculated strictly on the server and saved in `public.razorpay_orders` with status `created`.
3. **Verification (`/api/razorpay/verify`):**
   - Validates the Razorpay HMAC SHA256 signature (`razorpay_order_id|razorpay_payment_id`).
   - Marks order `completed` and upserts `public.subscriptions`.
   - Webhook (`/api/razorpay/webhook`) acts as a secondary idempotent activation channel.

---

## 6. Database Schema Reference

All tables reside in the `public` schema and enforce RLS:

| Table | Primary Key | Key Columns & Foreign Keys | Purpose |
|---|---|---|---|
| `users` | `id UUID` -> `auth.users.id` | `email`, `first_name`, `last_name`, `role` (`patient\|doctor\|admin`) | Core user identity (synced from auth.users) |
| `patients` | `id UUID` -> `users.id` | `date_of_birth`, `gender`, `blood_type` | Patient profile attributes |
| `doctors` | `id UUID` -> `users.id` | `clinic_name`, `specialty`, `npi_number`, `is_verified` | Doctor profile (portal deferred to Phase 2) |
| `patient_doctor_relations`| `UUID` | `doctor_id`, `patient_id`, `status` | Mutual access consent between doctor and patient |
| `reports` | `UUID` | `patient_id` -> `users.id`, `title`, `file_path`, `ai_summary`, `status` | Medical documents metadata & AI summary |
| `report_embeddings` | `UUID` | `report_id`, `patient_id`, `chunk_content`, `embedding vector(768)` | Vector chunks for pgvector RAG |
| `lab_results` | `UUID` | `report_id`, `patient_id`, `test_name`, `value`, `unit`, `flag`, `test_date` | Normalized laboratory biomarkers |
| `medications` | `UUID` | `report_id`, `patient_id`, `name`, `dose`, `frequency`, `status` | Patient prescription records |
| `conditions` | `UUID` | `report_id`, `patient_id`, `name`, `status`, `diagnosed_at` | Medical diagnoses & chronic conditions |
| `chat_messages` | `UUID` | `user_id` -> `users.id`, `role`, `content` | Grounded chat history |
| `analytics_snapshots` | `user_id UUID` | `data JSONB`, `updated_at` | Computed health scores, trends, insights |
| `family_members` | `UUID` | `owner_id`, `member_id`, `relation`, `status` (`accepted\|pending_owner`) | Mutual caregiver connections |
| `family_invites` | `UUID` | `owner_id`, `email`, `token`, `status` | Pending invitation tokens |
| `library_settings` | `user_id UUID` | `password_hash`, `salt` | Scrypt password protection for report library |
| `audit_logs` | `UUID` | `actor_id`, `action`, `table_name`, `record_id`, `ip_address` | HIPAA access audit trail (service-role only) |
| `deleted_users` | `id UUID` | `deleted_at` | Tombstones preventing deleted account resurrection |
| `feedback` | `UUID` | `user_id UUID`, `would_use`, `liked`, `missing` | In-app user feedback |
| `subscriptions` | `user_id UUID` | `plan`, `status`, `current_period_end` | User subscription tier & status |
| `razorpay_orders` | `UUID` | `order_id TEXT UNIQUE`, `user_id UUID`, `plan`, `amount`, `status` | Server-side payment orders |
| `preview_tokens` | `token TEXT` | `file_path`, `summary`, `lab_results`, `migrated_user_id`, `migrated_at` | Guest uploads & teaser data |

---

## 7. Environment Variables Reference

Defined and validated in `src/env.ts` with safe placeholders for CI/build:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google Gemini AI (required for report analysis & chat)
GEMINI_API_KEY=AIza...

# Payments (Optional in dev, required for upgrade flow)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RAZORPAY_PLAN_PRO_INDIVIDUAL_MONTHLY=...
RAZORPAY_PLAN_PRO_INDIVIDUAL_ANNUAL=...
RAZORPAY_PLAN_FAMILY_MONTHLY=...
RAZORPAY_PLAN_FAMILY_ANNUAL=...

# Email Invites (Optional — falls back to FormSubmit / copyable code)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=CareDesk <onboarding@resend.dev>
```

---

## 8. Development & Operations Runbook

All commands must be executed within `CareDesk-ip-reviewmaker-main\CareDesk-ip-reviewmaker-main`:

```bash
# 1. Run local development server (with Turbopack)
npm run dev

# 2. Run unit test suite (27 tests)
npm test

# 3. Run TypeScript typecheck (Application + Tests)
npx tsc --noEmit
npx tsc -p tsconfig.tests.json

# 4. Run ESLint
npm run lint

# 5. Run production build
npm run build

# 6. Verify RLS against live database (requires real Supabase JWTs)
node scripts/verify-rls.mjs
```

---

## 9. Git Repository & Commits Note

As specified in `instructions_for_coding_ai_agent.md`:
- **Target Git Repository:** `https://github.com/Aaravthecoder106/CareDesk_2.0_resuingtheoldone`
- When initializing git or committing, set remote origin to this URL:
  ```bash
  git init
  git remote add origin https://github.com/Aaravthecoder106/CareDesk_2.0_resuingtheoldone.git
  ```
- **Important:** Keep `.env` and `.env.local` strictly in `.gitignore`. Never commit live API keys or secrets.

---

## 10. Summary Checklist for Future AI Agents

Before declaring any task complete:
1. Always run `npm test` and ensure all 27 tests pass.
2. Always run `npx tsc --noEmit` and ensure 0 TypeScript compilation errors.
3. Always run `npm run lint` and maintain 0 lint errors.
4. If modifying database schemas, update both `supabase/migrations/COMBINED_ALL_MIGRATIONS.sql` and `src/lib/supabase/types.ts`.
5. Keep public API routes protected with Zod validation schemas (`src/lib/validations.ts`) and rate limiting (`src/lib/rate-limit.ts`).
6. Respect Row Level Security:
   - For client components: use `createBrowserSupabaseClient()` from `@/lib/supabase/client` or session hooks from `@/components/auth-context`.
   - For server-side Route Handlers/Server Components: use `createClient()` from `@/lib/supabase/server`.
   - For system/AI pipeline writes bypassing RLS: use `createAdminSupabaseClient()` from `@/lib/supabase/admin`.
