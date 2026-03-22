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

## DEC-001: Framework — Next.js 14+ with App Router

- **Date:** 2026-03-22
- **Decision:** Use Next.js 14+ with App Router, TypeScript, and `src/` directory.
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

## DEC-005: Payments — Razorpay (Test Mode)

- **Date:** 2026-03-22
- **Decision:** Use Razorpay in test mode for credit purchases. INR pricing.
- **Reason:** User is India-based. Razorpay is the standard Indian payment gateway. Test mode allows full payment flow implementation without live transactions. Can switch to live mode later.
- **Alternatives rejected:**
  - Stripe — not India-optimized, requires business verification
  - PayU — less developer-friendly API
  - No payment system — would block billing module entirely
- **Impact:** Billing UI, credit purchase flow, webhook handling.
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

## DEC-014: PDF Export — Deferred to v2

- **Date:** 2026-03-22 (approved)
- **Decision:** No PDF export in v1. Focus on share links for report distribution. PDF export is a v2 feature.
- **Reason:** PDF export is P1 in the PRD. Share links achieve the same distribution goal with less complexity. Browser print CSS provides a basic fallback.
- **Alternatives rejected:**
  - Basic HTML-to-PDF — still requires a rendering library
  - Styled PDF template — significant design work for P1 feature
- **Impact:** `ShareExportBar` has no "Export PDF" button in v1. The button slot can show "Coming soon" or be omitted entirely.
- **Status:** active

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
