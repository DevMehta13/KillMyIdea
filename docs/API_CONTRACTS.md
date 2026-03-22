# API Contracts

All API endpoints for Kill My Idea. Grouped by module.

**Conventions:**
- All request/response bodies are JSON
- Auth: Supabase session cookie (handled by `@supabase/ssr`)
- Error responses follow: `{ error: string, message: string, details?: unknown }`
- All IDs are UUIDs
- Dates are ISO 8601 strings
- Pagination (where applicable): `?page=1&limit=20`

---

## Quick Roast Module

### `POST /api/quick-roast`

Submit an idea for a quick, public roast. No auth required.

**Auth:** None

**Rate limit:** 3 requests per IP per hour

**Request:**
```json
{
  "idea": "string (required, max 500 chars)"
}
```

**Validation:**
- `idea` must be non-empty string, 10-500 characters
- Reject if rate limit exceeded for IP

**Response (200):**
```json
{
  "id": "uuid (idea ID)",
  "roast": {
    "first_impression": "string (2-3 sentences, harsh but constructive)",
    "biggest_flaw": "string (1 sentence)",
    "what_to_clarify": "string (1 question)"
  }
}
```

**Errors:**
- 400: Invalid input (idea too short/long)
- 429: Rate limit exceeded (`{ error: "rate_limited", message: "...", retryAfter: seconds }`)
- 500: LLM call failed

**Notes:**
- Creates an `ideas` row with `is_quick_roast=true`, `user_id=null`
- Creates a `reports` row with `report_type='quick_roast'`
- Result stored so it can be shared via `/roast/[shareId]`

---

## Ideas Module

### `POST /api/ideas`

Create a new idea.

**Auth:** Required (registered user). Optional for Quick Roast continuity (with `quickRoastId`).

**Request:**
```json
{
  "title": "string (required, max 200 chars)",
  "raw_input": "string (required, max 5000 chars)",
  "target_user": "string (optional, max 500 chars)",
  "problem_statement": "string (optional, max 2000 chars)",
  "quickRoastId": "uuid (optional — link to a previous Quick Roast)"
}
```

**Validation:**
- `title` required, 3-200 chars
- `raw_input` required, 10-5000 chars
- If `quickRoastId` provided, verify it exists and is a Quick Roast with no user_id (or same user_id)

**Response (201):**
```json
{
  "id": "uuid",
  "title": "string",
  "status": "draft",
  "created_at": "ISO 8601"
}
```

**Errors:**
- 400: Validation error
- 401: Not authenticated
- 404: quickRoastId not found

---

### `GET /api/ideas`

List the authenticated user's ideas.

**Auth:** Required

**Query params:**
- `status` (optional): filter by status
- `page` (optional, default 1)
- `limit` (optional, default 20, max 50)

