# Decisions Log

All significant technical and product decisions. Each entry records what was decided, why, what was rejected, and what it affects.

---

## Format

| Field | Description |
|-------|-------------|
| **Date** | When the decision was made |
| **Decision** | What was decided |
| **Reason** | Why this choice was made |
| **Alternatives rejected** | What else was considered and why it lost |
| **Impact** | What this affects (files, architecture, constraints) |
| **Status** | `active` / `superseded` / `pending-approval` |

---

## DEC-001: Framework — Next.js (App Router)

- **Date:** 2026-03-22
- **Decision:** Use Next.js with App Router, TypeScript, and `src/` directory. (Installed as Next.js 16.2.1 — see DEC-017.)
- **Reason:** Best full-stack DX for a multi-page SaaS app. App Router supports route groups, layouts, server components, and API routes. Free hosting on Vercel.
- **Alternatives rejected:**
  - Remix — smaller ecosystem, less Vercel integration
  - Vite + React + separate backend — more infrastructure to manage
  - SvelteKit — smaller talent pool, less library support
- **Impact:** All frontend, API routes, and deployment decisions flow from this.
- **Status:** active

## DEC-002: Database — Supabase PostgreSQL

- **Date:** 2026-03-22
- **Decision:** Use Supabase PostgreSQL for all persistent storage. Supabase Auth for authentication.
- **Reason:** Free tier is generous (500MB DB, 50K monthly active users for auth). Built-in RLS, realtime, and auth. Single service reduces operational complexity.
- **Alternatives rejected:**
  - PlanetScale — MySQL, no free tier anymore
  - Neon — Postgres but less mature auth/RLS story
  - Firebase — NoSQL, bad for relational data like this product
- **Impact:** All data model, auth, and RLS decisions. Migration management.
- **Status:** active

## DEC-003: UI — Tailwind CSS + shadcn/ui

- **Date:** 2026-03-22
- **Decision:** Use Tailwind CSS for styling and shadcn/ui for component primitives.
- **Reason:** shadcn/ui gives production-grade accessible components that are fully customizable (copied into project, not a dependency). Tailwind provides utility-first CSS with no runtime cost.
- **Alternatives rejected:**
  - MUI — heavy, opinionated, hard to customize brand
  - Chakra UI — runtime CSS-in-JS, bundle size concerns
  - Radix Primitives only — too low-level, more work for same result
- **Impact:** All UI components, theming, design system.
- **Status:** active

## DEC-004: Primary LLM — Google Gemini (Flash + Pro)

- **Date:** 2026-03-22
- **Decision:** Use Gemini 1.5 Flash for fast tasks (interpretation, clarification) and Gemini 1.5 Pro for deep reasoning (signal interpretation, report generation). Groq as fallback.
- **Reason:** Gemini free tier: 15 RPM, 1M tokens/minute. Good reasoning quality. Groq free tier (Llama/Mixtral) provides a different provider for resilience.
- **Alternatives rejected:**
  - OpenAI — no free tier
  - Anthropic — no free tier
  - Groq-only — good speed but weaker reasoning for complex analysis
  - Ollama local — requires user to run local models, not SaaS-compatible
- **Impact:** Pipeline steps 1, 2, 4, 7 use Gemini. Retry/fallback logic falls to Groq.
- **Status:** active

> **✅ BUG FIXED (2026-03-29):** `callGeminiPro()` previously called `gemini-2.0-flash` instead of a Pro model. Fixed: now uses `gemini-2.5-flash-preview-04-17` for Steps 4 and 7. Additionally, all LLM calls now have 30s timeouts, env var validation, and Zod schema validation on responses.

## DEC-005: Payments — Stripe (Test Mode)

- **Date:** 2026-03-22 (updated 2026-03-25: switched from Razorpay to Stripe)
- **Decision:** Use Stripe in test mode for credit purchases. INR pricing. Stripe Checkout (hosted page redirect) for payment flow.
- **Reason:** Stripe test mode is instantly available without business verification. Razorpay required account verification that wasn't accessible. Stripe supports INR, has excellent developer experience, and the redirect-based Checkout flow is simpler than Razorpay's embedded popup.
- **Alternatives rejected:**
  - Razorpay — account verification not accessible, blocking development
  - PayU — less developer-friendly API
