# Database Schema

All entities, fields, relationships, and constraints for Kill My Idea. Source of truth for the Supabase migration.

References:
- PRD Section 14 (High-Level Data Model)
- PRD Section 10 (Scoring and Verdict Design)
- PRD Section 9 (Module Requirements)

---

## Entity Overview

```
auth.users (Supabase managed)
    │
    └──< profiles (1:1)
            │
            ├──< ideas (1:N)
            │       │
            │       ├──< idea_versions (1:N)
            │       │
            │       └──< analysis_runs (1:N)
            │               │
            │               ├──< signal_evidence (1:N)
            │               │
            │               └──< reports (1:1)
            │                       │
            │                       └──< share_links (1:N)
            │
            ├──< credit_transactions (1:N)
            │
            └──< feedback (1:N)

admin_settings (standalone key-value store)
```

---

## Enums and Statuses

### User Roles
```
'visitor' | 'registered' | 'paid' | 'admin'
```

### User Plans
```
'free' | 'starter' | 'pro'
```
> [ASSUMPTION] Plan names. PRD Section 13 mentions "free, starter, and extra-credit purchases" but does not define exact plan names. `starter` and `pro` are placeholders.

### Idea Status
```
'draft' | 'submitted' | 'analyzing' | 'completed' | 'failed'
```

### Analysis Run Status
```
'queued' | 'interpreting' | 'clarifying' | 'waiting_for_clarification'
| 'collecting_signals' | 'interpreting_signals' | 'scoring'
| 'generating_verdict' | 'generating_report' | 'completed' | 'failed'
```

### Verdict
```
'pursue' | 'refine' | 'test_first' | 'drop' | 'insufficient_data'
```

### Signal Source Type
```
'hackernews' | 'llm_knowledge' | 'serper' | 'google_trends'
```
> v1 launched with HackerNews only. Migration 002 expanded to include `llm_knowledge`, `serper`, and `google_trends` (DEC-018, DEC-019).

### Signal Category (maps to scoring dimensions)
```
'demand' | 'urgency' | 'distribution' | 'differentiation'
| 'competition' | 'monetization' | 'execution'
```

### Idea Category (ML classifier output)
```
'b2b_saas' | 'consumer_app' | 'devtool' | 'marketplace' | 'hardware'
| 'fintech' | 'edtech' | 'healthtech' | 'creator_economy' | 'other'
```

### Credit Transaction Type
```
'purchase' | 'deduction' | 'refund' | 'adjustment' | 'signup_bonus'
```

### Report Type
```
'full' | 'quick_roast'
```

### Share Visibility
```
'public' | 'unlisted'
```
> `public` = discoverable (future), `unlisted` = link-only.

---

## Entity Definitions

### `profiles`

Extends Supabase `auth.users`. Auto-created on signup via trigger.

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | uuid | no | — | PK, FK → auth.users.id | Same as auth user ID |
| email | text | no | — | unique | Copied from auth.users |
| display_name | text | yes | null | | User's display name |
| role | text | no | 'registered' | Check: valid role enum | |
| plan | text | no | 'free' | Check: valid plan enum | |
| credit_balance | integer | no | 0 | Check: >= 0 | Atomic updates only |
| avatar_url | text | yes | null | | Profile picture URL |
| email_notifications | boolean | no | true | | Email opt-out (DEC-030) |
| created_at | timestamptz | no | now() | | |
| updated_at | timestamptz | no | now() | | Auto-updated by trigger |

**Indexes:**
- `profiles_email_idx` on email

**RLS policies:**
- SELECT: users can read own profile; admins can read all
- UPDATE: users can update own profile (`auth.uid() = id`). **Note:** Column-level restrictions on role, plan, and credit_balance are enforced at the API layer (`PATCH /api/user/profile` only accepts `display_name`), not by RLS. Admin credit adjustments use service role.
- INSERT: only via `handle_new_user()` trigger
- DELETE: not allowed (soft delete not needed — auth.users handles account deletion)

---

### `ideas`

