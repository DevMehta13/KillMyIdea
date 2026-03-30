# UI Map

All routes, pages, components, states, and permissions for Kill My Idea.

References:
- PRD Section 7 (Core User Journeys)
- PRD Section 9 (Module Requirements)
- PRD Section 12 (Visual Design Requirements)

---

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Brand primary | #7c6ce7 (soft lavender) | Headers, navbars, primary buttons |
| Pursue | #22C55E (green); displayed as #6ec88e in dark theme | Verdict badge, score bars |
| Refine | #F59E0B (amber); displayed as #d4a06b in dark theme | Verdict badge, score bars |
| Test First | #3B82F6 (blue); displayed as #7ea3d4 in dark theme | Verdict badge, score bars |
| Drop | #EF4444 (red); displayed as #d47070 in dark theme | Verdict badge, score bars |
| Insufficient Data | #6B7280 (gray) | Verdict badge, score bars |
| Heading font | Inter | All headings and body text |
| Mono font | JetBrains Mono | Scores, data values, code |
| Base text | 14px (text-sm) | Information density |
| Dark mode | Warm dark theme applied globally | Background: #1a1a1c, Surface: #222224, Cards: bg-white/[0.05] with border-white/[0.08] (glassmorphism) |

---

## Route Table

| Route | Page Name | Group | Auth | Role | PRD Priority |
|-------|-----------|-------|------|------|-------------|
| `/` | Landing Page | marketing | No | any | P0 |
| `/pricing` | Pricing Page | marketing | No | any | P0 |
| `/report/[shareId]` | Public Shared Report | marketing | No | any | P1 |
| `/roast/[shareId]` | Public Shared Roast | marketing | No | any | P1 |
| `/signin` | Sign In | auth | No | any | P0 |
| `/signup` | Sign Up | auth | No | any | P0 |
| `/forgot-password` | Forgot Password | auth | No | any | P0 |
| `/reset-password` | Reset Password | auth | No | any | P0 |
| `/dashboard` | Dashboard | app | Yes | registered+ | P0 |
| `/ideas/new` | New Idea Wizard | app | Yes | registered+ | P0 |
| `/ideas/[ideaId]` | Idea Detail | app | Yes | owner | P0 |
| `/ideas/[ideaId]/clarify` | Clarification | app | Yes | owner | P0 |
| `/ideas/[ideaId]/report/[runId]` | Full Report | app | Yes | owner | P0 |
| `/ideas/[ideaId]/report/[runId]/progress` | Analysis Progress | app | Yes | owner | P0 |
| `/compare` | Compare Ideas | app | Yes | registered+ | P1 |
| `/settings` | Profile Settings | app | Yes | registered+ | P1 |
| `/settings/billing` | Billing & Credits | app | Yes | registered+ | P0 |
| `/admin` | Admin Dashboard | admin | Yes | admin | P1 |
| `/admin/prompts` | Prompt Editor | admin | Yes | admin | P1 |
| `/admin/jobs` | Job Monitor | admin | Yes | admin | P1 |
| `/admin/analytics` | Analytics | admin | Yes | admin | P1 |
| `/admin/users` | User Management | admin | Yes | admin | P1 |
| `/admin/moderation` | Moderation Queue | admin | Yes | admin | P1 |

---

## Page Specifications

### `/` — Landing Page

**Purpose:** Acquire visitors. Quick Roast as the hook. Conversion to signup.

**Components:**
- `MarketingNavbar` — Logo, Pricing link, Sign In, Get Started button
- `HeroSectionNew` — Enhanced hero with headline, embedded Quick Roast form, floating cards, FAQ section
- `QuickRoastForm` — Textarea (max 500 chars), character counter, submit button, result card
- `HowItWorks` — 3-step visual: Paste idea → Get roast → Go deeper
- `PricingPreview` — Credit package cards (link to /pricing)
- `Footer` — Links, copyright

**States:**
- Default: Quick Roast form empty, ready for input
- Loading: Form submitted, spinner on button, textarea disabled
- Result: Roast result card visible below form with CTA to sign up
- Error: Toast notification for failures

**API dependencies:** `POST /api/quick-roast`

---

### `/pricing` — Pricing Page

**Purpose:** Show credit packages and plan comparison.

