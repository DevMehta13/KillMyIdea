# Claude Code Project Instructions

You are working on **Kill My Idea**, a production-grade, multi-page SaaS web application.

## Source documents

| Document | Path | Purpose |
|----------|------|---------|
| **PRD** (product source of truth) | `/docs/killMyIdea_prd.pdf` | Product vision, modules, scoring model, phased rollout |
| **Execution Plan** | `/docs/EXECUTION_PLAN.md` | Phase-by-phase build plan with dependencies and acceptance criteria |
| **Architecture** | `/docs/ARCHITECTURE.md` | Stack, app structure, auth model, pipeline execution, integrations |
| **Database Schema** | `/docs/DB_SCHEMA.md` | All entities, fields, relationships, constraints, functions |
| **API Contracts** | `/docs/API_CONTRACTS.md` | Every endpoint with request/response shapes, validation, errors |
| **UI Map** | `/docs/UI_MAP.md` | All routes, pages, components, states, permissions |
| **Decisions** | `/docs/DECISIONS.md` | Recorded decisions with rationale; pending decisions needing input |
| **Task Rules** | `/docs/TASK_RULES.md` | Phase execution discipline, testing, doc update requirements |

## Core behavior
- Always use plan-first workflow for non-trivial tasks.
- Do not start implementation immediately for large features.
- First inspect existing code, identify patterns, dependencies, and architecture.
- For new features, propose:
  - scope
  - affected files
  - data model changes (check `DB_SCHEMA.md`)
  - API changes (check `API_CONTRACTS.md`)
  - UI routes/pages (check `UI_MAP.md`)
  - risks
  - open questions
- Stop for approval before major implementation.

## Product alignment
- Treat the PRD in `/docs/killMyIdea_prd.pdf` as the product source of truth.
- Read and use the PDF PRD before making product or architecture decisions.
- If implementation conflicts with the PRD, call it out explicitly.
- Check `DECISIONS.md` for existing decisions and pending questions before making new ones.
- Prefer consistency over cleverness.
- Favor maintainable, modular code over quick hacks.

## Phase execution
- Follow `EXECUTION_PLAN.md` strictly. One approved phase at a time.
- Do not skip phase dependencies.
- Follow all rules in `TASK_RULES.md`.
- After completing each phase:
  1. Update impacted docs (schema, API, UI map, decisions)
  2. Summarize: what changed, what remains, what risks exist
  3. Verify all acceptance criteria pass

## Engineering standards
- Keep files focused and readable.
- Reuse existing abstractions before creating new ones.
- Avoid unnecessary dependencies.
- Prefer explicit types, validation, and error handling.
- Do not silently change unrelated code.
- For forms, validation, API contracts, and DB logic, be strict and explicit.
- For UI, assume the app is a full multi-page product, not a toy demo.
- Validate API inputs with Zod. Shapes must match `API_CONTRACTS.md`.
- DB schema changes must match `DB_SCHEMA.md` or update it first.

## Workflow rules
- For every meaningful task:
  1. Understand the request
  2. Inspect related files
  3. Read relevant PRD sections from `/docs/killMyIdea_prd.pdf`
  4. Check relevant docs (`ARCHITECTURE.md`, `DB_SCHEMA.md`, `API_CONTRACTS.md`, `UI_MAP.md`)
  5. Summarize current state
  6. Propose plan
  7. List questions/blockers
  8. Implement only after approval

## Output style
- Be direct.
- Be structured.
- Do not give fluffy explanations.
- When uncertain, say exactly what is uncertain.