A user's startup idea submission.

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | uuid | no | gen_random_uuid() | PK | |
| user_id | uuid | yes | null | FK → profiles.id | null for anonymous Quick Roast |
| title | text | no | — | max 200 chars | Short idea title |
| raw_input | text | no | — | max 5000 chars | Original idea description |
| target_user | text | yes | null | max 500 chars | Who is this for |
| problem_statement | text | yes | null | max 2000 chars | What problem does it solve |
| status | text | no | 'draft' | Check: valid status enum | |
| category | text | yes | null | Check: valid category enum | Set by LLM inline classification (DEC-016) |
| is_quick_roast | boolean | no | false | | Quick Roast vs full idea |
| tags | text[] | yes | null | | User-defined tags (P2 feature) |
| deleted_at | timestamptz | yes | null | | Soft delete |
| created_at | timestamptz | no | now() | | |
| updated_at | timestamptz | no | now() | | Auto-updated by trigger |

**Indexes:**
- `ideas_user_id_idx` on user_id
- `ideas_status_idx` on status
- `ideas_created_at_idx` on created_at DESC

**RLS policies:**
- SELECT: users can read own ideas; admins can read all
- INSERT: authenticated users only (`auth.uid() = user_id`). Anonymous Quick Roasts are created via service role in the API route, bypassing RLS.
- UPDATE: users can update own ideas (except id, user_id, created_at)
- DELETE: not allowed (use soft delete via deleted_at)

**Soft delete:** Set `deleted_at` to now(). All queries should filter `WHERE deleted_at IS NULL` unless specifically viewing trash.

---

### `idea_versions`

Versioned interpretations of an idea. Created each time the idea is analyzed or clarifications are answered.

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | uuid | no | gen_random_uuid() | PK | |
| idea_id | uuid | no | — | FK → ideas.id | |
| version_number | integer | no | — | | Incrementing per idea |
| structured_summary | jsonb | yes | null | | AI-generated structured interpretation |
| clarification_questions | jsonb | yes | null | | Array of question objects |
| clarification_answers | jsonb | yes | null | | Array of answer objects |
| clarification_status | text | no | 'pending' | Check: 'pending'/'answered'/'skipped' | |
| created_at | timestamptz | no | now() | | |

**`structured_summary` JSONB shape:**
```json
{
  "problem": "string",
  "solution": "string",
  "target_user": "string",
  "business_model": "string",
  "key_assumptions": ["string"],
  "vagueness_flags": ["string"],
  "vagueness_score": 0.0
}
```

**`clarification_questions` JSONB shape:**
```json
[
  {
    "id": "q1",
    "question": "string",
    "dimension": "demand | urgency | ...",
    "why_asked": "string"
  }
]
```

**Indexes:**
- `idea_versions_idea_id_idx` on idea_id

**RLS:** Same as ideas (owner or admin).

---

### `analysis_runs`

Each execution of the analysis pipeline on an idea version.

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | uuid | no | gen_random_uuid() | PK | |
| idea_id | uuid | no | — | FK → ideas.id | |
| idea_version_id | uuid | no | — | FK → idea_versions.id | |
| status | text | no | 'queued' | Check: valid status enum | |
| current_step | integer | yes | null | | 1-7, for progress tracking |
| input_snapshot | jsonb | no | — | | Frozen copy of idea + answers at analysis time |
| scores | jsonb | yes | null | | Per-dimension scores (set in step 5) |
| overall_score | numeric(4,2) | yes | null | | 0.00 - 10.00 |
| verdict | text | yes | null | Check: valid verdict enum | Set in step 6 |
| confidence | numeric(3,2) | yes | null | | 0.00 - 1.00 |
| assumptions | jsonb | yes | null | | Array of assumption objects |
| red_flags | jsonb | yes | null | | Array of flag objects |
| green_flags | jsonb | yes | null | | Array of flag objects |
| override_applied | text | yes | null | | Which guardrail override triggered, if any |
| override_reason | text | yes | null | | Why the override changed the verdict |
| model_used | text | yes | null | | Which LLM was used (for debugging) |
| completed_steps | integer[] | no | '{}' | | Steps completed for retry (DEC-024) |
| credits_charged | integer | no | 0 | | Credits deducted for this run |
| error | text | yes | null | | Error message if status = 'failed' |
| started_at | timestamptz | yes | null | | When processing started |
| completed_at | timestamptz | yes | null | | When processing finished |
| created_at | timestamptz | no | now() | | |
| updated_at | timestamptz | no | now() | | Auto-updated by trigger |

