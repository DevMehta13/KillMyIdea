# Architecture

Technical architecture for Kill My Idea. References PRD at `/docs/killMyIdea_prd.pdf`.

---

## Stack

| Layer | Choice | Constraint |
|-------|--------|------------|
| Framework | Next.js 14+ (App Router, TypeScript) | Free Vercel hosting |
| Styling | Tailwind CSS + shadcn/ui | No runtime CSS |
| Database | Supabase PostgreSQL | Free tier (500MB) |
| Auth | Supabase Auth (email + Google OAuth) | Free tier (50K MAU) |
| Primary LLM | Google Gemini 1.5 (Flash + Pro) | Free: 15 RPM, 1M tokens/min |
| Fallback LLM | Groq (Llama 3 / Mixtral) | Free: 30 RPM |
| Community signals | HackerNews Algolia API | Free, no auth, no rate limit (DEC-012) |
| Category classification | LLM inline (Gemini) | Part of pipeline step 1 (DEC-016) |
| Payments | Razorpay (test mode) | INR pricing, India-focused |
| Deployment | Vercel (app) + Supabase (DB/auth) | Both free tier |

**v2 signal providers (not in v1 — DEC-011):**
| Provider | Purpose | Why deferred |
|----------|---------|-------------|
| SerpAPI | Google search results + Google Trends | 100 searches/month budget cap too restrictive for v1 |
| Reddit API | Community pain-point discussions | Requires paid access since 2023 |
| Other paid search APIs | Broader signal diversity | Zero-budget constraint |

---

## App Structure