**Response (200):**
```json
{
  "ideas": [
    {
      "id": "uuid",
      "title": "string",
      "status": "draft | submitted | analyzing | completed | failed",
      "category": "string | null",
      "is_quick_roast": false,
      "latest_verdict": "pursue | refine | ... | null",
      "latest_score": 7.2,
      "analysis_count": 2,
      "created_at": "ISO 8601",
      "updated_at": "ISO 8601"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**Notes:** Excludes soft-deleted ideas. `latest_verdict` and `latest_score` are from the most recent completed analysis run.

---

### `GET /api/ideas/[id]`

Get a single idea with its versions and analysis runs.

**Auth:** Required (owner or admin)

**Response (200):**
```json
{
  "idea": {
    "id": "uuid",
    "title": "string",
    "raw_input": "string",
    "target_user": "string | null",
    "problem_statement": "string | null",
    "status": "string",
    "category": "string | null",
    "created_at": "ISO 8601"
  },
  "versions": [
    {
      "id": "uuid",
      "version_number": 1,
      "structured_summary": {},
      "clarification_status": "pending | answered | skipped",
      "created_at": "ISO 8601"
    }
  ],
  "analysis_runs": [
    {
      "id": "uuid",
      "status": "completed",
      "verdict": "refine",
      "overall_score": 6.1,
      "confidence": 0.72,
      "created_at": "ISO 8601",
      "completed_at": "ISO 8601"
    }
  ]
}
```

**Errors:**
- 401: Not authenticated
- 403: Not the owner (and not admin)
- 404: Idea not found or soft-deleted

---

### `PATCH /api/ideas/[id]`

Update an idea (title, raw_input, target_user, problem_statement).

**Auth:** Required (owner)

**Request:**
```json
{
  "title": "string (optional)",
  "raw_input": "string (optional)",
  "target_user": "string (optional)",
  "problem_statement": "string (optional)"
}
```

**Validation:** Same rules as POST. At least one field must be provided.

**Response (200):** Updated idea object.

---

### `DELETE /api/ideas/[id]`

Soft-delete an idea.

**Auth:** Required (owner)

**Response (200):**
```json
{ "message": "Idea deleted" }
```

**Notes:** Sets `deleted_at = now()`. Does not delete analysis runs or reports.

---

## Analysis Pipeline Module

### `POST /api/ideas/[id]/analyze`

Start a new analysis. Deducts credits.

**Auth:** Required (owner)

**Request:**
```json
{
  "version_id": "uuid (optional — defaults to latest version)"
}
```

**Validation:**
- User must own the idea
- User must have credit_balance >= 1 (or idea is Quick Roast being upgraded)
- Idea must not already have an active analysis (status in queued/interpreting/.../generating_report)

**Response (201):**
```json
{
  "run_id": "uuid",
  "status": "queued",
  "credits_remaining": 4
}
```

**Errors:**
- 400: Already analyzing
- 401: Not authenticated
- 402: Insufficient credits (`{ error: "insufficient_credits", message: "...", balance: 0 }`)
- 403: Not the owner
- 404: Idea not found

---

### `POST /api/pipeline/interpret`

Run pipeline step 1: interpret the raw idea.

**Auth:** Required (owner of the idea)

**Request:**
```json
{
  "run_id": "uuid"
}
```

**Validation:**
- Analysis run must exist and belong to user's idea
- Status must be `queued`

**Response (200):**
```json
{
  "status": "interpreting",
  "interpretation": {
    "problem": "string",
    "solution": "string",
    "target_user": "string",
    "business_model": "string",
    "key_assumptions": ["string"],
    "vagueness_flags": ["string"],
    "vagueness_score": 0.0
  },
  "category": "b2b_saas (from LLM inline classification — DEC-016)"
}
```

---

### `POST /api/pipeline/clarify`

Run pipeline step 2: generate clarification questions.

**Auth:** Required (owner)

**Request:**
```json
{
  "run_id": "uuid"
}
```

**Response (200):**
```json
{
  "status": "clarifying",
  "questions": [
    {
      "id": "q1",
      "question": "string",
      "dimension": "demand",
      "why_asked": "string"
    }
  ],
  "version_id": "uuid (idea_version with questions stored)"
}
```

---

### `POST /api/ideas/[id]/clarify`

Submit clarification answers. Resumes pipeline.

**Auth:** Required (owner)

**Request:**
```json
{
  "version_id": "uuid",
  "answers": [
    { "question_id": "q1", "answer": "string" }
  ],
  "skip": false
}
```

**Validation:**
- If `skip` is false, at least one answer must be provided
- If `skip` is true, answers are ignored and pipeline proceeds with assumptions

**Response (200):**
```json
{
  "status": "collecting_signals",
  "version_id": "uuid"
}
```

---

### `POST /api/pipeline/signals`

Run pipeline step 3: collect market signals.

**Auth:** Required (owner)

**Request:**
```json
{
  "run_id": "uuid"
}
```

**Response (200):**
```json
{
  "status": "collecting_signals",
  "signals_collected": 8,
  "sources_used": ["hackernews"],
  "sources_failed": []
}
```

**Notes:** Signal collection is best-effort. If a source fails, the pipeline continues with available signals. Failed sources are logged.

---

### `POST /api/pipeline/interpret-signals`

Run pipeline step 4: interpret signals with LLM.

**Auth:** Required (owner)

**Request:**
```json
{
  "run_id": "uuid"
}
```

**Response (200):**
```json
{
  "status": "interpreting_signals",
  "dimension_insights": [
    {
      "dimension": "demand",
      "signal_strength": 0.75,
      "confidence": 0.8,
      "summary": "string",
      "evidence_count": 3
    }
  ]
}
```

---

### `POST /api/pipeline/score`

Run pipeline step 5: deterministic scoring.

**Auth:** Required (owner)

**Request:**
```json
{
  "run_id": "uuid"
}
```

**Response (200):**
```json
{
  "status": "scoring",
  "scores": {
    "demand": { "score": 7.5, "weight": 0.20, "weighted": 1.50 },
    "urgency": { "score": 6.0, "weight": 0.20, "weighted": 1.20 }
  },
  "overall_score": 6.42
}
```

---

### `POST /api/pipeline/verdict`

Run pipeline step 6: determine verdict with guardrails.

**Auth:** Required (owner)

**Request:**
```json
{
  "run_id": "uuid"
}
```

**Response (200):**
```json
{
  "status": "generating_verdict",
  "verdict": "refine",
  "raw_verdict": "pursue",
  "override_applied": "high_score_unclear_distribution",
  "override_reason": "Score is high but distribution channel is unclear"
}
```

**Notes:** `raw_verdict` is the score-based verdict before guardrail overrides. If no override was applied, `override_applied` and `override_reason` are null.

---

### `POST /api/pipeline/report`

Run pipeline step 7: generate full report.

**Auth:** Required (owner)

**Request:**
```json
{
  "run_id": "uuid"
}
```

**Response (200):**
```json
{
  "status": "completed",
  "report_id": "uuid",
  "report": { "...full report JSONB shape from DB_SCHEMA.md..." }
}
```

---

### `GET /api/ideas/[id]/analysis/[runId]/status`

Poll current analysis status.

**Auth:** Required (owner or admin)

**Response (200):**
```json
{
  "run_id": "uuid",
  "status": "collecting_signals",
  "current_step": 3,
  "total_steps": 7,
  "started_at": "ISO 8601",
  "error": null
}
```

---

### `GET /api/ideas/[id]/report`

Get the latest completed report for an idea.

**Auth:** Required (owner or admin)

**Query params:**
- `run_id` (optional): specific analysis run. Defaults to latest completed.

**Response (200):**
```json
{
  "report": { "...full report content..." },
  "analysis_run": { "...analysis run metadata..." },
  "signals": [ "...signal evidence rows..." ]
}
```

**Errors:**
- 404: No completed analysis found

---

## Credits Module

### `GET /api/credits/balance`

Get current credit balance.

**Auth:** Required

**Response (200):**
```json
{
  "balance": 5,
  "plan": "free"
}
```

---

### `POST /api/credits/purchase`

Create a Razorpay order for credit purchase.

**Auth:** Required

**Request:**
```json
{
  "package_id": "pack_5 | pack_20 | pack_50"
}
```

**Validation:**
- `package_id` must match a valid package in `admin_settings.credit_packages`

**Response (200):**
```json
{
  "order_id": "razorpay_order_id",
  "amount": 9900,
  "currency": "INR",
  "key_id": "razorpay_key_id (public)"
}
```

---

### `POST /api/credits/verify`

Verify Razorpay payment and add credits.

**Auth:** Required

**Request:**
```json
{
  "razorpay_order_id": "string",
  "razorpay_payment_id": "string",
  "razorpay_signature": "string"
}
```

**Validation:**
- Verify signature using HMAC SHA256 with Razorpay key secret
- Order must exist and belong to this user

**Response (200):**
```json
{
  "credits_added": 20,
  "new_balance": 25,
  "transaction_id": "uuid"
}
```

**Errors:**
- 400: Invalid signature (payment verification failed)
- 409: Payment already processed (idempotency)

---

### `POST /api/webhooks/razorpay`

Razorpay webhook handler.

**Auth:** Razorpay webhook signature verification

**Notes:**
- Handles `payment.captured`, `payment.failed` events
- Ensures credits are added even if client-side verify was missed
- Idempotent — checks if transaction already exists before adding credits

---

### `GET /api/credits/transactions`

List credit transaction history.

**Auth:** Required

**Query params:**
- `page` (optional, default 1)
- `limit` (optional, default 20)

**Response (200):**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "purchase | deduction | signup_bonus | adjustment",
      "amount": 20,
      "balance_after": 25,
      "description": "Purchased 20 credits",
      "created_at": "ISO 8601"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

---

## Share Module

### `POST /api/share`

Create a public share link for a report.

**Auth:** Required (owner of the report's idea)

**Request:**
```json
{
  "report_id": "uuid",
  "visibility": "unlisted (default)"
}
```

**Response (201):**
```json
{
  "slug": "abc123def456",
  "url": "/report/abc123def456",
  "visibility": "unlisted"
}
```

---

### `GET /api/share/[slug]`

Fetch a shared report. No auth required.

**Response (200):**
```json
{
  "report": { "...report content..." },
  "idea_title": "string",
  "verdict": "refine",
  "overall_score": 6.1,
  "created_at": "ISO 8601",
  "is_quick_roast": false
}
```

**Side effect:** Increments `share_links.view_count`.

**Errors:**
- 404: Share link not found or expired

---

## Compare Module

### `POST /api/ideas/compare`

Compare 2-4 analyzed ideas.

**Auth:** Required

**Request:**
```json
{
  "idea_ids": ["uuid", "uuid"]
}
```

**Validation:**
- 2-4 idea IDs
- All must belong to the authenticated user
- All must have at least one completed analysis

**Response (200):**
```json
{
  "comparison": [
    {
      "idea_id": "uuid",
      "title": "string",
      "verdict": "pursue",
      "overall_score": 7.5,
      "scores": { "demand": 8.0, "urgency": 7.0, "..." : "..." }
    }
  ],
  "takeaway": "string (AI-generated comparison narrative)"
}
```

---

## User Profile Module

### `GET /api/user/profile`

Get current user profile.

**Auth:** Required

**Response (200):**
```json
{
  "id": "uuid",
  "email": "string",
  "display_name": "string | null",
  "role": "registered",
  "plan": "free",
  "credit_balance": 3,
  "created_at": "ISO 8601"
}
```

---

### `PATCH /api/user/profile`

Update profile.

**Auth:** Required

**Request:**
```json
{
  "display_name": "string (optional)"
}
```

**Notes:** Users cannot change their own role, plan, or credit_balance via this endpoint.

---

## Admin Module

> All admin endpoints require `role = 'admin'`. Return 403 for non-admin users.

### `GET /api/admin/metrics`

**Response (200):**
```json
{
  "total_users": 150,
  "total_ideas": 420,
  "total_analyses": 380,
  "completed_analyses": 350,
  "failed_analyses": 30,
  "verdict_distribution": { "pursue": 50, "refine": 120, "test_first": 100, "drop": 60, "insufficient_data": 20 },
  "signal_providers": { "hackernews": "active" }
}
```

### `GET /api/admin/jobs`

List analysis runs with filtering.

**Query params:** `status`, `page`, `limit`

**Response (200):** Paginated list of analysis_runs with idea title and user email.

### `POST /api/admin/jobs/[runId]/retry`

Retry a failed analysis run. Resets status to `queued`.

### `GET /api/admin/users`

Search and list users.

**Query params:** `search` (email or name), `page`, `limit`

### `POST /api/admin/users/[userId]/credits`

Manually adjust a user's credits.

**Request:**
```json
{
  "amount": 10,
  "description": "Manual adjustment — support ticket #123"
}
```

### `GET /api/admin/prompts`

List prompt templates with versions.

### `PATCH /api/admin/prompts/[key]`

Update a prompt template. Creates a new version.

### `GET /api/admin/moderation`

List shared content for review.

---

## Draft Status

| Module | Contract Status | Notes |
|--------|----------------|-------|
| Quick Roast | **Draft** | Rate limiting approach needs validation |
| Ideas | **Draft** | Core CRUD, stable |
| Pipeline | **Draft** | Client-driven sequential confirmed (DEC-009). Signal source = HackerNews only (DEC-011). |
| Credits | **Draft** | 3 free credits on signup confirmed (DEC-010) |
| Share | **Draft** | No PDF export in v1 (DEC-014) |
| Compare | **Draft** | AI takeaway prompt not defined |
| User Profile | **Draft** | Minimal scope |
| Admin | **Draft** | Lower priority (P1 in PRD). No SerpAPI budget tracking needed. |

All contracts are drafts. They will be finalized during the implementation phase for each module. All previously pending decisions are now resolved (see DECISIONS.md DEC-009 through DEC-016).