**`scores` JSONB shape:**
```json
{
  "demand": { "score": 7.5, "weight": 0.20, "confidence": 0.8, "reasoning": "string" },
  "urgency": { "score": 6.0, "weight": 0.20, "confidence": 0.7, "reasoning": "string" },
  "distribution": { "score": 5.5, "weight": 0.20, "confidence": 0.6, "reasoning": "string" },
  "differentiation": { "score": 8.0, "weight": 0.12, "confidence": 0.9, "reasoning": "string" },
  "competition": { "score": 4.0, "weight": 0.10, "confidence": 0.7, "reasoning": "string" },
  "monetization": { "score": 6.5, "weight": 0.10, "confidence": 0.5, "reasoning": "string" },
  "execution": { "score": 7.0, "weight": 0.08, "confidence": 0.6, "reasoning": "string" }
}
```

**Indexes:**
- `analysis_runs_idea_id_idx` on idea_id
- `analysis_runs_status_idx` on status
- `analysis_runs_created_at_idx` on created_at DESC

**RLS:** Users can read/create for own ideas. Admins can read all and update status.

---

### `signal_evidence`

Raw market signal data collected during analysis.

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | uuid | no | gen_random_uuid() | PK | |
| analysis_run_id | uuid | no | — | FK → analysis_runs.id | |
| source_type | text | no | — | Check: in ('hackernews', 'llm_knowledge', 'serper', 'google_trends') | See migration 002 (DEC-018, DEC-019) |
| signal_category | text | yes | null | Check: valid signal category enum | Which scoring dimension this maps to |
| raw_data | jsonb | no | — | | Unprocessed API response (trimmed) |
| normalized_summary | text | yes | null | | AI-generated or extracted summary |
| signal_strength | numeric(3,2) | yes | null | | 0.00 - 1.00 (set in step 4) |
| source_url | text | yes | null | | Link to source for traceability |
| created_at | timestamptz | no | now() | | |

**Indexes:**
- `signal_evidence_analysis_run_id_idx` on analysis_run_id

**RLS:** Read-only access for idea owner. Admin can read all.

---

### `reports`

Generated analysis reports. One report per completed analysis run.

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | uuid | no | gen_random_uuid() | PK | |
| analysis_run_id | uuid | no | — | FK → analysis_runs.id, unique | 1:1 with analysis run |
| idea_id | uuid | no | — | FK → ideas.id | Denormalized for query convenience |
| report_type | text | no | 'full' | Check: valid report type enum | |
| content | jsonb | no | — | | Full report data |
| quick_roast_teaser | jsonb | yes | null | | Quick Roast specific output |
| created_at | timestamptz | no | now() | | |

