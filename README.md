# CareDesk

AI-powered healthcare platform for patients and caregivers. Upload medical reports, chat with AI about your health data, visualize trends, and share insights with family.

## Features

- **Report Library** — Upload PDFs and images, AI auto-analyzes and extracts lab results, medications, and conditions
- **AI Chat** — Ask questions about your health data; AI uses your full report library for context
- **Analytics** — Interactive charts, health scores, lab trends, and AI-generated insights
- **Family Sharing** — Invite family members, share analytics, get notified about health changes
- **Library Password** — Optional password lock for your report library
- **Row-Level Security** — Every table is protected; your data is isolated and encrypted

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript (strict) |
| Auth | Supabase Auth (@supabase/ssr) |
| Database | Supabase (PostgreSQL + pgvector) |
| AI | Google Gemini (free tier) |
| UI | shadcn/ui + Tailwind CSS v4 + Recharts |
| Validation | Zod + @t3-oss/env-nextjs |

## Project Structure

```
caredesk/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/
│   │   │   ├── auth/               # Supabase PKCE callback & sign-out
│   │   │   ├── reports/            # Upload, presign, list, delete, analyze
│   │   │   ├── chat/               # AI chat + history
│   │   │   ├── analytics/          # Data + regenerate
│   │   │   ├── family/             # Invite, accept, confirm, members
│   │   │   ├── razorpay/           # Order, verify, webhook
│   │   │   ├── subscription/       # Tier + usage status
│   │   │   ├── library/            # Password lock
│   │   │   └── feedback/           # User feedback
│   │   ├── dashboard/              # Authenticated pages
│   │   │   ├── reports/            # Report library UI
│   │   │   ├── chat/               # AI chat UI
│   │   │   ├── analytics/          # Charts & graphs
│   │   │   ├── family/             # Family sharing
│   │   │   ├── settings/           # Library password settings
│   │   │   └── upgrade/            # Pricing & checkout
│   │   ├── sign-in/                # Supabase Auth sign-in (Email + Google)
│   │   ├── sign-up/                # Supabase Auth sign-up (Email + Google)
│   │   ├── layout.tsx              # Root layout (providers)
│   │   ├── page.tsx                # Landing page
│   │   └── globals.css             # Tailwind + shadcn variables
│   ├── components/
│   │   ├── ui/                     # shadcn components
│   │   ├── auth-context.tsx        # Supabase Auth context & session hooks
│   │   ├── header.tsx              # Public header
│   │   ├── sidebar.tsx             # Dashboard sidebar
│   │   ├── mobile-nav.tsx          # Mobile nav
│   │   └── feedback-widget.tsx     # Feedback modal
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── gemini.ts           # Gemini client (model fallbacks)
│   │   │   ├── analyze-report.ts   # Report analysis pipeline
│   │   │   └── chat.ts             # AI chat with context
│   │   ├── data/
│   │   │   ├── reports.ts          # Report CRUD
│   │   │   ├── chat.ts             # Chat history
│   │   │   ├── analytics.ts        # Analytics read/write
│   │   │   ├── family.ts           # Family members & invites
│   │   │   ├── library.ts          # Library password
│   │   │   ├── users.ts            # User identity
│   │   │   ├── provisioning.ts     # User & patient profile provisioning
│   │   │   ├── subscriptions.ts    # Plan tiers + usage
│   │   │   └── audit.ts            # Audit logging
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser Supabase client (@supabase/ssr)
│   │   │   ├── server.ts           # Server Supabase client with cookies
│   │   │   ├── middleware.ts       # Auth session refresh & route protection
│   │   │   ├── admin.ts            # Service-role client
│   │   │   └── types.ts            # DB type definitions
│   │   └── ...
│   ├── env.ts                      # Env validation
│   └── middleware.ts               # Supabase Auth session & route guard
├── supabase/
│   └── migrations/
│       ├── 0000_initial.sql        # Full schema (16 tables + storage)
│       ├── 0001_user_provisioning.sql
│       ├── 0002_deletion_tombstone.sql
│       ├── 0003_feedback.sql
│       └── 0004_subscriptions.sql
└── tests/
    └── provisioning.test.ts        # Unit tests
```

## Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account
- A [Google AI Studio](https://aistudio.google.com/apikey) account (free)

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click **New Project**
3. Choose a name, database password, and region
4. Wait ~2 minutes for provisioning

### 2. Run the Database Migrations

In the Supabase dashboard, go to **SQL Editor** (left sidebar).

You can apply everything in one shot:
- Copy the entire contents of `supabase/migrations/COMBINED_ALL_MIGRATIONS.sql`
- Paste into the SQL Editor and click **Run**.

This sets up:
- 16 tables (users referencing `auth.users(id)`, patients, doctors, reports, lab_results, medications, conditions, chat_messages, analytics_snapshots, family_members, family_invites, notifications, library_settings, audit_logs, deleted_users, report_embeddings)
- Automatic user provisioning trigger on `auth.users` to keep `public.users` and `public.patients` in sync
- Row Level Security policies on every table using native `auth.uid()`
- A private `reports` storage bucket with folder-level ownership policies
- Family-sharing RPC functions (accept_family_invite, confirm_family_member)
- Subscriptions and razorpay orders tables

### 3. Get Supabase Keys

Go to **Project Settings → API** in the Supabase dashboard and copy:

| Key | Where |
|-----|-------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

### 4. Supabase Authentication Setup

1. In Supabase Dashboard, go to **Authentication → Providers**.
2. **Email**: Enabled by default. For seamless instant signup without email confirmation friction during dev/testing, ensure **Confirm email** is toggled off (or on if you prefer email verification links).
3. **Google (Optional)**: If you wish to use Google OAuth:
   - Enable the Google provider under **Authentication → Providers → Google**.
   - Add your Google OAuth Client ID and Secret from Google Cloud Console.
   - Set Authorized Redirect URI in Google Cloud Console to `https://<your-project-ref>.supabase.co/auth/v1/callback`.
4. Under **Authentication → URL Configuration**, set:
   - **Site URL**: `http://localhost:3000` (or your production URL)
   - **Redirect URLs**: Add `http://localhost:3000/**` and `https://your-domain.com/**`

### 5. Get Gemini API Key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create a free API key
3. Add to `.env` as `GEMINI_API_KEY=your_key`

### 6. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```env
# Core (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI (required for report analysis & chat)
GEMINI_API_KEY=AIza...

# Payments (optional — upgrade page shows a friendly error without them)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Email invites (optional — falls back to a shareable invite code)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=CareDesk <onboarding@resend.dev>
```

Optional integrations fail gracefully:
- **Gemini missing** → report analysis/chat return a clear "AI not configured" error
- **Razorpay missing** → upgrade/checkout is disabled with a friendly message
- **Resend missing** → family invites return a copyable code (WhatsApp/SMS fallback)

### 7. (Optional) Set Up Razorpay

1. Go to [razorpay.com](https://razorpay.com) and create an account
2. Copy keys from **Settings → API Keys**:
   - **Key ID** → `RAZORPAY_KEY_ID`
   - **Key Secret** → `RAZORPAY_KEY_SECRET`
3. Go to **Settings → Webhooks** → Create webhook:
   - URL: `https://your-domain.com/api/razorpay/webhook`
   - Events: `payment.captured`
   - Copy the **Secret** → `RAZORPAY_WEBHOOK_SECRET`

### 8. (Optional) Set Up Resend for Invite Emails

1. Go to [resend.com](https://resend.com) and sign up
2. Create an API key → `RESEND_API_KEY`
3. Set a verified sender → `RESEND_FROM_EMAIL`

Without Resend, family invites still work — the UI shows the invite code for manual sharing (WhatsApp/SMS/copy).

### 9. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Identity (references `auth.users(id)` ON DELETE CASCADE, UUID primary key) |
| `patients` | Patient profiles (1:1 with users) |
| `doctors` | Doctor profiles (portal deferred) |
| `patient_doctor_relations` | Consent edges between doctors and patients |
| `reports` | Medical report metadata + AI summary |
| `report_embeddings` | pgvector embeddings for RAG (768 dims) |
| `lab_results` | Normalized lab test data |
| `medications` | Patient medications |
| `conditions` | Diagnosed conditions |
| `chat_messages` | AI chat history |
| `analytics_snapshots` | JSONB analytics data |
| `family_members` | Mutual-consent family links |
| `family_invites` | Token-based family invites |
| `notifications` | User notifications |
| `library_settings` | Password hash + salt for library lock |
| `audit_logs` | HIPAA audit trail (service-role only) |
| `deleted_users` | Deletion tombstones |
| `feedback` | In-app feedback widget submissions |
| `subscriptions` | Plan tier, status, and period |
| `razorpay_orders` | Payment orders (idempotent activation) |

### Enums

- `user_role`: `patient`, `doctor`, `admin`
- `report_status`: `pending`, `processing`, `ready`, `failed`

### Security

- **RLS on every table** — policies use native `auth.uid()` for JWT identity validation
- **Column-level grants** — `role` column excluded from UPDATE to prevent self-promotion
- **Server & Browser Supabase clients** — `client.ts` (browser), `server.ts` (Next.js cookies/RLS-scoped), and `admin.ts` (service-role, bypasses RLS for AI/system tasks)
- **Storage policies** — folder-level ownership via `<user_id>/` path convention
- **Deletion tombstones** — records deleted user IDs to prevent resurrecting deleted accounts

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/webhooks/clerk` | POST | Clerk webhook (user sync) |
| `/api/reports/upload` | POST | Upload report to storage |
| `/api/reports/presign` | POST | Direct-upload URL (bypasses body-size limit) |
| `/api/reports/list` | GET | List user's reports |
| `/api/reports/delete` | DELETE | Delete report + storage file |
| `/api/reports/analyze` | POST | Re-analyze a report |
| `/api/reports/analyze-image` | POST | Analyze report image with Gemini vision |
| `/api/reports/preview` | GET | Signed preview URL for a report |
| `/api/chat` | POST | Send message, get AI reply |
| `/api/chat/history` | GET | Get chat history |
| `/api/chat/clear` | DELETE | Clear all chat messages |
| `/api/analytics/data` | GET | Get stored analytics |
| `/api/analytics/regenerate` | POST | AI-generate health analytics |
| `/api/family/invite` | POST | Create family invite |
| `/api/family/members` | GET | Get family members |
| `/api/family/invites` | GET | Get pending invites |
| `/api/family/accept` | POST | Accept invite (via RPC) |
| `/api/family/member` | POST/DELETE | Confirm or remove member |
| `/api/library/password` | POST | Set/verify/remove library password |
| `/api/feedback` | POST | Submit feedback (GET admin-only) |
| `/api/notifications` | GET/POST | List / mark notifications read |
| `/api/razorpay/order` | POST | Create payment order |
| `/api/razorpay/verify` | POST | Verify payment + activate plan |
| `/api/razorpay/webhook` | POST | Razorpay webhook (payment.captured) |
| `/api/subscription/status` | GET | Current tier, limits, and usage |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm test         # Run unit tests
```

## How It Works

### Auth Flow
1. User signs up via Clerk → webhook fires → `provisionUser()` creates `users` + `patients` rows
2. On first page load, `ensureCurrentUserProvisioned()` self-heals if webhook hasn't landed
3. All data queries use RLS-scoped client → user can only see their own data

### Report Analysis Pipeline
1. User uploads PDF/image → stored in Supabase Storage under `<user_id>/`
2. Background job calls Gemini → extracts summary, lab results, medications, conditions
3. Results written to `reports`, `lab_results`, `medications`, `conditions` tables
4. Analytics can be regenerated from this structured data

### AI Chat
1. User sends message → system fetches all reports, labs, meds, conditions from DB
2. Context injected into Gemini prompt → AI responds with personalized answer
3. Messages saved to `chat_messages` for history

### Family Sharing
1. Owner invites by email → creates `family_invites` row with random token
2. Invitee accepts (via `accept_family_invite` RPC) → creates `family_members` row (status: `pending_owner`)
3. Owner confirms (via `confirm_family_member` RPC) → status flips to `accepted`
4. Both can now read each other's `analytics_snapshots`

## License

Private — not for distribution.