```
src/
├── app/
│   ├── layout.tsx                          # Root: AuthProvider, fonts, Toaster
│   ├── globals.css                         # Tailwind base + custom tokens
│   ├── middleware.ts                       # Route protection (auth + role checks)
│   ├── error.tsx                           # Global error boundary
│   ├── not-found.tsx                       # 404 page
│   │
│   ├── (marketing)/                        # Public pages — MarketingNavbar + Footer
│   │   ├── layout.tsx
│   │   ├── page.tsx                        # Landing page (/)
│   │   ├── pricing/page.tsx
│   │   ├── report/[shareId]/page.tsx       # Public shared report
│   │   └── roast/[shareId]/page.tsx        # Public shared roast
│   │
│   ├── (auth)/                             # Auth pages — minimal centered layout
│   │   ├── layout.tsx
│   │   ├── signin/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── (app)/                              # Authenticated app — AppNavbar + Sidebar
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── ideas/
│   │   │   ├── new/page.tsx                # Multi-step idea wizard
│   │   │   └── [ideaId]/
│   │   │       ├── page.tsx                # Idea detail + version history
│   │   │       ├── clarify/page.tsx        # Answer clarification questions
│   │   │       └── report/[runId]/
│   │   │           ├── page.tsx            # Full verdict report
│   │   │           └── progress/page.tsx   # Real-time analysis progress
│   │   ├── compare/page.tsx
│   │   └── settings/
│   │       ├── page.tsx                    # Profile
│   │       └── billing/page.tsx            # Credits + transactions
│   │
│   ├── (admin)/                            # Admin — AppNavbar + AdminSidebar
│   │   └── admin/
│   │       ├── page.tsx                    # Metrics dashboard
│   │       ├── prompts/page.tsx
│   │       ├── jobs/page.tsx
│   │       ├── analytics/page.tsx
│   │       ├── users/page.tsx
│   │       └── moderation/page.tsx
│   │
│   ├── auth/callback/route.ts              # OAuth callback handler
│   │
│   └── api/                                # API routes (see API_CONTRACTS.md)
│       ├── quick-roast/route.ts
│       ├── ideas/
│       ├── credits/
│       ├── share/
│       ├── admin/
│       └── webhooks/
│
├── components/
│   ├── ui/                                 # shadcn/ui primitives (auto-generated)
│   ├── layout/                             # Navbar, Sidebar, Footer
│   ├── marketing/                          # Landing page sections
│   ├── auth/                               # Auth forms
│   ├── idea/                               # Idea input/display components
│   ├── analysis/                           # Progress tracking
│   ├── report/                             # Verdict, scores, evidence, flags
│   ├── compare/                            # Side-by-side comparison
│   ├── dashboard/                          # Dashboard widgets
│   ├── billing/                            # Credits, transactions, checkout
│   ├── admin/                              # Admin panel components
│   └── shared/                             # Reusable cross-feature components
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                       # Browser Supabase client
│   │   ├── server.ts                       # Server Supabase client (service role)
│   │   └── middleware.ts                   # Middleware Supabase client
│   ├── auth/
│   │   ├── provider.tsx                    # AuthProvider React context
│   │   └── hooks.ts                        # useAuth, useUser, useRequireAuth
│   ├── api/                                # Client-side API call functions
│   ├── hooks/                              # React hooks (data fetching, UI state)
│   ├── pipeline/
│   │   ├── ai/
│   │   │   ├── gemini-client.ts            # Gemini API wrapper
│   │   │   ├── groq-client.ts              # Groq API wrapper
│   │   │   ├── rate-limiter.ts             # Per-provider rate limiting
│   │   │   └── retry.ts                    # Exponential backoff with fallback
│   │   ├── steps/
│   │   │   ├── 01-interpret.ts             # Raw idea → structured interpretation
│   │   │   ├── 02-clarify.ts              # Generate clarification questions
│   │   │   ├── 03-collect-signals.ts       # Fetch market signals (parallel)
│   │   │   ├── 04-interpret-signals.ts     # Raw signals → dimension insights
│   │   │   ├── 05-score.ts                 # Weighted scoring (deterministic)
│   │   │   ├── 06-verdict.ts              # Verdict + guardrail overrides
│   │   │   └── 07-report.ts               # Generate full report
│   │   ├── scoring/
│   │   │   ├── weighted-scorer.ts          # Score calculation logic
│   │   │   ├── logic-overrides.ts          # 5 guardrail rules from PRD
│   │   │   ├── category-weights.ts         # Per-category weight adjustments (±3% per dimension)
│   │   │   └── source-affinity.ts          # Category-source affinity map (reduces HN weight for non-tech categories)
│   │   ├── signals/
│   │   │   ├── types.ts                    # Signal provider interface (modular — DEC-011)
│   │   │   └── hackernews.ts               # HackerNews Algolia API (v1 signal source — DEC-012)
│   │   ├── ml/
│   │   │   └── categorizer.ts              # LLM inline classification (DEC-016)
│   │   └── orchestrator.ts                 # Step sequencing + status updates
│   ├── utils/
│   │   ├── validators.ts                   # Zod schemas
│   │   └── formatters.ts                   # Date, number, score formatting
│   └── constants.ts                        # Scoring weights, verdict thresholds, etc.
│
├── types/
│   ├── database.ts                         # Supabase row types (mirrors DB_SCHEMA.md)
│   ├── pipeline.ts                         # Pipeline step input/output types
│   └── api.ts                              # API request/response types
│
└── middleware.ts                           # Next.js middleware (auth + route protection)

supabase/
└── migrations/
    └── 001_initial_schema.sql              # Full schema (see DB_SCHEMA.md)

ml/                                         # ML model training (OPTIONAL — not needed for v1, see DEC-016)
├── generate_dataset.py
├── train_categorizer.py
└── data/
```

---

## Route Architecture

Four route groups with distinct layouts:

| Group | Layout | Purpose | Auth Required |
|-------|--------|---------|---------------|
| `(marketing)` | MarketingNavbar + Footer | Public-facing pages | No |
| `(auth)` | Minimal centered | Sign in/up, password reset | No |
| `(app)` | AppNavbar + Sidebar | Main product experience | Yes (any role) |
| `(admin)` | AppNavbar + AdminSidebar | Admin operations | Yes (admin role) |

Public routes (no auth): `/`, `/pricing`, `/signin`, `/signup`, `/forgot-password`, `/reset-password`, `/report/[shareId]`, `/roast/[shareId]`

Protected routes (registered user): `/dashboard`, `/ideas/*`, `/compare`, `/settings/*`

Admin routes (admin role only): `/admin/*`

---

## Auth Model

**Provider:** Supabase Auth

**Methods:**
- Email/password (primary)
- Google OAuth (secondary)