**`content` JSONB shape (full report):**
```json
{
  "executive_summary": "string",
  "idea_interpretation": { "problem": "...", "solution": "...", "target_user": "..." },
  "verdict": { "verdict": "pursue", "score": 7.2, "confidence": 0.75, "one_liner": "string" },
  "dimension_reasoning": [
    {
      "dimension": "demand",
      "score": 7.5,
      "reasoning": "string",
      "evidence_refs": ["signal_evidence_id_1"]
    }
  ],
  "assumptions": [
    { "text": "string", "type": "user_stated | inferred", "source": "string" }
  ],
  "red_flags": [
    { "text": "string", "severity": "high | medium | low", "evidence_ref": "string" }
  ],
  "green_flags": [
    { "text": "string", "strength": "strong | moderate", "evidence_ref": "string" }
  ],
  "next_steps": [
    { "action": "string", "priority": 1, "type": "test | refine | validate | build" }
  ],
  "weaknesses": "string",
  "strengthening_suggestions": "string",
  "clarification_qa": [
    { "question": "string", "answer": "string", "dimension": "demand" }
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| clarification_qa | ClarificationQA[] | optional | Founder's answers to clarification questions (DEC-026) |

**`quick_roast_teaser` JSONB shape:**
```json
{
  "first_impression": "string",
  "biggest_flaw": "string",
  "what_to_clarify": "string"
}
```

**Indexes:**
- `reports_idea_id_idx` on idea_id

**RLS:** Read-only for idea owner. Public read via share_links (separate query path). Admin can read all.

---

### `credit_transactions`

Ledger of all credit changes. Immutable — never update or delete rows.

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | uuid | no | gen_random_uuid() | PK | |
| user_id | uuid | no | — | FK → profiles.id | |
| type | text | no | — | Check: valid transaction type enum | |
| amount | integer | no | — | | Positive for credit, negative for debit |
| balance_after | integer | no | — | | Snapshot of balance after this transaction |
| description | text | yes | null | | Human-readable reason |
| analysis_run_id | uuid | yes | null | FK → analysis_runs.id | For deductions |
| razorpay_order_id | text | yes | null | | Legacy name; stores Stripe payment_intent ID |
| razorpay_payment_id | text | yes | null | | Legacy name; stores Stripe session ID |
| created_at | timestamptz | no | now() | | |

**Indexes:**
- `credit_transactions_user_id_created_at_idx` on (user_id, created_at DESC)

**RLS:** Users can read own transactions. Admins can read all and insert adjustments.

**Important:** Credit deduction must be atomic. Use a database function:
```sql
deduct_credits(p_user_id uuid, p_amount integer, p_description text DEFAULT 'Analysis credit', p_analysis_run_id uuid DEFAULT null)
```
This function should: check balance >= amount, deduct, insert transaction row, all in a single transaction.

---

### `share_links`

Public share links for reports and quick roasts.

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | uuid | no | gen_random_uuid() | PK | |
| report_id | uuid | no | — | FK → reports.id | |
| slug | text | no | — | unique, max 20 chars | nanoid-generated |
| visibility | text | no | 'unlisted' | Check: valid visibility enum | |
| view_count | integer | no | 0 | | Incremented on view |
| expires_at | timestamptz | yes | null | | Optional expiry |
| created_at | timestamptz | no | now() | | |

**Indexes:**
- `share_links_report_id_idx` on report_id

**RLS:** Owner can create/read. Public can read by slug (for viewing shared reports). Admin can read all.

---

### `admin_settings`

Key-value store for system configuration. Used for prompt templates, signal provider config, feature flags.

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| key | text | no | — | PK | |
| value | jsonb | no | — | | |
| updated_at | timestamptz | no | now() | | Auto-updated by trigger |

**Seed values:**
```sql
INSERT INTO admin_settings (key, value) VALUES
  ('free_signup_credits', '3'),
  ('signal_providers', '{"hackernews": {"enabled": true}}'),
  ('classification_method', '"llm"'),
  ('credit_packages', '[
    {"id": "pack_5", "credits": 5, "price_inr": 99},
    {"id": "pack_20", "credits": 20, "price_inr": 299},
    {"id": "pack_50", "credits": 50, "price_inr": 599}
  ]'),
  ('scoring_weights', '{"demand":0.20,"urgency":0.20,"distribution":0.20,"differentiation":0.12,"competition":0.10,"monetization":0.10,"execution":0.08}');
