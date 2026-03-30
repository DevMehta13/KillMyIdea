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

**Partial success:** If the roast is generated but storing the idea/report fails, the endpoint returns `200` with `id: null` and the roast. The client receives the roast but cannot share it.

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

**Known limitation:** `quickRoastId` is accepted by the schema but the linking logic is not implemented. The parameter is currently ignored.

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

**Query params:** None currently implemented. All ideas returned sorted by created_at DESC.

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
      "created_at": "ISO 8601",
      "updated_at": "ISO 8601"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50
}
```

**Known limitation:** Pagination, status filtering, `latest_verdict`, `latest_score`, and `analysis_count` are documented in the PRD but not yet implemented. The endpoint returns all non-deleted ideas.

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

**Known limitation:** `structured_summary` is stored in the database but not included in this response.

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

**Response (200):** Updated idea object with fields: id, title, raw_input, target_user, problem_statement, status, category. Note: `fields_changed` is not currently included in the response.

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

**Security:** All pipeline routes verify run ownership before processing. A user cannot operate on another user's analysis run.

**Reliability:** All LLM responses are validated with Zod schemas. All external API calls have timeouts (30s for LLM, 10s for signals). Gemini calls retry with exponential backoff and fall back to Groq.

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
Ownership verified: the analysis run must belong to the authenticated user's idea. Returns 403 if not.

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
  "category": "b2b_saas (from LLM inline classification — DEC-016)",
  "vagueness_blocked": false
}
```

**Vagueness blocking (DEC-021):** When `vagueness_score >= 0.7`, the response includes `"vagueness_blocked": true`. The client must route the user to clarification before calling `/api/pipeline/signals`. The pipeline signals endpoint returns `400` with `"error": "vagueness_blocked"` if the user attempts to skip.

```json
{
  "error": "vagueness_blocked",
  "message": "Idea is too vague. Complete clarification before proceeding.",
  "vagueness_score": 0.82,
  "threshold": 0.7
}
```

**Errors:**
- 400: Invalid run status or validation error
- 401: Not authenticated
- 403: Analysis run does not belong to authenticated user
- 404: Analysis run not found
- 500: LLM call failed

---

### `POST /api/pipeline/clarify`

Run pipeline step 2: generate clarification questions.

**Auth:** Required (owner)
Ownership verified: returns 403 if the run does not belong to the authenticated user.

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