**Roles:**
- `visitor` — unauthenticated, can use Quick Roast
- `registered` — authenticated, can create ideas, run limited analyses
- `paid` — has purchased credits, full report access
- `admin` — system operator

**Implementation:**
- `AuthProvider` context wraps the app, provides `useAuth()` hook
- `middleware.ts` checks auth state on every request:
  - Refreshes Supabase session tokens
  - Redirects unauthenticated users from protected routes to `/signin`
  - Redirects non-admin users from `/admin/*` to `/dashboard`
- Role stored in `profiles.role` column
- Plan stored in `profiles.plan` column (free / starter / pro)
- Credit balance stored in `profiles.credit_balance` (integer)

**Session handling:**
- Supabase `@supabase/ssr` handles cookie-based sessions
- Server components and API routes use `createServerClient`
- Client components use `createBrowserClient`

---

## Backend Structure

**API routes** follow Next.js App Router convention (`src/app/api/`). Each route file exports HTTP method handlers (`GET`, `POST`, `PATCH`, `DELETE`).

**Separation of concerns:**
- Route handlers validate input (Zod) and handle HTTP concerns
- Business logic lives in `src/lib/` (pipeline, auth, etc.)
- Database access uses Supabase client directly (no ORM layer needed for this scale)

**Input validation:**
- All API routes validate request bodies with Zod schemas
- Schemas defined in `src/lib/utils/validators.ts` and co-located with types
- Invalid input returns 400 with structured error response

**Error responses:**
```typescript
// Standard error shape for all API routes
{
  error: string;          // Machine-readable error code
  message: string;        // Human-readable message
  details?: unknown;      // Optional validation details
}
```

**Auth in API routes:**
- Read session from Supabase server client
- Return 401 if unauthenticated (for protected routes)
- Return 403 if wrong role (for admin routes)

---

## Pipeline Execution Model

**Approved approach: Client-driven sequential (DEC-009, DEC-015)**

The analysis pipeline runs as a series of independent API calls, each completing within 10 seconds. The client (browser) orchestrates the sequence.

```
Client                          Server
  │                               │
  ├── POST /api/ideas/[id]/analyze ──→ Create analysis_run (QUEUED)
  │                                     Deduct credits
  │◄─── { runId, status: QUEUED } ────┤
  │                               │
  ├── POST /api/pipeline/interpret ──→ Run step 1 (Gemini Flash)
  │                                     Update status → INTERPRETING
  │◄─── { interpretation } ───────┤
  │                               │
  ├── POST /api/pipeline/clarify ───→ Run step 2 (Gemini Flash)
  │                                     Update status → CLARIFYING
  │◄─── { questions[] } ──────────┤
  │                               │
  │  [User answers questions in UI]
  │                               │
  ├── POST /api/pipeline/signals ───→ Run step 3 (parallel signal fetch)
  │                                     Update status → COLLECTING_SIGNALS
  │◄─── { signals[] } ────────────┤
  │                               │
  ├── POST /api/pipeline/interpret-signals → Run step 4 (Gemini Pro)
  │                                           Update status → INTERPRETING_SIGNALS
  │◄─── { dimensionInsights[] } ──┤
  │                               │
  ├── POST /api/pipeline/score ─────→ Run step 5 (deterministic)
  │                                     Update status → SCORING
  │◄─── { scores, overall } ──────┤
  │                               │
  ├── POST /api/pipeline/verdict ───→ Run step 6 (deterministic)
  │                                     Update status → GENERATING_VERDICT
  │◄─── { verdict, overrides } ───┤
  │                               │
  ├── POST /api/pipeline/report ────→ Run step 7 (Gemini Pro)
  │                                     Update status → GENERATING_REPORT
  │◄─── { report } ───────────────┤
  │                               │
  │  [Redirect to report page]
  │                               │
```