**Components:**
- `MarketingNavbar`
- Plan comparison (inline) — Free vs Paid feature comparison with FREE_FEATURES and PAID_FEATURES arrays
- Credit packages (inline) — 3 cards (5/INR99, 20/INR299, 50/INR599) with buy buttons
- `Footer`

Note: Pricing page implements comparison and packages inline, not as separate component files.

**States:**
- Default: all packages visible
- Authenticated: buy buttons active (redirect to Stripe Checkout)
- Unauthenticated: buy buttons link to /signup

**API dependencies:** None (static content, packages from constants)

---

### `/signin` — Sign In

**Purpose:** Authenticate existing users.

**Components:**
- `SignInForm` — Email + password fields, submit button, "Forgot password?" link
- Google OAuth button
- Link to /signup

**States:**
- Default: form empty
- Loading: submit button loading
- Error: inline field errors or toast for auth failures
- Success: redirect to /dashboard (or to /ideas/new if `?redirect=` param)

**API dependencies:** Supabase Auth `signInWithPassword`, `signInWithOAuth`

---

### `/signup` — Sign Up

**Purpose:** Register new users. Support Quick Roast continuity.

**Components:**
- `SignUpForm` — Email + password + confirm password, submit
- Google OAuth button
- Link to /signin

**States:**
- Default: form empty
- With `?quickRoastId=`: banner saying "Sign up to save your roast and go deeper"
- Loading: submit button loading
- Error: inline validation, duplicate email error
- Success: redirect to /dashboard. If quickRoastId, link Quick Roast idea to new user.

**API dependencies:** Supabase Auth `signUp`

---

### `/dashboard` — Dashboard

**Purpose:** Home base for authenticated users. See ideas, credit balance, quick actions.

**Components:**
- `AppNavbar` — Logo, credit balance pill, user avatar dropdown
- `AppSidebar` — Dashboard (active), My Ideas, Compare, Settings
- `CreditBalanceCard` — Current balance, "Buy Credits" link (separate component)
- Quick actions (inline) — "Analyze New Idea" primary button
- `IdeasList` — Table/card list of user's ideas with status badges and verdict badges (separate component)
- Empty state (inline) — "No ideas yet" with CTA if user has no ideas

**States:**
- Empty: no ideas → show empty state with CTA
- Populated: ideas list sorted by updated_at DESC
- Loading: skeleton loaders for cards and list

**API dependencies:** `GET /api/ideas`, `GET /api/credits/balance`

---

### `/ideas/new` — New Idea Wizard

**Purpose:** Multi-step form to submit a new idea for analysis.

**Components:**
- Step indicator (inline) — Steps: Describe → Details → Review → Submit
- Step 1: Idea input — Textarea for raw idea description
- Step 2: Details — Target user, problem statement (optional, guided)
- Step 3: Review — Show summary, allow edits
- Step 4: Submit — Confirm, show credit cost (1 credit), submit

Note: All wizard steps are implemented inline within the page component, not as separate component files.

**States:**
- Step 1: textarea for idea description
- Step 2: optional detail fields
- Step 3: AI interpretation preview (calls interpret endpoint)
- Step 4: confirmation with credit deduction warning
- Loading: between steps when AI is processing
- Error: step-level validation errors

**API dependencies:** `POST /api/ideas`, `POST /api/ideas/[id]/analyze`

---

### `/ideas/[ideaId]` — Idea Detail

**Purpose:** View a single idea with its history and analysis runs.

**Components:**
- Idea summary (inline) — Title, raw input, target user, category badge, status
- Analysis runs list (inline) — List of analysis runs with status/verdict badges
- Action buttons: "Re-analyze", "Edit Idea", "Delete"

Note: Summary and analysis list are rendered inline in the page component. No separate `VersionTimeline` or `AnalysisRunsList` component files exist.

**States:**
- No analyses: show "Run your first analysis" CTA
- With analyses: list sorted by created_at DESC
- Analysis in progress: show progress link

**API dependencies:** `GET /api/ideas/[id]`

---

### `/ideas/[ideaId]/clarify` — Clarification

**Purpose:** Answer AI-generated clarification questions before analysis proceeds.

**Components:**
- Clarification header (inline) — Explanation of why questions are being asked
- `VaguenessBlocker` — Full-width amber banner shown when `vagueness_score >= 0.7` (DEC-021). Explains why clarification is mandatory. Displayed above question list.
- `QuestionList` — Each question with text input and dimension label
- `SkipOption` — "Skip and proceed with assumptions" button. **Hidden when vagueness-blocked** (DEC-021).
- `SubmitButton` — Submit answers