**Errors:**
- 400: Invalid run status or validation error
- 401: Not authenticated
- 403: Analysis run does not belong to authenticated user
- 404: Analysis run not found
- 500: LLM call failed

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
Ownership verified: returns 403 if the run does not belong to the authenticated user.

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
  "signals_collected": 14,
  "sources_used": ["hackernews", "serper", "google_trends"],
  "sources_failed": []
}
```

**Notes:**
- Signal collection is best-effort. If a source fails, the pipeline continues with available signals. Failed sources are logged.
- Serper.dev requires `SERPER_API_KEY` env var. If not set or quota exhausted, skipped gracefully (DEC-018).
- SerpAPI Trends requires `SERPAPI_KEY` env var. If not set or quota exhausted, skipped gracefully (DEC-019).
- Returns `400` with `"error": "vagueness_blocked"` if vagueness threshold not cleared (DEC-021).

**Errors:**
- 400: Invalid run status, validation error, or vagueness blocked
- 401: Not authenticated
- 403: Analysis run does not belong to authenticated user
- 404: Analysis run not found
- 500: Signal collection failed

---

### `POST /api/pipeline/interpret-signals`

Run pipeline step 4: interpret signals with LLM.

**Auth:** Required (owner)
Ownership verified: returns 403 if the run does not belong to the authenticated user.

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

**Errors:**
- 400: Invalid run status or validation error
- 401: Not authenticated
- 403: Analysis run does not belong to authenticated user
- 404: Analysis run not found
- 500: LLM call failed

---

### `POST /api/pipeline/score`

Run pipeline step 5: deterministic scoring.

**Auth:** Required (owner)
Ownership verified: returns 403 if the run does not belong to the authenticated user.

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

**Errors:**
- 400: Invalid run status or validation error
- 401: Not authenticated
- 403: Analysis run does not belong to authenticated user
- 404: Analysis run not found
- 500: Scoring computation failed

---

### `POST /api/pipeline/verdict`

Run pipeline step 6: determine verdict with guardrails.

**Auth:** Required (owner)
Ownership verified: returns 403 if the run does not belong to the authenticated user.

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

**Errors:**
- 400: Invalid run status or validation error
- 401: Not authenticated
- 403: Analysis run does not belong to authenticated user
- 404: Analysis run not found
- 500: Verdict computation failed

---

### `POST /api/pipeline/report`

Run pipeline step 7: generate full report.

**Auth:** Required (owner)
Ownership verified: returns 403 if the run does not belong to the authenticated user.

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

**Errors:**
- 400: Invalid run status or validation error
- 401: Not authenticated
- 403: Analysis run does not belong to authenticated user
- 404: Analysis run not found
- 500: Report generation failed

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
  "completed_steps": [1, 2, 3],
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
- `preview` (optional): if `true`, returns limited data for teaser/upsell (DEC-023)

**Response (200) — full mode:**
```json
{
  "report": { "...full report content..." },
  "analysis_run": { "...analysis run metadata..." },
  "signals": [ "...signal evidence rows..." ]
}
```

**Response (200) — preview mode (`?preview=true`):**
```json
{
  "verdict": "refine",
  "overall_score": 6.2,
  "available_sections": ["executive_summary", "verdict", "dimension_reasoning", "assumptions", "flags", "next_steps", "evidence"],
  "requires_credits": true
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

Create a Stripe Checkout session for credit purchase.

**Auth:** Required

**Request:**
```json
{
  "package_id": "pack_5 | pack_20 | pack_50"
}
```

**Validation:**
- `package_id` must match a valid package in constants

**Response (200):**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**Notes:** Client redirects to the returned URL. Stripe handles the payment UI. On success, Stripe redirects back to `/settings/billing?payment=success&session_id={CHECKOUT_SESSION_ID}`.

---

### `POST /api/credits/verify`

Verify a Stripe Checkout session and add credits.

**Auth:** Required

**Request:**
```json
{
  "session_id": "cs_test_..."
}
```

**Validation:**
- Retrieve session from Stripe API
- Check `payment_status === 'paid'`
- Verify `metadata.user_id` matches authenticated user
- Idempotency: check if session_id already exists in credit_transactions

**Response (200):**
```json
{
  "credits_added": 20,
  "new_balance": 25,
  "transaction_id": "cs_test_..."
}
```

**Errors:**
- 400: Payment not completed
- 403: Session belongs to different user
- 409: Payment already processed (idempotency)

---

### `POST /api/webhooks/stripe`

Stripe webhook handler.

**Auth:** Stripe webhook signature verification (`stripe-signature` header)

**Notes:**
- Handles `checkout.session.completed` events
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

**Known bug:** Signal evidence query uses `shareLink.report_id` instead of the analysis run's ID to fetch `signal_evidence`. This means signals may be empty for shared full reports.

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

**Response (200):**
```json
{
  "new_balance": 15
}
```

### `GET /api/admin/prompts`

List all admin settings (key-value pairs from `admin_settings` table).

**Response (200):**
```json
{
  "settings": [
    {
      "key": "free_signup_credits",
      "value": 3,
      "updated_at": "ISO 8601"
    }
  ]
}
```

### `PATCH /api/admin/prompts`

Upsert an admin setting. Creates or updates a key-value pair.

**Request:**
```json
{
  "key": "string (required)",
  "value": "any (required)"
}
```

**Response (200):**
```json
{
  "key": "string",
  "value": "any",
  "updated_at": "ISO 8601"
}
```

**Note:** Despite the `/prompts` URL path, this endpoint manages generic admin settings (prompt templates, feature flags, scoring weights, etc.) via the `admin_settings` table. There is no prompt versioning — upsert overwrites the previous value.

### `GET /api/admin/moderation`

List shared content for review. Returns the 50 most recent share links with associated report and idea data.

**Response (200):**
```json
{
  "shares": [
    {
      "id": "uuid",
      "slug": "string",
      "visibility": "unlisted | public",
      "view_count": 0,
      "created_at": "ISO 8601",
      "reports": { "report_type": "string", "idea_id": "uuid" },
      "ideas": { "title": "string", "user_id": "uuid | null" }
    }
  ]
}
```

---

## Feedback Module

### `POST /api/feedback`

Submit feedback on analysis quality. Rate limited: 5 per hour per user.

**Auth:** Required

**Rate limit:** 5 requests per user per hour

**Request:**
```json
{
  "analysis_run_id": "uuid (optional — link to specific analysis)",
  "type": "inaccurate | unhelpful | other",
  "message": "string (optional, max 2000 chars)"
}
```

**Response (201):**
```json
{
  "status": "submitted"
}
```

**Errors:**
- 400: Validation error (invalid type, message too long)
- 401: Not authenticated
- 429: Rate limit exceeded
- 500: Database error

---

## Implementation Status

| Module | Contract Status | Notes |
|--------|----------------|-------|
| Quick Roast | **Implemented** | Rate limiting active. Partial success behavior on storage failure. |
| Ideas | **Implemented** | Pagination and enriched fields not yet implemented. |
| Pipeline | **Implemented** | Client-driven sequential (DEC-009). 4 signal sources active. |
| Credits | **Implemented** | Stripe Checkout flow. Legacy Razorpay column names. |
| Share | **Implemented** | PDF export available via @react-pdf/renderer (DEC-027). |
| Compare | **Implemented** | AI takeaway via LLM. |
| User Profile | **Implemented** | Display name only. |
| Admin | **Implemented** | Settings management via admin_settings table. |
| Feedback | **Implemented** | Quality reports with rate limiting (DEC-039). |

**Rate limit errors (DEC-029):** Any endpoint may return `429 Too Many Requests` with body:
```json
{
  "error": "rate_limited",
  "message": "Too many requests. Try again later.",
  "retryAfter": 45
}
```

**Report JSONB note (DEC-026):** Report `content` JSONB may include `clarification_qa` array: `[{ "question": "...", "answer": "...", "dimension": "demand" }]`

All modules are implemented. Known limitations and bugs are documented inline. All previously pending decisions are now resolved (see DECISIONS.md DEC-009 through DEC-016).