**Why this approach:**
- Each API call stays under 10s (Vercel free tier limit)
- Natural progress tracking — UI updates between steps
- Pipeline is resumable — if a step fails, retry from that step
- No cron jobs needed (Vercel free tier doesn't support them)

**Signal degradation behavior (DEC-011):**
- If HackerNews (or any future provider) fails during step 3, **do not fail the analysis**.
- Continue the pipeline with whatever evidence is available: structured user input from clarification answers, LLM-driven competitor analysis from step 1 interpretation, and any signals that did succeed.
- Step 4 (interpret-signals) must note which sources were unavailable and lower confidence on dimensions that depended on missing data.
- Step 6 (verdict) already has a guardrail: 4+ low-confidence dimensions → Insufficient Data. This is the only path to Insufficient Data from signal failure — it is not triggered by a single provider being down.
- The report must display a **partial-signal warning** banner when any provider failed, listing which sources were unavailable.

**Category-source affinity (DEC-011, DEC-016):**
- The scoring engine maintains a category-source affinity map (`source-affinity.ts`).
- For idea categories outside HackerNews's natural strength (e.g., healthcare, hardware, fintech), community-signal impact on scoring dimensions is reduced.
- This prevents the scoring engine from penalizing ideas simply because their category has weak representation on HN.

**Category classification stability (DEC-016):**
- Category is classified via LLM structured JSON mode using the fixed 10-class taxonomy.
- The selected category is persisted in `analysis_runs.input_snapshot` at the start of each run.
- On rerun of an unchanged idea, the previous category is reused. Reclassification only occurs if the user materially edits the idea (title, raw_input, or problem_statement).
- Category weighting adjustments are secondary (±3% per dimension) to direct signal evidence.

**Status lifecycle:**
```
QUEUED → INTERPRETING → CLARIFYING → WAITING_FOR_CLARIFICATION
  → COLLECTING_SIGNALS → INTERPRETING_SIGNALS → SCORING
  → GENERATING_VERDICT → GENERATING_REPORT → COMPLETED
```
At any point: `→ FAILED` (with error details stored in `analysis_runs.error`). Note: individual signal provider failures do NOT trigger FAILED status — only total pipeline-level failures do.

---

## Third-Party Integrations

| Service | Purpose | Rate Limit | Budget Concern |
|---------|---------|------------|----------------|
| Gemini API | Steps 1, 2, 4, 7 + category classification | 15 RPM | Token-based rate limiting |
| Groq API | Fallback for Gemini | 30 RPM | Used only on Gemini failure |
| HackerNews Algolia API | Community signals (v1 signal source) | None | Free, no auth, no key needed |
| Razorpay | Payment processing | No limit (test mode) | Test mode only |
| Supabase | DB + Auth | Free tier limits | 500MB DB, 50K MAU |

**Not in v1 (DEC-011, DEC-016):**
- ~~SerpAPI~~ — removed, budget cap too restrictive
- ~~Reddit API~~ — removed, requires paid access
- ~~HuggingFace Inference~~ — LLM inline classification used instead

**Rate limiter design:**
- Cannot use in-memory rate limiting (serverless = each invocation is isolated)
- Use Supabase table or `admin_settings` key-value to track request counts per provider per minute
- Check before each LLM call; if at limit, wait or fail with retry-after header

---

## Environment Separation

| Variable | Dev | Production | Notes |
|----------|-----|------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Same or separate project | Consider separate for prod |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | Anon key | Public, safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Service role key | Server-only, never expose |
| `GEMINI_API_KEY` | Personal key | Same | Server-only |
| `GROQ_API_KEY` | Personal key | Same | Server-only |
| `RAZORPAY_KEY_ID` | Test mode key | Test or live key | |
| `RAZORPAY_KEY_SECRET` | Test mode secret | Test or live secret | Server-only |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Test mode key | Test or live key | Public, for checkout |

**Security rules:**
- Never prefix server-only keys with `NEXT_PUBLIC_`
- `.env.local` is gitignored
- Vercel environment variables set via dashboard
- Service role key gives full DB access — only use in API routes, never in client code

---

## Observability

**Minimum viable for v1:**
- Console logging in API routes and pipeline steps (structured JSON)
- Error tracking: try/catch in every pipeline step, store error in `analysis_runs.error`
- Admin job monitor: query `analysis_runs` table for status distribution
- Signal provider health: track which providers succeeded/failed per analysis run

**Not in v1:**
- No external logging service (Sentry, LogRocket, etc.)
- No APM or tracing
- No custom metrics beyond admin dashboard queries

**Future consideration:**
- Vercel's built-in analytics (free tier available)
- Supabase logs (available in dashboard)