**States:**
- Default: questions displayed, inputs empty
- Vagueness-blocked: `VaguenessBlocker` banner shown, skip button hidden, must answer before proceeding
- Partially answered: some fields filled
- Loading: submitting answers
- Success: redirect to progress page

**API dependencies:** `POST /api/ideas/[id]/clarify`

---

### `/ideas/[ideaId]/report/[runId]/progress` — Analysis Progress

**Purpose:** Real-time progress tracking during analysis.

**Components:**
- Progress tracker (inline) — Vertical stepper showing 7 pipeline steps with per-step status indicators
- Each step shows: pending / active (spinner) / completed (check) / failed (X) with description

Note: Progress tracking is implemented inline in the page component, not as separate component files.

**States:**
- In progress: current step highlighted, previous steps checked
- Completed: auto-redirect to report page
- Failed: show error message with retry button
- Waiting for clarification: redirect to clarify page

**Behavior:**
- Client calls each pipeline step sequentially (see ARCHITECTURE.md)
- UI updates after each step completes
- If a step fails, show error and "Retry" button for that step

**API dependencies:** Pipeline step endpoints, `GET /api/ideas/[id]/analysis/[runId]/status`

---

### `/ideas/[ideaId]/report/[runId]` — Full Report (CORE PAGE)

**Purpose:** The primary product output. Full analysis verdict with evidence.

**Components (top to bottom):**
1. `VerdictBanner` — Full-width colored banner: verdict, overall score (large), confidence, one-liner
2. `PursueWarningLayer` — Yellow callout (only for "Pursue" verdict): "This doesn't mean guaranteed success..."
3. `SubScoreGrid` — 2x4 grid of dimension cards. Each: name, score bar (colored), weight %, reasoning snippet. 8th card = overall confidence.
4. `ReasoningSection` — Narrative organized by dimension. Evidence references inline (clickable).
5. `AssumptionsPanel` — List of assumptions. Tagged: "user-stated" (blue badge) or "inferred" (amber badge).
6. `FlagsList` — Two columns: Red Flags (left) | Green Flags (right). Each with icon + text + evidence link.
7. `EvidenceExplorer` — Tabbed by source type: Web Search | HackerNews | Google Trends | LLM Analysis. Filterable by dimension. Each item shows source, summary, link, and `EvidenceBadge` (verified/unverified — DEC-022). Tabs expand as signal providers are added (DEC-011).
8. `PaywallOverlay` — Blurred overlay for report sections in preview/teaser mode. Shows lock icon and "Get Full Report" CTA. Used on Quick Roast upsell flow (DEC-023).
9. `ClarificationAnswers` — Shows founder's Q&A pairs with dimension badges (DEC-026)
10. `PDFExportButton` — Dynamic import trigger for PDF generation (DEC-027)
11. `NextStepsPanel` — Ordered action items. Contextual per verdict type.
12. `ShareExportBar` — Sticky bottom bar: Copy Share Link, Re-run Analysis, Compare with Another, Export PDF (DEC-027).

**States:**
- Loading: skeleton loaders for all sections
- Loaded: full report rendered
- Error: error boundary with retry

**API dependencies:** `GET /api/ideas/[id]/report?run_id=[runId]`

**Design notes (from PRD Section 12):**
- Verdict badge with strong hierarchy
- Sub-score cards or compact score table
- Red/yellow/green flags in scannable format
- Confidence indicator separate from verdict
- Clear separation between evidence, interpretation, and action
- Professional export design (shareable with mentors)

---

### `/compare` — Compare Ideas

**Purpose:** Side-by-side comparison of 2-4 analyzed ideas.

**Components:**
- `IdeaSelector` — Multi-select from user's analyzed ideas (min 2, max 4)
- `ComparisonTable` — Matrix: ideas as columns, dimensions as rows, scores in cells
- `ComparisonTakeaway` — AI-generated comparison narrative
- `EmptyState` — "Need at least 2 analyzed ideas to compare"

**States:**
- No analyzed ideas: empty state
- Selecting: dropdown/search for ideas
- Loading: generating comparison
- Loaded: table + takeaway rendered

**API dependencies:** `POST /api/ideas/compare`, `GET /api/ideas`