- **Impact:** Billing UI uses redirect flow (not popup). Env vars: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`. DB columns `razorpay_order_id` / `razorpay_payment_id` reused for Stripe payment_intent / session_id.
- **Status:** active

## DEC-006: Signal Sources — SerpAPI + Reddit API + Google Trends (via SerpAPI)

- **Date:** 2026-03-22
- **Decision:** ~~Use SerpAPI for Google search results and Google Trends data. Use Reddit API for community signal.~~
- **Status:** **superseded** by DEC-009, DEC-010, DEC-011

## DEC-007: ML Categorizer — DistilBERT on HuggingFace

- **Date:** 2026-03-22
- **Decision:** Fine-tune `distilbert-base-uncased` for 10-class idea categorization. Host on HuggingFace Hub. Call via HuggingFace Inference API (free).
- **Status:** **superseded** by DEC-016. LLM inline classification is the v1 approach. DistilBERT is an optional enhancement, not a v1 requirement.

## DEC-008: Design System — Navy Brand + Verdict Colors

- **Date:** 2026-03-22
- **Decision:** Deep navy (#1E3A5F) as brand color. Verdict-specific colors: Pursue=#22C55E (green), Refine=#F59E0B (amber), Test First=#3B82F6 (blue), Drop=#EF4444 (red), Insufficient Data=#6B7280 (gray). Inter for text, JetBrains Mono for scores/data. Base text 14px. No dark mode in v1.
- **Reason:** PRD Section 12 requires strong hierarchy and professional design. Navy conveys seriousness. Verdict colors map to intuitive meaning.
- **Alternatives rejected:**
  - Dark mode from day 1 — doubles design work, not core to product
  - System fonts only — less professional appearance
- **Impact:** All UI components, report page, marketing pages.
- **Status:** active

> **Updated (2026-03-29):** Brand primary changed from deep navy (#1E3A5F) to soft lavender (#7c6ce7). Entire app converted to warm dark theme with charcoal background (#1a1a1c). Verdict colors adjusted for dark background contrast: Pursue=#6ec88e, Refine=#d4a06b, Test First=#7ea3d4, Drop=#d47070.

---

## DEC-009: Pipeline Execution — Client-Driven Sequential

- **Date:** 2026-03-22 (approved)
- **Decision:** Use client-driven sequential pipeline execution. The browser orchestrates the 7-step analysis by calling each pipeline step as a separate API route. No cron jobs, no background queue.
- **Reason:** Vercel free tier has a 10s function timeout. Each pipeline step must complete within that window. Client-driven sequential is zero-cost, gives natural progress tracking, and makes the pipeline resumable.
- **Alternatives rejected:**
  - Supabase Edge Functions (150s timeout) — adds deployment complexity, splits backend across two runtimes
  - Vercel Hobby plan ($20/mo) for 60s timeout + cron — violates zero-budget constraint
  - Fully async background queue — requires infrastructure not available on free tier
- **Impact:** Pipeline architecture, all `/api/pipeline/*` routes, progress UI, `useAnalysisPipeline` client hook. No `vercel.json` cron config needed.
- **Status:** active

## DEC-010: Free Credits — 3 on Signup

- **Date:** 2026-03-22 (approved)
- **Decision:** Every new registered user gets 3 free analysis credits on signup.
- **Reason:** PRD mentions "limited" for free tier. 3 credits let users experience the full product loop (submit, clarify, see report) enough times to evaluate value before paying. Quick Roasts remain unlimited (rate-limited by IP).
- **Alternatives rejected:**
  - 1 credit — too few to form a habit
  - 0 credits (must buy first) — kills conversion
- **Impact:** `handle_new_user()` trigger sets `credit_balance = 3`. `admin_settings.free_signup_credits = 3`.
- **Status:** active

## DEC-011: Signal Sources — HackerNews Only for v1, Modular Provider Interface

- **Date:** 2026-03-22 (approved)
- **Decision:** Remove SerpAPI as a required v1 dependency. Use HackerNews Algolia API as the only signal source in v1. Design the signal collection layer with a modular provider interface so paid search providers (SerpAPI, Google Trends, etc.) can be added later without refactoring.
- **Reason:** SerpAPI's 100 searches/month cap created a hard ceiling (~33-50 analyses/month for ALL users). HackerNews Algolia API is completely free, requires no API key, has no rate limit concerns, and covers the startup/tech community well. Removing SerpAPI eliminates the biggest operational constraint on v1.
- **Alternatives rejected:**
  - SerpAPI required in v1 — budget ceiling too restrictive for a product that needs to demonstrate value
  - Reddit API — requires paid access since 2023, unmaintained client libraries
  - No signal sources — weakens product credibility (PRD Section 9.3 makes signals P0)
- **Impact:**
  - `src/lib/pipeline/signals/` uses a provider interface pattern
  - `hackernews.ts` is the only required v1 provider
  - No `SERPAPI_KEY` needed to start building or run v1
  - Signal evidence will have fewer source types in v1 but the pipeline still works
  - Admin dashboard no longer needs SerpAPI budget tracking
  - Report EvidenceExplorer shows HackerNews + LLM Analysis tabs in v1
- **Risk mitigations:**
  - **HN bias:** Apply category-aware signal weighting. If the idea category falls outside HN's natural strength (e.g., healthcare, hardware, fintech), reduce community-signal impact on the final scoring dimensions. The scoring engine must maintain a category-source affinity map.
  - **HN failure:** Do not fail the whole analysis if HackerNews is unavailable. Continue with remaining evidence sources (structured user input, LLM-driven competitor analysis, clarification answers). Lower overall confidence and show a partial-signal warning in the report. Only return "Insufficient Data" if the remaining evidence is too weak across 4+ dimensions (existing guardrail rule from PRD).
- **Status:** active

## DEC-012: Community Source — HackerNews, Not Reddit

- **Date:** 2026-03-22 (approved)
- **Decision:** Use HackerNews Algolia API for community/discussion signals. Do not use Reddit API in v1.
- **Reason:** HackerNews Algolia API is free, requires no authentication, has no rate limits, and covers startup/tech discussions well. Reddit API requires paid access for programmatic use since 2023.
- **Alternatives rejected:**
  - Reddit API with free OAuth app — rate-limited, may be blocked, `snoowrap` library unmaintained
  - SerpAPI Reddit search — consumes search budget
- **Impact:** Signal collection step 3. Category-to-query mapping (not subreddit mapping). Evidence type is `hackernews` not `reddit`.
- **Status:** active

## DEC-013: Geographic Focus — Global English

- **Date:** 2026-03-22 (approved)
- **Decision:** Optimize signal interpretation for global, English-language markets.
- **Reason:** Most startup ideas target global markets. English-language signals provide the broadest coverage.
- **Alternatives rejected:**
  - US-focused — unnecessarily narrow
  - India-focused — most users' ideas won't be India-only
- **Impact:** No geographic filtering on HackerNews searches. LLM prompts should interpret signals in a global context.
- **Status:** active

## DEC-014: PDF Export — ~~Deferred to v2~~ (Superseded)

- **Date:** 2026-03-22 (approved)
- **Decision:** ~~No PDF export in v1. Focus on share links for report distribution. PDF export is a v2 feature.~~ **Superseded:** PDF export was implemented in DEC-027 using @react-pdf/renderer.
- **Reason:** PDF export is P1 in the PRD. Share links achieve the same distribution goal with less complexity. Browser print CSS provides a basic fallback.
- **Alternatives rejected:**
  - Basic HTML-to-PDF — still requires a rendering library
  - Styled PDF template — significant design work for P1 feature
- **Impact:** `ShareExportBar` has no "Export PDF" button in v1. The button slot can show "Coming soon" or be omitted entirely.
- **Status:** **superseded** by DEC-027. PDF export implemented using @react-pdf/renderer.

## DEC-015: Sync vs Async — Client-Driven Sequential

- **Date:** 2026-03-22 (approved)
- **Decision:** Analysis runs as client-driven sequential (same as DEC-009). No background async queue.
- **Reason:** Same as DEC-009. Effectively synchronous from user's perspective but each step is its own API call.
- **Status:** active (alias of DEC-009)

## DEC-016: Category Classification — LLM Inline, No Dedicated ML Model in v1

- **Date:** 2026-03-22 (approved)
- **Decision:** Use the primary LLM (Gemini) to classify idea category inline during pipeline step 1 (interpret). Do not train or deploy a separate DistilBERT model for v1. The ML model training phase (Phase 11) becomes optional/deferred — only pursue if LLM classification proves insufficient.
- **Reason:** LLM inline classification is simpler, zero infrastructure overhead, and good enough for 10-class categorization. A dedicated ML model adds training pipeline complexity, HuggingFace deployment dependency, and cold-start latency issues — all for marginal accuracy improvement on a non-critical classification task.
- **Alternatives rejected:**
  - DistilBERT as v1 requirement — training data generation, model hosting, and API integration add significant work for uncertain benefit
  - No categorization at all — loses category-aware scoring weights, which add real product value
- **Impact:**
  - `src/lib/pipeline/ml/categorizer.ts` calls Gemini with a classification prompt, not HuggingFace
  - No `HF_API_TOKEN` or `HF_MODEL_ID` needed for v1
  - Phase 11 (ML Model) becomes optional/deferred in execution plan
  - `ml/` directory not needed for v1
  - No Python dependencies in v1
- **Classification guardrails:**
  - Enforce a fixed 10-class taxonomy via LLM structured JSON mode. The LLM must pick from the defined enum, never invent new categories.
  - Persist the selected category in `analysis_runs.input_snapshot` at the start of the run. All subsequent pipeline steps use that persisted value.
  - On rerun: do not silently reclassify unless the user has materially changed the idea input (title, raw_input, or problem_statement). If input is unchanged, reuse the previous category.
  - Category weighting remains secondary to direct signal evidence. Category affects scoring weight adjustments (±3% per dimension), not the raw signal interpretation itself.
- **Status:** active

## DEC-017: Actual Framework Versions (Phase 1)

- **Date:** 2026-03-22
- **Decision:** Phase 1 installed Next.js 16.2.1 (latest stable), Tailwind CSS v4, and shadcn/ui v4. These are newer than the originally planned "14+".
- **Reason:** `create-next-app@latest` installs the current stable version. Next.js 16 is fully compatible with App Router patterns. Tailwind v4 uses CSS-based configuration (no `tailwind.config.ts`), and shadcn/ui v4 uses `sonner` instead of the deprecated `toast` component.
- **Impact:**
  - No `tailwind.config.ts` file. Theme customization happens in `globals.css` via `@theme inline` and CSS variables.
  - Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts`. Current middleware emits a warning but functions correctly. Phase 2 must decide whether to migrate to `proxy.ts` or keep `middleware.ts`.
  - `sonner` replaces `toast` as the notification component.
- **Status:** active

---

# Tier 1 Decisions

## DEC-018: Web Search Provider — Serper.dev (Phase 14)

- **Date:** 2026-03-28
- **Decision:** Use Serper.dev for web search signals. Implement as a new `SignalProvider` alongside HackerNews.
- **Reason:** Serper.dev offers 2,500 free searches/month (vs SerpAPI's 100). JSON API returning real Google search results. No credit card required for free tier. Each analysis uses ~3 searches, supporting ~800 analyses/month on the free tier.
- **Alternatives rejected:**
  - SerpAPI — 100 searches/month cap too restrictive (original rejection reason in DEC-011 still applies)
  - Bing Web Search API (Azure) — requires Azure account, limited free tier
  - Brave Search API — limited result quality, smaller index
  - Direct scraping — fragile, against ToS, maintenance burden
- **Impact:**
  - New signal provider at `src/lib/pipeline/signals/serper.ts`
  - New env var `SERPER_API_KEY`
  - DB migration expands `source_type` CHECK to include `'serper'`
  - `SignalSourceType` in `database.ts` expanded
  - Updates DEC-011 scope: HackerNews is no longer the only provider
- **Status:** active

## DEC-019: Google Trends — SerpAPI Trends Endpoint (Phase 15)

- **Date:** 2026-03-28
- **Decision:** Use SerpAPI Google Trends endpoint (100 free/month) for trend data. If budget is exceeded, fall back gracefully (trend data is supplementary, not critical).
- **Reason:** Pytrends requires a Python runtime, incompatible with Vercel serverless. SerpAPI Trends provides structured JSON trend data. At 100/month free tier and ~1 query per analysis, this supports ~100 analyses/month with trends data. Beyond that, trends are simply omitted (graceful degradation per DEC-011 pattern).
- **Alternatives rejected:**
  - Pytrends — requires Python runtime, cannot run in Vercel serverless
  - Pytrends on Supabase Edge Function — adds deployment complexity, separate runtime, CORS handling
  - No trends data at all — misses valuable market timing signal
- **Impact:**
  - New signal provider at `src/lib/pipeline/signals/google-trends.ts`
  - New env var `SERPAPI_KEY`
  - DB migration adds `'google_trends'` to `source_type` CHECK
  - `SignalSourceType` expanded
- **Status:** active

## DEC-020: Reproducible Signal Interpretation — Grounded signal_strength (Phase 17)

- **Date:** 2026-03-28
- **Decision:** Ground Step 4 (interpret-signals) `signal_strength` values in countable, measurable inputs. Pre-compute a numeric evidence summary per dimension before the LLM call, and constrain the LLM to adjust within +/-0.15 of the pre-computed baseline.
- **Reason:** Currently `signal_strength` is fully LLM-assigned (0-1 float) and varies across runs with identical inputs. Step 5 (weighted-scorer) is deterministic, but its input is not. By providing the LLM with a pre-computed baseline (e.g., "3 HN posts with avg 45 points + 2 Serper results = baseline 0.6 for demand"), the LLM can adjust within bounds but cannot produce wildly different numbers each run.
- **Alternatives rejected:**
  - Fully deterministic scoring (no LLM in Step 4) — loses nuance, signal interpretation genuinely needs reasoning
  - temperature=0 only — does not guarantee reproducibility across providers or model versions
  - Caching LLM responses — masks the problem, stale data
- **Impact:**
  - New utility `src/lib/pipeline/scoring/evidence-quantifier.ts`
  - Modified `04-interpret-signals.ts` prompt to include baselines and constrain deviation
  - `DimensionInsight` type gains `baseline_strength` and `evidence_urls` fields
- **Status:** active

## DEC-021: Vagueness Blocking Threshold (Phase 16)

- **Date:** 2026-03-28
- **Decision:** Enforce a vagueness threshold of 0.7. If Step 1 produces `vagueness_score >= 0.7`, block the pipeline before Step 3 (signal collection) and require mandatory clarification. The user cannot skip clarification when vagueness-blocked.
- **Reason:** PRD Section 6: "Must not issue polished verdicts for vague ideas without forcing clarification." Currently `vagueness_score` is computed in Step 1 but never enforced. Ideas like "I want to build an app" get full reports with confident verdicts, violating the PRD.
- **Alternatives rejected:**
  - Threshold of 0.5 — too aggressive, blocks many reasonable early-stage ideas
  - Threshold of 0.8 — too permissive, allows meaningfully vague ideas through
  - Soft warning only — violates PRD Section 6 ("must not")
- **Impact:**
  - Logic gate between Step 2 and Step 3 in pipeline orchestration
  - New constant `VAGUENESS_BLOCK_THRESHOLD = 0.7` in `constants.ts`
  - Clarification page shows vagueness-specific banner when triggered
  - Skip button hidden/disabled during vagueness block
  - New utility `src/lib/pipeline/vagueness-gate.ts`
- **Status:** active

## DEC-022: Evidence Verification — Real Source URLs (Phase 18)

- **Date:** 2026-03-28
- **Decision:** Evidence refs in reports must point to verifiable URLs, not LLM-generated text. Serper.dev results (DEC-018) and HackerNews results provide real URLs. LLM Knowledge signals must be labeled "LLM Analysis (unverified)" in the report when they lack a real URL backing.
- **Reason:** Currently `evidence_ref` fields in `RedFlag`, `GreenFlag`, and `DimensionReasoning` contain LLM-generated text like "Based on market analysis." These are not clickable, not verifiable, and violate PRD Section 6: "Must not hide weak evidence behind confident language."
- **Alternatives rejected:**
  - Remove all LLM knowledge signals — loses valuable competitive intelligence
  - Auto-verify every claim via search — too many API calls, exceeds Serper budget
  - Manual verification — not feasible in automated pipeline
- **Impact:**
  - `evidence_ref` fields preferentially contain real URLs from signal_evidence
  - `EvidenceExplorer` component gains verified/unverified badges
  - Report generation prompt (Step 7) updated to use actual `source_url` values
  - New component `src/components/report/evidence-badge.tsx`
- **Status:** active

## DEC-023: Usage Gating — Teaser vs Full Report (Phase 19)

- **Date:** 2026-03-28
- **Decision:** Quick Roast (free, no auth) shows a teaser: first_impression, biggest_flaw, what_to_clarify + a CTA to sign up and see full report. After Quick Roast, show a blurred/skeleton preview of what a full report would contain, driving conversion to paid credits.
- **Reason:** PRD P0: "Control which outputs are visible in teaser vs paid mode." Current Quick Roast and Full Analysis are completely separate flows with no upsell bridge. Users who do a Quick Roast have no visibility into what a full report offers, reducing conversion motivation.
- **Alternatives rejected:**
  - Full paywall on all report sections — too aggressive for users who already paid with credits
  - No gating at all — misses upsell opportunity from Quick Roast to Full Analysis
- **Impact:**
  - New component `src/components/report/paywall-overlay.tsx` for blurred sections
  - Quick Roast result page gains "Preview Full Report" section
  - Report endpoint may accept `?preview=true` query param
  - No changes to existing paid user experience
- **Status:** active

---

# Tier 2 Decisions

## DEC-024: Error Recovery — Retry from Failed Step (Phase 20)

- **Date:** 2026-03-28
- **Decision:** Track `completed_steps` (integer array) on `analysis_runs`. When retrying a failed run, the client reads `completed_steps` and resumes from the first incomplete step. The `useAnalysisPipeline` hook gains a `retryFromFailedStep(runId)` method.
- **Reason:** The pipeline is designed for resumability (DEC-009) — each step reads inputs from DB, not prior HTTP responses. But the client always restarts from Step 1 on failure, wasting LLM credits and time. The DB already has `current_step` but it's display-only.
- **Alternatives rejected:**
  - Server-side automatic retry — adds complexity, still constrained by 10s Vercel limit
  - Restart from step 1 always — current behavior, the one being fixed
  - Checkpoint/snapshot system — over-engineered; DB already contains all intermediate state
- **Impact:** DB migration adds `completed_steps integer[]` to `analysis_runs`. Each pipeline route marks its step completed on success. Progress page retry button resumes from failed step.
- **Status:** active

## DEC-025: Idea Editing + Category Preservation on Rerun (Phase 21)

- **Date:** 2026-03-28
- **Decision:** On rerun of an unchanged idea, reuse the previous run's category (implementing existing DEC-016 requirement). "Unchanged" = `title`, `raw_input`, `problem_statement` identical to previous run's `input_snapshot`. If changed, Step 1 reclassifies.
- **Reason:** DEC-016 mandated this ("On rerun: do not silently reclassify unless the user has materially changed the idea input") but it was never implemented. Step 1 always reclassifies.
- **Alternatives rejected:**
  - Store category on ideas table permanently — loses ability to correct wrong classifications after edits
  - Hash-based comparison — overly complex; simple field equality suffices
- **Impact:** `POST /api/ideas/[id]/analyze` gains comparison logic. New utility `category-preservation.ts`. Step 1 interpret accepts optional `preserve_category` flag.
- **Status:** active

## DEC-026: Clarification Answers in Report (Phase 22)

- **Date:** 2026-03-28
- **Decision:** Add `clarification_qa` field to `ReportContent`. Step 7 receives Q&A pairs and includes them in the report. Report UI shows a "Your Answers" section.
- **Reason:** Answers are already stored and used in Step 4 as evidence, but invisible to users in the final report. Users should see what they told us and how it influenced the analysis.
- **Alternatives rejected:**
  - Tooltip/hover only — too hidden
  - Inline into dimension reasoning — mixes founder claims with analysis
- **Impact:** `ReportContent` type gains `clarification_qa`. Step 7 prompt updated. New report component `clarification-answers.tsx`.
- **Status:** active

## DEC-027: PDF Export — @react-pdf/renderer (Phase 23)

- **Date:** 2026-03-28
- **Decision:** Use `@react-pdf/renderer` for client-side PDF generation. Supersedes DEC-014 (which deferred PDF to v2). PDF renders entirely in the browser via dynamic import (~400KB lazy-loaded).
- **Reason:** Zero server cost (avoids Vercel 10s limit), React component model (familiar DX), professional styled output with page breaks and branding. `window.print()` produces inconsistent output across browsers.
- **Alternatives rejected:**
  - `window.print()` + CSS — inconsistent, no pagination control
  - `jsPDF` — imperative API, poor text layout
  - Puppeteer server-side — 10s Vercel limit makes this impossible on free tier
  - Paid services — violates zero-budget constraint
- **Impact:** New dependency `@react-pdf/renderer`. New components under `report/pdf/`. `ShareExportBar` gains "Export PDF" button. Dynamic import avoids bundle bloat.
- **Status:** active

## DEC-028: Per-Route Error Boundaries (Phase 24)

- **Date:** 2026-03-28
- **Decision:** Add `error.tsx` to each route group: `(app)`, `(auth)`, `(marketing)`, `(admin)`. Each shows contextual error messages and appropriate recovery actions.
- **Reason:** Current single global `error.tsx` shows generic "Something went wrong" regardless of context. Per-route boundaries allow contextual messaging.
- **Alternatives rejected:**
  - Per-page error boundaries — too granular, maintenance burden
  - react-error-boundary library — Next.js handles this natively with `error.tsx`
- **Impact:** 4 new error.tsx files. Global error.tsx simplified to last-resort fallback.
- **Status:** active

## DEC-029: Per-User Rate Limiting (Phase 25)

- **Date:** 2026-03-28
- **Decision:** Extend existing DB-backed rate limiter (`rate-limiter.ts`) with `checkUserRateLimit(userId, action, maxRequests, windowMs)`. Limits: analysis = 10/hr, pipeline steps = 100/min, ideas CRUD = 30/min.
- **Reason:** Only Quick Roast has IP-based rate limiting. A user could burn credits instantly by parallelizing requests or spam API endpoints.
- **Alternatives rejected:**
  - In-memory — doesn't survive serverless invocations
  - Upstash — external dependency with free tier limits
  - RLS-based — cannot express time-window rate limits
- **Impact:** `rate-limiter.ts` gains `checkUserRateLimit()`. Constants gain `USER_RATE_LIMITS`. Pipeline and ideas routes gain rate limit checks.
- **Status:** active

## DEC-030: Email Notifications — Resend Free Tier (Phase 26)

- **Date:** 2026-03-28
- **Decision:** Use Resend (resend.com) for transactional email. Free tier: 100 emails/day. Send email when analysis completes (verdict + link to report). Email failure never blocks pipeline.
- **Reason:** Simplest DX (single API call, React email templates). No SMTP config. Works from Vercel serverless. 100/day sufficient for early-stage.
- **Alternatives rejected:**
  - SendGrid — more complex setup, identity verification required
  - Nodemailer + Gmail SMTP — fragile, not production-grade
  - No email — users have no way to know analysis is done if they close the tab
- **Impact:** New dependency `resend`. New env var `RESEND_API_KEY`. DB migration adds `email_notifications` boolean to profiles. New `src/lib/email/` directory.
- **Status:** active

## DEC-031: Input Sanitization — DOMPurify + Zod Hardening (Phase 27)

- **Date:** 2026-03-28
- **Decision:** Sanitize all user text at two layers: (1) server-side via `isomorphic-dompurify` before DB/LLM, (2) client-side when rendering user content. Add clarification answer limits (2000 chars, max 5 answers). Add basic LLM prompt injection mitigation.
- **Reason:** User text currently goes through Zod validation only. No HTML sanitization. User input flows directly into LLM prompts (prompt injection risk) and is stored/rendered without sanitization.
- **Alternatives rejected:**
  - Zod `.transform()` only — can't handle HTML entities or complex patterns
  - Server-side only — client needs sanitization for rendering
  - CSP headers only — defense-in-depth layer, not sufficient alone
- **Impact:** New dependency `isomorphic-dompurify`. New utility `sanitize.ts`. Updated validators with answer limits. API routes call `sanitizeInput()` before processing.
- **Status:** active

---

# Tier 3 Decisions

## DEC-032: Structured Logging — @sentry/nextjs + Custom JSON Logger

- **Date:** 2026-03-28
- **Decision:** Custom JSON logger wrapping console methods with structured context. @sentry/nextjs for error tracking. Errors forwarded to Sentry when DSN is configured. Logger provides info/warn/error with context objects.
- **Status:** active

## DEC-033: Security Headers — next.config.ts headers()

- **Date:** 2026-03-28
- **Decision:** Security headers via next.config.ts headers() function. X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP in report-only mode. API routes get Cache-Control: no-store.
- **Status:** active

## DEC-034: Rate Limit Tiers — Grouped by Sensitivity

- **Date:** 2026-03-28
- **Decision:** All 30 API endpoints grouped into 5 rate limit tiers: pipelineStep (100/min), creditPayment (10/min), read (60/min), write (30/min), admin (30/min). Helper utility reduces boilerplate.
- **Status:** active

## DEC-035: Test Framework — Vitest

- **Date:** 2026-03-28
- **Decision:** Vitest for unit testing. 5 test files covering scoring, sanitization, validators, vagueness gate, evidence quantifier. 46 tests total. No E2E tests in v1.
- **Status:** active

## DEC-036: CI/CD — GitHub Actions

- **Date:** 2026-03-28
- **Decision:** Single GitHub Actions workflow triggered on push/PR to main. Jobs: lint, type-check, test, build. Vercel handles deployment separately.
- **Status:** active

---

# Tier 4 Decisions

## DEC-037: SEO — Per-Page Metadata + Sitemap + Robots

- **Date:** 2026-03-28
- **Decision:** Per-page static metadata exports on server component pages. generateMetadata for dynamic routes. Sitemap.ts and robots.ts for crawler guidance. OG + Twitter Card tags on root layout.
- **Status:** active

## DEC-038: Analytics — Vercel Analytics Free Tier

- **Date:** 2026-03-28
- **Decision:** @vercel/analytics for page views (zero config) + typed trackEvent wrapper for 7 conversion events (signup, analysis started/completed, quick roast, credit purchase, report shared, PDF export).
- **Status:** active

## DEC-039: Feedback — User-Submitted Analysis Quality Reports

- **Date:** 2026-03-28
- **Decision:** Users can flag analyses as inaccurate, unhelpful, or other via feedback button on report page. Stored in feedback table. Rate limited 5/hr per user. Admin can view all feedback.
- **Status:** active

---

# Known Issues

Issues identified during quality review (see `weak.md` for full analysis). These are documented here for visibility — each should be addressed before production launch.

| ID | Severity | Issue | Affected Code |
|----|----------|-------|---------------|
| BUG-001 | ~~Critical~~ Fixed | ~~`callGeminiPro()` calls Flash model, not Pro~~ Fixed: uses `gemini-2.5-flash-preview-04-17` | `src/lib/pipeline/ai/gemini-client.ts:44` |
| BUG-002 | ~~Critical~~ Fixed | ~~Pipeline routes lack ownership verification~~ Fixed: `verifyRunOwnership()` on all 7 routes | `/api/pipeline/*` routes |
| BUG-003 | ~~Critical~~ Fixed | ~~No fetch timeouts on signal providers~~ Fixed: 10s timeout on signals, 30s on LLM | `src/lib/pipeline/signals/*` |
| BUG-004 | High | Credit deduction race condition — no DB-level locking on balance check | `POST /api/ideas/[id]/analyze` |
| BUG-005 | ~~High~~ Fixed | ~~LLM responses not validated against schemas~~ Fixed: Zod validation on all pipeline steps | All pipeline steps |
| BUG-006 | High | `GET /api/share/[slug]` queries signal_evidence with report_id instead of analysis_run_id | `src/app/api/share/[slug]/route.ts:76` |
| BUG-007 | ~~Medium~~ Fixed | ~~Scoring magic numbers lack documented rationale~~ Fixed: full rationale documented in evidence-quantifier.ts and weighted-scorer.ts | `src/lib/pipeline/scoring/evidence-quantifier.ts` |
| BUG-008 | Medium | Retry logic doesn't actually resume from failed step | `useAnalysisPipeline` client hook |
