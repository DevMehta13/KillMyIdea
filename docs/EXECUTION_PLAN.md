# Execution Plan

Build-ready implementation plan for Kill My Idea. Derived from the PRD at `/docs/killMyIdea_prd.pdf` and technical architecture at `/docs/ARCHITECTURE.md`.

---

## Pre-Flight Checklist

Before starting Phase 1, ensure you have:

- [ ] Node.js 18+ installed
- [ ] A Supabase project created (https://supabase.com/dashboard) — URL and keys (anon + service role)
- [ ] Google AI Studio API key for Gemini (https://aistudio.google.com/apikey)
- [ ] Groq API key (https://console.groq.com/keys)

The following can be set up later (not needed until their respective phases):
- [ ] Razorpay test mode keys (Phase 9) — for billing

Not required for v1 (see `DECISIONS.md`):
- ~~SerpAPI key~~ — removed as v1 dependency (DEC-011). Can be added as optional signal provider later.
- ~~Reddit API credentials~~ — replaced by HackerNews Algolia API which requires no auth (DEC-012).
- ~~HuggingFace API token~~ — LLM inline classification used instead (DEC-016). ML model training is optional/deferred.

---

## Phase Dependency Chain

```
Phase 1: Foundation
    │
    ▼
Phase 2: Database & Auth
    │
    ▼
Phase 3: Layouts, Marketing & Auth Pages
    │
    ▼
Phase 4: AI Infrastructure & Quick Roast  ◄── First user-facing AI feature
    │
    ▼
Phase 5: Full Analysis Pipeline  ◄── Core product logic
    │
    ▼
Phase 6: Idea Flow & Dashboard  ◄── Full user journey works
    │
    ▼
Phase 7: Report Page  ◄── PRD Phase 1 complete (end-to-end analysis)
    │
    ├──────────────────────────────┐
    ▼                              ▼
Phase 8: Workspace & Compare    Phase 9: Billing & Credits
    │                              │
    └──────────┬───────────────────┘
               ▼
Phase 10: Share & Export  ◄── PRD Phase 2 complete (repeat usage + monetization)
    │
    ▼
Phase 11: ML Model Training & Integration
    │
    ▼
Phase 12: Admin Panel
    │
    ▼
Phase 13: Polish & Deploy  ◄── PRD Phase 3 / Production launch
```

**PRD alignment:**
- PRD Phase 1 (end-to-end analysis): Build Phases 1–7
- PRD Phase 2 (repeat usage + monetization): Build Phases 8–10
- PRD Phase 3 (expansion): Build Phases 11–13

---

## Phase 1: Foundation

**Goal:** Working Next.js project with directory structure, TypeScript types, Supabase clients, and dev server running.

**Dependencies:** None

**In scope:**
- Initialize Next.js 14+ with App Router, TypeScript, Tailwind CSS, ESLint
- Install and configure shadcn/ui with all needed components
- Install core dependencies (Supabase, Zod, nanoid, date-fns, lucide-react)
- Create `.env.local` with all environment variable placeholders
- Create full directory structure per `ARCHITECTURE.md`
- Create TypeScript type definitions (`src/types/database.ts`, `pipeline.ts`, `api.ts`)
- Create Supabase client utilities (`src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`)
- Create `src/lib/constants.ts` with scoring weights, verdict thresholds, and credit packages

**Out of scope:**
- AI/LLM dependencies (Phase 4)
- Signal API dependencies (Phase 5)
- Payment dependencies (Phase 9)
- Any page implementation
- Database schema

**Deliverables:**
- [ ] `package.json` with all Phase 1 dependencies
- [ ] `src/` directory with complete folder structure
- [ ] `src/types/database.ts` — all Supabase table types matching `DB_SCHEMA.md`
- [ ] `src/types/pipeline.ts` — pipeline step input/output types
- [ ] `src/types/api.ts` — API request/response types
- [ ] `src/lib/supabase/` — 3 client files (browser, server, middleware)
- [ ] `src/lib/constants.ts` — scoring weights, verdicts, credit packages
- [ ] `src/lib/utils/validators.ts` — Zod schemas for all API inputs
- [ ] `.env.local` with placeholder values
- [ ] Dev server runs at localhost:3000

**Acceptance criteria:**
1. `npm run dev` starts without errors
2. `npm run build` completes without TypeScript errors
3. All type files compile cleanly
4. Supabase client files export the correct functions

**Open questions:** None

---

## Phase 2: Database & Auth

**Goal:** All database tables created in Supabase with RLS policies. Auth flow (email + Google OAuth) working end-to-end. Route protection middleware active.

**Dependencies:** Phase 1

**In scope:**
- Create `supabase/migrations/001_initial_schema.sql` matching `DB_SCHEMA.md`
- All 9 tables with constraints, indexes, and RLS policies
- Trigger functions: `update_updated_at()`, `handle_new_user()`
- DB functions: `deduct_credits()`, `add_credits()`
- Seed `admin_settings` with default values
- Supabase Auth configuration (email/password + Google OAuth)
- `src/lib/auth/provider.tsx` — AuthProvider context
- `src/lib/auth/hooks.ts` — useAuth, useUser hooks
- `src/middleware.ts` — route protection
- `src/app/auth/callback/route.ts` — OAuth callback handler

**Out of scope:**
- Auth UI pages (Phase 3)
- Admin role assignment UI
- Credit purchase flow

**Deliverables:**
- [ ] `supabase/migrations/001_initial_schema.sql` — complete migration
- [ ] Migration applied successfully to Supabase
- [ ] `src/lib/auth/provider.tsx` and `hooks.ts`
- [ ] `src/middleware.ts` — protecting `/dashboard`, `/ideas/*`, `/compare`, `/settings/*`, `/admin/*`
- [ ] `src/app/auth/callback/route.ts`

**Acceptance criteria:**
1. All 9 tables exist in Supabase with correct columns and types
2. RLS is enabled on all tables
3. Creating a user via Supabase Auth auto-creates a `profiles` row (trigger works)
4. `deduct_credits()` function correctly deducts and creates a transaction row
5. Middleware redirects unauthenticated users from `/dashboard` to `/signin`
6. OAuth callback route handles the redirect correctly

**Open questions:** None (free credits confirmed as 3 per DEC-010)

---

## Phase 3: Layouts, Marketing & Auth Pages

**Goal:** All layout shells built. Landing page with Quick Roast form placeholder (not wired to AI yet). Auth pages functional. Pricing page rendered.

**Dependencies:** Phase 2

**In scope:**
- Root layout (`src/app/layout.tsx`) — AuthProvider, fonts, Toaster
- Layout components: MarketingNavbar, AppNavbar, AppSidebar, AdminSidebar, Footer
- Route group layouts: (marketing), (auth), (app), (admin)
- Landing page with HeroSection (Quick Roast form UI only), HowItWorks, PricingPreview
- Pricing page
- Auth pages: signin, signup, forgot-password, reset-password
- Auth forms: SignInForm, SignUpForm, ForgotPasswordForm
- Global error.tsx and not-found.tsx pages

**Out of scope:**
- Quick Roast API integration (Phase 4)
- Dashboard content (Phase 6)
- App page content (Phase 6+)
- Admin page content (Phase 12)

**Deliverables:**
- [ ] `src/app/layout.tsx` — root layout with providers
- [ ] 5 layout components in `src/components/layout/`
- [ ] 4 route group layouts
- [ ] Landing page with all sections
- [ ] Pricing page
- [ ] 4 auth pages with working forms
- [ ] error.tsx and not-found.tsx

**Acceptance criteria:**
1. Landing page renders at `/` with hero, how-it-works, and pricing sections
2. Quick Roast form is visible and styled (submit does nothing yet)
3. Sign up creates a Supabase user and redirects to `/dashboard`
4. Sign in authenticates and redirects to `/dashboard`
5. Sign out works from the app navbar
6. `/dashboard` shows the authenticated layout (navbar + sidebar) with placeholder content
7. `/admin` shows admin layout with placeholder content
8. Non-existent routes show the 404 page
9. All pages are responsive (mobile-friendly)

**Open questions:** None

---

## Phase 4: AI Infrastructure & Quick Roast

**Goal:** Gemini and Groq API clients working. Rate limiting in place. Quick Roast flow live on the landing page — visitor can paste an idea and get a teaser result.

**Dependencies:** Phase 3

**In scope:**
- Install AI dependencies: `@google/generative-ai`, `groq-sdk`
- `src/lib/pipeline/ai/gemini-client.ts` — Gemini Flash + Pro wrappers with JSON mode
- `src/lib/pipeline/ai/groq-client.ts` — Groq wrapper (Llama 3) as fallback
- `src/lib/pipeline/ai/rate-limiter.ts` — DB-backed rate limiter (not in-memory)
- `src/lib/pipeline/ai/retry.ts` — Exponential backoff with Gemini→Groq fallback
- `POST /api/quick-roast` route — IP rate limited (3/hour), calls Gemini Flash, stores idea + report
- Wire `QuickRoastForm` component to the API
- Quick Roast result display with "Sign up for full analysis" CTA

**Out of scope:**
- Full analysis pipeline (Phase 5)
- Signal collection (Phase 5)
- Scoring/verdict (Phase 5)

**Deliverables:**
- [ ] 4 files in `src/lib/pipeline/ai/`
- [ ] `src/app/api/quick-roast/route.ts`
- [ ] `src/components/marketing/quick-roast-form.tsx` — wired to API
- [ ] Quick Roast result card component

**Acceptance criteria:**
1. Visit `/`, paste an idea in the Quick Roast form, get a teaser result within 5 seconds
2. Result shows first_impression, biggest_flaw, what_to_clarify
3. 4th request from same IP within an hour returns 429
4. Supabase: idea row created with `is_quick_roast=true`, report row created with `report_type='quick_roast'`
5. If Gemini fails, Groq fallback activates and returns a result
6. Rate limiter survives across serverless invocations (DB-backed)

**Open questions:** None

---

## Phase 5: Full Analysis Pipeline

**Goal:** Complete 7-step analysis pipeline executing end-to-end via client-driven sequential execution (DEC-009). Signal collection working with HackerNews as the v1 source (DEC-011). Scoring and verdict logic implemented with all 5 guardrail overrides from the PRD.

**Dependencies:** Phase 4

**In scope:**
- Signal provider interface: `src/lib/pipeline/signals/types.ts` — common interface for all signal providers
- HackerNews signal collector: `src/lib/pipeline/signals/hackernews.ts` — v1 signal source (DEC-012)
- All 7 pipeline steps in `src/lib/pipeline/steps/`
- Scoring engine: `src/lib/pipeline/scoring/` (weighted scorer, logic overrides, category weights)
- LLM-based category classification inline in step 1 (DEC-016) — no separate ML model
- Pipeline orchestrator: `src/lib/pipeline/orchestrator.ts`
- Pipeline API routes: `/api/pipeline/interpret`, `/api/pipeline/clarify`, etc. (7 endpoints)
- Analysis trigger: `POST /api/ideas/[id]/analyze`
- Status polling: `GET /api/ideas/[id]/analysis/[runId]/status`
- Clarification submission: `POST /api/ideas/[id]/clarify`
- Report retrieval: `GET /api/ideas/[id]/report`

**Out of scope:**
- UI for the analysis flow (Phase 6)
- Report rendering (Phase 7)
- SerpAPI, Google Trends, Reddit integration (deferred — DEC-011)
- Dedicated ML model training (deferred — DEC-016)

**Deliverables:**
- [ ] `src/lib/pipeline/signals/types.ts` — signal provider interface
- [ ] `src/lib/pipeline/signals/hackernews.ts` — HackerNews Algolia API integration
- [ ] 7 pipeline step files
- [ ] 4 scoring engine files (weighted-scorer, logic-overrides, category-weights, source-affinity)
- [ ] `src/lib/pipeline/ml/categorizer.ts` — LLM-based inline classification
- [ ] `src/lib/pipeline/orchestrator.ts`
- [ ] 7 pipeline API route files + 4 analysis API routes
- [ ] All analysis statuses tracked in DB

**Acceptance criteria:**
1. Can trigger an analysis via API (POST to `/api/ideas/[id]/analyze`)
2. Each pipeline step executes within 10 seconds (Vercel free tier constraint, DEC-009)
3. HackerNews signals collected successfully; graceful degradation if API is down
4. Signal evidence rows created in DB with source URLs
5. Scores calculated using correct weights from PRD Section 10
6. Verdict assigned correctly based on score thresholds
7. All 5 guardrail overrides work:
   - High score + unclear distribution → Refine
   - Low score + strong differentiation + demand → Refine
   - 4+ low-confidence dimensions → Insufficient Data
   - 3+ conflicting signals + Pursue → Test First
   - Zero demand evidence → Test First
8. Full report JSONB generated and stored
9. Pipeline is resumable — if step 4 fails, can retry from step 4
10. LLM correctly classifies idea category (used for scoring weight adjustments)
11. Signal provider interface allows adding new providers (e.g., SerpAPI) without changing pipeline steps

**Open questions:** None (all blockers resolved — see DEC-009 through DEC-016)

---

## Phase 6: Idea Flow & Dashboard

**Goal:** User can create an idea through the wizard, answer clarification questions, watch analysis progress, and land on the report page. Dashboard shows all ideas with status.

**Dependencies:** Phase 5

**In scope:**
- Dashboard page with ideas list, credit balance, quick actions
- New Idea Wizard (multi-step form: Describe → Details → Review → Submit)
- Idea Detail page with version history and analysis runs
- Clarification page (answer AI questions or skip)
- Analysis Progress page (step-by-step progress with visual stepper)
- Client-side pipeline orchestration (calls pipeline API routes sequentially, updates progress UI)
- All dashboard/idea/analysis components

**Out of scope:**
- Report page components (Phase 7)
- Compare feature (Phase 8)
- Billing/credits UI (Phase 9)

**Deliverables:**
- [ ] `/dashboard` page with `IdeasList`, `CreditBalanceCard`, `QuickActions`, `EmptyState`
- [ ] `/ideas/new` page with 4-step wizard
- [ ] `/ideas/[ideaId]` page with summary, versions, analysis runs
- [ ] `/ideas/[ideaId]/clarify` page
- [ ] `/ideas/[ideaId]/report/[runId]/progress` page with `ProgressTracker`
- [ ] Client-side orchestrator hook (`useAnalysisPipeline`)

**Acceptance criteria:**
1. New user sees empty dashboard with "Analyze New Idea" CTA
2. Idea wizard: can enter idea, fill optional details, see AI interpretation preview, submit
3. Credits deducted on submission (or error if insufficient)
4. Clarification page shows AI-generated questions with text inputs
5. "Skip" option proceeds with assumptions
6. Progress page shows 7-step stepper, updates in real-time as each step completes
7. Progress page auto-redirects to report page on completion
8. Dashboard shows all ideas with correct status badges
9. Idea detail page shows version history and analysis run history

**Open questions:** None

---

## Phase 7: Report Page

**Goal:** The core product output page is fully rendered with all sections from PRD Section 11 and 12. This completes PRD Phase 1.

**Dependencies:** Phase 6

**In scope:**
- All 9 report components (see `UI_MAP.md`)
- Report page composition
- Verdict color coding per design tokens
- Evidence references (clickable, scrolls to evidence section)
- Print-friendly CSS
- Score bar components with animated fills

**Out of scope:**
- Share link generation (Phase 10)
- PDF export (deferred to v2 — DEC-014)
- Compare button (Phase 8)

**Deliverables:**
- [ ] `/ideas/[ideaId]/report/[runId]` page
- [ ] `VerdictBanner` component
- [ ] `PursueWarningLayer` component
- [ ] `SubScoreGrid` component
- [ ] `ReasoningSection` component
- [ ] `AssumptionsPanel` component
- [ ] `FlagsList` component
- [ ] `EvidenceExplorer` component
- [ ] `NextStepsPanel` component
- [ ] `ShareExportBar` component (share/export disabled until Phase 10)

**Acceptance criteria:**
1. Report page renders all 9 sections correctly for each verdict type
2. Verdict banner shows correct color for each of the 5 verdicts
3. "Pursue" verdict shows the warning callout (PRD: "must include unknowns and major risks")
4. Sub-score grid shows 7 dimensions with correct weights and score bars
5. Evidence references are clickable and scroll to the Evidence Explorer
6. Assumptions are tagged as "user-stated" or "inferred"
7. Flags are split into red (left) and green (right) columns
8. Next steps are contextual per verdict type
9. Page is readable on mobile (components stack vertically)
10. Content matches PRD Section 11 (Full Report Structure) checklist

**Open questions:** None

---

## Phase 8: Workspace & Compare

**Goal:** Users can manage their ideas and compare 2-4 analyzed ideas side by side. This begins PRD Phase 2.

**Dependencies:** Phase 7

**In scope:**
- Compare page with idea selector and comparison matrix
- `POST /api/ideas/compare` endpoint
- AI-generated comparison takeaway (Gemini Flash)
- Idea re-analysis flow (trigger new analysis on existing idea)
- Idea editing (update title, raw_input, etc.)
- Idea soft-delete

**Out of scope:**
- Workspace organization (tags, folders — P2 per PRD Section 9.6)
- Billing (Phase 9)

**Deliverables:**
- [ ] `/compare` page with `IdeaSelector`, `ComparisonTable`, `ComparisonTakeaway`
- [ ] `POST /api/ideas/compare` API route
- [ ] Re-analyze button wired on idea detail page
- [ ] Edit idea functionality
- [ ] Delete (soft) idea functionality

**Acceptance criteria:**
1. Compare page: select 2 ideas, see side-by-side score comparison
2. AI takeaway generated comparing the two ideas
3. 3-4 ideas also works
4. < 2 ideas shows empty state
5. Re-analyze creates a new analysis run on an existing idea
6. Edit updates the idea and creates a new version
7. Delete soft-deletes (sets deleted_at, hides from UI)

**Open questions:** None

---

## Phase 9: Billing & Credits

**Goal:** Users can purchase credits via Razorpay. Full payment flow: select package → checkout → credits added. Transaction history visible.

**Dependencies:** Phase 7 (can be built in parallel with Phase 8)

**In scope:**
- Install `razorpay` dependency
- `POST /api/credits/purchase` — create Razorpay order
- `POST /api/credits/verify` — verify payment signature, add credits
- `POST /api/webhooks/razorpay` — webhook handler
- `GET /api/credits/balance` — return current balance
- `GET /api/credits/transactions` — transaction history
- Billing page (`/settings/billing`)
- `CreditPackages`, `RazorpayCheckout`, `TransactionHistory` components
- Settings profile page (`/settings`)

**Out of scope:**
- Live payment processing (test mode only)
- Subscription plans (credit-based only in v1)
- Invoice generation

**Deliverables:**
- [ ] 5 API routes for credits/billing
- [ ] `/settings/billing` page
- [ ] `/settings` page (profile)
- [ ] `RazorpayCheckout` component (loads script, triggers popup)
- [ ] `TransactionHistory` component

**Acceptance criteria:**
1. Click "Buy 5 Credits (INR 99)" → Razorpay popup opens
2. Complete test payment (card 4111 1111 1111 1111) → popup closes
3. Credits added to balance (verify in UI and DB)
4. Transaction row created with razorpay_order_id and razorpay_payment_id
5. Webhook handler processes payment.captured event idempotently
6. Duplicate payment verification returns 409 (not double-credit)
7. Transaction history shows all credit changes

**Open questions:** None (free credits confirmed as 3 per DEC-010)

---

## Phase 10: Share & Export

**Goal:** Users can generate public share links for reports and quick roasts. Public viewers see a read-only report. This completes PRD Phase 2.

**Dependencies:** Phase 7 (for report), Phase 4 (for Quick Roast)

**In scope:**
- `POST /api/share` — generate share link (nanoid slug)
- `GET /api/share/[slug]` — fetch shared report (no auth)
- Public shared report page (`/report/[shareId]`)
- Public shared roast page (`/roast/[shareId]`)
- Wire "Copy Share Link" in `ShareExportBar`
- View count tracking

**Out of scope:**
- PDF export (deferred to v2 — DEC-014)
- Share link expiry management UI

**Deliverables:**
- [ ] 2 share API routes
- [ ] `/report/[shareId]` public page
- [ ] `/roast/[shareId]` public page
- [ ] Share link generation wired in report page

**Acceptance criteria:**
1. Click "Copy Share Link" on a report → link copied to clipboard
2. Open link in incognito → report renders without auth
3. View count increments on each view
4. Quick Roast share link works similarly
5. Non-existent share slug returns 404

**Open questions:** None

---

## Phase 11: ML Model Training & Integration (OPTIONAL / DEFERRED)

> **This phase is optional for v1.** Per DEC-016, LLM inline classification handles idea categorization in v1. This phase should only be pursued if LLM classification proves unreliable or if there is a specific need (e.g., academic demonstration of ML training pipeline).

**Goal:** Train a DistilBERT-based idea categorizer, deploy to HuggingFace, and integrate as an alternative to LLM classification.

**Dependencies:** Phase 5 (pipeline exists with LLM-based categorization)

**In scope:**
- `ml/generate_dataset.py` — synthetic dataset generation using Gemini
- `ml/train_categorizer.py` — fine-tune DistilBERT for 10-class classification
- Push trained model to HuggingFace Hub
- Add HuggingFace provider option in `categorizer.ts` alongside existing LLM classification
- Feature flag in `admin_settings` to switch between LLM and ML classification

**Out of scope:**
- Real-world dataset collection (synthetic + augmented only)
- Model retraining pipeline
- Replacing LLM classification (both options should coexist)

**Deliverables:**
- [ ] `ml/generate_dataset.py` — generates 2000+ labeled examples
- [ ] `ml/data/` — train/val/test splits
- [ ] `ml/train_categorizer.py` — training script
- [ ] Trained model on HuggingFace Hub
- [ ] Updated `categorizer.ts` with HuggingFace as optional provider

**Acceptance criteria:**
1. Model achieves >85% accuracy and >0.80 macro F1 on test set
2. HuggingFace API returns category + confidence in <3 seconds
3. Admin can toggle between LLM and ML classification via admin_settings
4. LLM classification remains the default; ML model is opt-in

**Open questions:**
- Whether to pursue this phase at all depends on v1 LLM classification quality

---

## Phase 12: Admin Panel

**Goal:** Admin can view metrics, manage prompts, monitor jobs, manage users, and review shared content.

**Dependencies:** Phase 7 (analysis data exists)

**In scope:**
- All admin API routes (metrics, prompts, jobs, users, moderation)
- Admin dashboard with metrics cards
- Prompt editor with version tracking
- Job monitor with retry controls
- User management with credit adjustments
- Moderation queue for shared content

**Out of scope:**
- Advanced analytics (conversion funnels — can be added later)
- Real-time job monitoring (polling is sufficient)

**Deliverables:**
- [ ] 5+ admin API routes
- [ ] 6 admin pages
- [ ] 5 admin components (MetricsGrid, PromptEditor, JobTable, UserTable, ModerationQueue)

**Acceptance criteria:**
1. Admin dashboard shows correct counts (users, ideas, analyses, verdict distribution)
2. Signal provider status visible (which providers are active)
3. Can edit a prompt and see version history
4. Can view all analysis jobs filtered by status
5. Can retry a failed job
6. Can search users and adjust credits
7. Can review and flag/remove shared content
8. Non-admin users get 403 on all admin routes

**Open questions:** None

---

## Phase 13: Polish & Deploy

**Goal:** Production-ready deployment on Vercel. All edge cases handled. Mobile responsive. SEO metadata.

**Dependencies:** All previous phases

**In scope:**
- Skeleton loaders for all data-fetching pages
- Empty states for all lists
- Mobile responsiveness audit and fixes
- SEO metadata exports on all pages
- `robots.txt` and `sitemap.xml`
- Vercel deployment configuration
- Environment variables in Vercel dashboard
- Supabase production config (OAuth redirect URLs)
- End-to-end verification of all user journeys

**Out of scope:**
- Open Graph image generation (nice-to-have, not critical)
- Performance optimization beyond reasonable defaults
- Custom error tracking (Sentry, etc.)

**Deliverables:**
- [ ] All pages have loading/empty/error states
- [ ] Mobile-responsive across all pages
- [ ] SEO metadata on all public pages
- [ ] `vercel.json` configuration
- [ ] Deployed and accessible on Vercel URL
- [ ] All 10 verification items pass (see below)

**Acceptance criteria (verification checklist):**
1. Quick Roast flow works on production URL
2. Sign-up / sign-in flow works
3. Full analysis pipeline completes end-to-end
4. Report page renders all sections correctly
5. Credit purchase works (Razorpay test mode)
6. Share link generates and public view works
7. Compare flow works with 2+ ideas
8. Admin panel accessible with admin role
9. Mobile-responsive on all key pages
10. 404 page shows for non-existent routes

**Open questions:** None

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Vercel 10s function timeout | High | Client-driven sequential pipeline — each step is its own API call (DEC-009) |
| HackerNews bias toward tech/startup topics | Medium | Category-aware signal weighting: if the idea category is outside HN's natural strength (e.g., healthcare, hardware), reduce community-signal impact on final scoring. Scoring engine applies category-source affinity map (DEC-011). |
| HackerNews API unavailable | Medium | Do not fail the entire analysis. Continue with remaining evidence (structured user input, LLM competitor analysis, clarification answers). Lower overall confidence and show a partial-signal warning in the report. Only return "Insufficient Data" if remaining evidence is too weak across 4+ dimensions (existing guardrail rule). |
| In-memory rate limiter won't work on serverless | High | Use DB-backed rate limiter (Supabase table) |
| Gemini rate limit (15 RPM) | Medium | Token bucket in DB, Groq fallback, retry with backoff |
| LLM category classification consistency | Low | Enforce a fixed 10-class taxonomy via structured JSON mode. Persist selected category in `analysis_runs.input_snapshot` so it is stable across the run. Do not silently reclassify on reruns unless user has materially edited the idea. Category weighting remains secondary to direct signal evidence (DEC-016). |
| Razorpay test mode differences | Low | Core flow is same; switch keys for production |
| Supabase 500MB storage limit | Low | Trim raw_data in signal_evidence; monitor usage in admin |
| LLM output quality varies | Medium | Structured JSON mode, Zod validation on responses, fallback to Groq |
| Pipeline step failure mid-analysis | Medium | Resumable pipeline — track current_step, retry from failure point |
| Signal diversity insufficient for non-tech categories | Medium | Category-aware weighting reduces community-signal impact for non-tech categories. LLM interpretation flags low-confidence explicitly. Modular provider interface allows adding domain-specific sources later. |

---

## Summary

| Metric | Count |
|--------|-------|
| Total phases | 13 (Phase 11 is optional/deferred) |
| PRD Phase 1 phases | 7 (Phases 1–7) |
| PRD Phase 2 phases | 3 (Phases 8–10) |
| PRD Phase 3 phases | 3 (Phases 11–13) |
| Estimated files | ~120 (reduced — no SerpAPI, no Reddit, no ML training in v1) |
| Critical blockers | 0 (all resolved — see DECISIONS.md DEC-009 through DEC-016) |
| Open pending decisions | 0 |