---

### `/settings` — Profile Settings

**Purpose:** View and update profile info.

**Components:**
- `ProfileForm` — Display name, email (read-only), avatar, email notification toggle (DEC-030)
- `DangerZone` — Delete account (links to Supabase account deletion)

**API dependencies:** `GET /api/user/profile`, `PATCH /api/user/profile`

---

### `/settings/billing` — Billing & Credits

**Purpose:** View credit balance, buy credits, see transaction history.

**Components:**
- `CreditBalanceCard` — Current balance, plan badge
- `CreditPackages` — 3 package cards with Stripe Checkout buy buttons
- `TransactionHistory` — Table of credit transactions

**States:**
- Default: balance + packages + history
- Purchasing: Stripe Checkout redirect in progress
- Success: toast "Credits added!", balance updated
- History empty: "No transactions yet"

**API dependencies:** `GET /api/credits/balance`, `POST /api/credits/purchase`, `POST /api/credits/verify`, `GET /api/credits/transactions`

---

### `/report/[shareId]` — Public Shared Report

**Purpose:** Read-only view of a shared report. No auth required.

**Components:**
- Same report components as the authenticated report page
- `MarketingNavbar` instead of AppNavbar
- `CTABanner` — "Analyze your own idea" at the bottom
- No edit/rerun/compare actions

**States:**
- Loading: skeleton
- Loaded: report rendered
- Not found: 404 page
- Expired: "This link has expired" message

**API dependencies:** `GET /api/share/[slug]`

---

### `/roast/[shareId]` — Public Shared Roast

**Purpose:** Read-only view of a Quick Roast result.

**Components:**
- `RoastResult` — first_impression, biggest_flaw, what_to_clarify
- `ReportPreview` — Blurred/skeleton preview of full report sections with `PaywallOverlay` (DEC-023). Shows what a full analysis would reveal, driving signup conversion.
- `CTABanner` — "Get the full report" linking to `/signup` (or `/ideas/new` for authenticated users)

**API dependencies:** `GET /api/share/[slug]`

---

### Admin Pages

All admin pages use `AdminSidebar` navigation and require `admin` role.

| Route | Components | Key Data |
|-------|-----------|----------|
| `/admin` | `MetricsGrid` (cards: users, ideas, analyses, verdicts, active signal providers) | `GET /api/admin/metrics` |
| `/admin/prompts` | `PromptEditor` (key-value settings editor) | `GET/PATCH /api/admin/prompts` |
| `/admin/jobs` | `JobTable` (filterable by status), retry button per job | `GET /api/admin/jobs` |
| `/admin/analytics` | Conversion funnels, verdict distributions, signal quality | `GET /api/admin/metrics` |
| `/admin/users` | `UserTable` (search by email), credit adjustment form | `GET /api/admin/users` |
| `/admin/moderation` | `ModerationQueue` (shared content review) | `GET /api/admin/moderation` |

---

## Layout Components

### `MarketingNavbar`
- Logo (links to `/`)
- Pricing (links to `/pricing`)
- Sign In (links to `/signin`)
- Get Started button (links to `/signup`)
- Responsive: hamburger menu on mobile

### `AppNavbar`
- Logo (links to `/dashboard`)
- Credit balance pill (links to `/settings/billing`)
- User avatar + dropdown: Profile, Settings, Sign Out
- Responsive: collapses credit pill text on mobile

### `AppSidebar`
- Dashboard
- My Ideas (with count badge)
- Compare
- Settings
- Admin (only visible to admin role)
- Responsive: collapses to sheet on mobile (triggered by hamburger in navbar)

### `AdminSidebar`
- Dashboard
- Prompts
- Jobs
- Analytics
- Users
- Moderation
- Back to App (links to `/dashboard`)

### `Footer`
- Product links: Pricing, Sign In
- Legal links: Privacy, Terms (placeholder pages)
- "Built with Kill My Idea" tagline

---

## Error Pages

**Error Pages (DEC-028):**
Each route group has its own `error.tsx` with contextual messaging:
- `(app)/error.tsx` — "Something went wrong" + retry + link to dashboard
- `(auth)/error.tsx` — "Authentication error" + retry + link to signin
- `(marketing)/error.tsx` — "Page error" + retry + link to home
- `(admin)/admin/error.tsx` — "Admin error" + retry + link to admin dashboard