```

**RLS:** Admin-only read/write. No public access.

---

### `feedback`

User-submitted quality reports on analysis results (DEC-039).

| Column | Type | Nullable | Default | Constraints | Notes |
|--------|------|----------|---------|-------------|-------|
| id | uuid | no | gen_random_uuid() | PK | |
| user_id | uuid | no | — | FK → profiles.id | |
| analysis_run_id | uuid | yes | null | FK → analysis_runs.id | Optional link to specific analysis |
| type | text | no | — | Check: 'inaccurate' / 'unhelpful' / 'other' | |
| message | text | yes | null | max 2000 chars | Free-text feedback |
| created_at | timestamptz | no | now() | | |

**RLS policies:**
- INSERT: authenticated users can insert own feedback (`user_id = auth.uid()`)
- SELECT: admin only (for review via moderation queue)
- UPDATE/DELETE: not allowed

---

## Database Functions

### `update_updated_at()`
Trigger function applied to all tables with `updated_at` column. Sets `updated_at = now()` on every UPDATE.

### `handle_new_user()`
Trigger on `auth.users` INSERT. Creates a corresponding `profiles` row with:
- `id` = new user's ID
- `email` = new user's email
- `role` = 'registered'
- `plan` = 'free'
- `credit_balance` = value from `admin_settings.free_signup_credits`

Also inserts a `credit_transactions` row with type `'signup_bonus'`, recording the initial credit grant.

### `deduct_credits(p_user_id uuid, p_amount integer, p_description text DEFAULT 'Analysis credit', p_analysis_run_id uuid DEFAULT null)`
Atomic credit deduction:
1. SELECT `credit_balance` FROM `profiles` WHERE `id = p_user_id` FOR UPDATE
2. If balance < amount, raise exception
3. UPDATE `profiles` SET `credit_balance = credit_balance - p_amount`
4. INSERT into `credit_transactions` with type='deduction', balance_after, analysis_run_id
5. RETURN new balance

### `add_credits(p_user_id uuid, p_amount integer, p_description text DEFAULT 'Credit purchase', p_razorpay_order_id text DEFAULT null, p_razorpay_payment_id text DEFAULT null)`
Atomic credit addition (for purchases and adjustments):
1. UPDATE `profiles` SET `credit_balance = credit_balance + p_amount`
2. INSERT into `credit_transactions` with type='purchase', balance_after, razorpay fields
3. RETURN new balance

---

## Migration Notes

- **Migration 001** (`001_initial_schema.sql`): Creates all tables, enums (as check constraints), triggers, functions, indexes, and RLS policies.
- **Migration 002** (`002_tier1_signal_sources.sql`): Expands `signal_evidence.source_type` CHECK to include `llm_knowledge`, `serper`, `google_trends` (DEC-018, DEC-019).
- **Migration 003** (`003_tier2_error_recovery.sql`): Adds `completed_steps integer[]` to `analysis_runs` for retry support (DEC-024).
- **Migration 004** (`004_tier2_email_notifications.sql`): Adds `email_notifications boolean` to `profiles` (DEC-030).
- **Migration 005** (`005_tier3_indexes.sql`): Adds 6 performance indexes on hot columns (DEC-034).
- **Migration 006** (`006_tier4_feedback.sql`): Creates `feedback` table with RLS policies (DEC-039).
- All tables use `uuid` primary keys generated by `gen_random_uuid()`.
- All timestamps are `timestamptz` (timezone-aware).
- JSONB columns should have application-level validation (Zod schemas) since PostgreSQL doesn't validate JSONB structure.

---

## Soft Delete Rules

| Table | Soft Delete | Reason |
|-------|-------------|--------|
| profiles | No | Handled by Supabase auth.users deletion |
| ideas | Yes (`deleted_at`) | Users may want to recover ideas |
| idea_versions | No | Always keep for history |
| analysis_runs | No | Always keep for history and debugging |
| signal_evidence | No | Immutable analysis data |
| reports | No | Immutable analysis output |
| credit_transactions | No | Immutable ledger |
| share_links | No | Can expire via `expires_at` |
| admin_settings | No | Key-value store, overwrite not delete |
| feedback | No | Immutable quality reports |

---

## Assumptions

- `[ASSUMPTION]` Plan names (free/starter/pro) are not finalized in PRD. PRD Section 13 mentions "free, starter, and extra-credit purchases."
- `[ASSUMPTION]` Tags on ideas are text arrays for now (P2 feature from PRD Section 9.6).
- `[ASSUMPTION]` `quick_roast_teaser` is stored separately from `content` for easier access on the marketing Quick Roast flow.
- `[ASSUMPTION]` `signal_evidence.raw_data` stores trimmed API responses (not full payloads) to stay within Supabase free tier storage.
- `[RESOLVED]` Free credits on signup = 3 (DEC-010).
- `[RESOLVED]` Category classification uses LLM inline, not separate ML model (DEC-016).
