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
| Brand primary | #1E3A5F (deep navy) | Headers, navbars, primary buttons |
| Pursue | #22C55E (green) | Verdict badge, score bars |
| Refine | #F59E0B (amber) | Verdict badge, score bars |
| Test First | #3B82F6 (blue) | Verdict badge, score bars |
| Drop | #EF4444 (red) | Verdict badge, score bars |
| Insufficient Data | #6B7280 (gray) | Verdict badge, score bars |
| Heading font | Inter | All headings and body text |
| Mono font | JetBrains Mono | Scores, data values, code |
| Base text | 14px (text-sm) | Information density |
| Dark mode | None in v1 | |

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
- `HeroSection` — Headline ("Your idea might be terrible. Let's find out."), subhead, embedded Quick Roast form
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
- `PlanComparison` — Free vs Paid feature comparison table
- `CreditPackages` — 3 cards (5/INR99, 20/INR299, 50/INR599) with buy buttons
- `Footer`

**States:**
- Default: all packages visible
- Authenticated: buy buttons active (link to Razorpay checkout)
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
- `CreditBalanceCard` — Current balance, "Buy Credits" link
- `QuickActions` — "Analyze New Idea" primary button
- `IdeasList` — Table/card list of user's ideas with status badges and verdict badges
- `EmptyState` — "No ideas yet" with CTA if user has no ideas

**States:**
- Empty: no ideas → show empty state with CTA
- Populated: ideas list sorted by updated_at DESC
- Loading: skeleton loaders for cards and list

**API dependencies:** `GET /api/ideas`, `GET /api/credits/balance`

---

### `/ideas/new` — New Idea Wizard

**Purpose:** Multi-step form to submit a new idea for analysis.

**Components:**
- `StepIndicator` — Steps: Describe → Details → Review → Submit
- `IdeaInputStep` — Textarea for raw idea (or Quick Roast ID input)
- `IdeaDetailsStep` — Target user, problem statement (optional, guided)
- `IdeaReviewStep` — Show AI interpretation preview, allow edits
- `IdeaSubmitStep` — Confirm, show credit cost (1 credit), submit

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
- `IdeaSummaryCard` — Title, raw input, target user, category badge, status
- `VersionTimeline` — List of idea versions with timestamps
- `AnalysisRunsList` — List of analysis runs with status/verdict badges
- Action buttons: "Re-analyze", "Edit Idea", "Delete"

**States:**
- No analyses: show "Run your first analysis" CTA
- With analyses: list sorted by created_at DESC
- Analysis in progress: show progress link

**API dependencies:** `GET /api/ideas/[id]`

---

### `/ideas/[ideaId]/clarify` — Clarification

**Purpose:** Answer AI-generated clarification questions before analysis proceeds.

**Components:**
- `ClarificationHeader` — Explanation of why questions are being asked
- `QuestionList` — Each question with text input and dimension label
- `SkipOption` — "Skip and proceed with assumptions" button
- `SubmitButton` — Submit answers

**States:**
- Default: questions displayed, inputs empty
- Partially answered: some fields filled
- Loading: submitting answers
- Success: redirect to progress page

**API dependencies:** `POST /api/ideas/[id]/clarify`

---

### `/ideas/[ideaId]/report/[runId]/progress` — Analysis Progress

**Purpose:** Real-time progress tracking during analysis.

**Components:**
- `ProgressTracker` — Vertical stepper showing 7 pipeline steps
- `StepStatus` — Per-step: pending / active (spinner) / completed (check) / failed (X)
- `CurrentStepDetail` — Brief description of what's happening now

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
7. `EvidenceExplorer` — Tabbed by source type (v1: HackerNews | LLM Analysis). Filterable by dimension. Each item shows source, summary, link. Tabs expand as signal providers are added (DEC-011).
8. `NextStepsPanel` — Ordered action items. Contextual per verdict type.
9. `ShareExportBar` — Sticky bottom bar: Copy Share Link, Re-run Analysis, Compare with Another. No PDF export button in v1 (DEC-014).

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
- `ProfileForm` — Display name, email (read-only), avatar
- `DangerZone` — Delete account (links to Supabase account deletion)

**API dependencies:** `GET /api/user/profile`, `PATCH /api/user/profile`

---

### `/settings/billing` — Billing & Credits

**Purpose:** View credit balance, buy credits, see transaction history.

**Components:**
- `CreditBalanceCard` — Current balance, plan badge
- `CreditPackages` — 3 package cards with Razorpay buy buttons
- `RazorpayCheckout` — Loads Razorpay script, triggers checkout popup
- `TransactionHistory` — Table of credit transactions

**States:**
- Default: balance + packages + history
- Purchasing: Razorpay popup open
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
- `CTABanner` — "Get your own roast" linking to `/`

**API dependencies:** `GET /api/share/[slug]`

---

### Admin Pages

All admin pages use `AdminSidebar` navigation and require `admin` role.

| Route | Components | Key Data |
|-------|-----------|----------|
| `/admin` | `MetricsGrid` (cards: users, ideas, analyses, verdicts, active signal providers), `VerdictDistributionChart` | `GET /api/admin/metrics` |
| `/admin/prompts` | `PromptEditor` (code editor), `PromptVersionList` | `GET/PATCH /api/admin/prompts` |
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
