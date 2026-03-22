# Task Rules

Rules governing how this project is built. All contributors (human and AI) must follow these.

---

## Phase Execution

1. **One approved phase at a time.** Do not start a phase until the previous phase is complete and verified.
2. **Do not skip phase dependencies.** Each phase in `EXECUTION_PLAN.md` lists its dependencies. If a dependency is incomplete, stop.
3. **Get explicit approval before starting each phase.** Summarize what will be built, then wait for "go."
4. **No broad uncontrolled implementation.** If a phase involves more than ~10 files, break it into sub-steps and checkpoint after each.

## During Implementation

5. **Read before writing.** Before modifying any file, read it. Before creating a new file, check if a similar one exists.
6. **Follow existing patterns.** If the codebase already has a convention (naming, file structure, API shape), follow it unless there's a documented reason to change.
7. **Validate against the PRD.** Before implementing any product logic, re-read the relevant PRD section from `/docs/killMyIdea_prd.pdf`. If implementation conflicts with the PRD, stop and flag it.
8. **Do not invent hidden requirements.** If the PRD does not specify a behavior, do not add it silently. Document it in `DECISIONS.md` as an assumption and get approval.
9. **Do not silently change unrelated code.** Stay within the scope of the current phase.

## When Ambiguity Arises

10. **If docs conflict, stop and ask.** Do not resolve conflicts by guessing. Flag the conflict with exact references to both documents.
11. **If the PRD is ambiguous on architecture, data, or contracts, stop and ask.** Minor UI details can use best judgment. Anything affecting data model, API shape, or business logic requires explicit approval.
12. **Mark assumptions clearly.** If you must proceed with an assumption, mark it as `[ASSUMPTION]` in code comments and add it to `DECISIONS.md`.

## After Each Phase

13. **Update impacted docs.** After completing a phase, update any affected documents:
    - `EXECUTION_PLAN.md` — mark phase complete, note any deviations
    - `ARCHITECTURE.md` — if structure changed
    - `DB_SCHEMA.md` — if tables/fields changed
    - `API_CONTRACTS.md` — if endpoints changed
    - `UI_MAP.md` — if routes/pages changed
    - `DECISIONS.md` — if new decisions were made
14. **Post-phase summary.** After each phase, produce a summary:
    - What was built (deliverables)
    - What changed from the plan (deviations)
    - What remains (next phase preview)
    - What risks exist (blockers, concerns)
15. **Test before closing.** Each phase has acceptance criteria in `EXECUTION_PLAN.md`. All must pass before the phase is considered complete.

## PRD Alignment

16. **The PRD (`/docs/killMyIdea_prd.pdf`) is the product source of truth.** If the execution plan, architecture doc, or any other doc conflicts with the PRD, the PRD wins unless a deviation is explicitly approved and recorded in `DECISIONS.md`.
17. **Respect P0/P1/P2 priorities.** Do not build P2 features before all P0 features in the current PRD phase are complete.
18. **Respect "What the product must not do" (PRD Section 6).** These are hard constraints:
    - Must not pretend to predict startup success with certainty
    - Must not issue polished verdicts for vague ideas without forcing clarification
    - Must not become a full founder operating system in v1
    - Must not hide weak evidence behind confident language

## Signal & Provider Architecture

19. **Signal collection must be modular.** All signal providers implement a common interface (`src/lib/pipeline/signals/types.ts`). Adding or removing a provider must not require changes to pipeline steps, scoring, or report generation (DEC-011).
20. **HackerNews is the only required v1 provider.** Do not add SerpAPI, Reddit, or other paid providers unless explicitly approved. The pipeline must work with HackerNews alone.
21. **Signal failure must not kill the analysis.** If a signal provider is unavailable, continue the pipeline with remaining evidence (user input, LLM interpretation, clarification answers). Lower confidence on affected dimensions and show a partial-signal warning in the report. Only the existing "4+ low-confidence dimensions" guardrail should produce Insufficient Data — never a single provider failure (DEC-011).
22. **Apply category-source affinity.** When HackerNews signals are weak because the idea category is outside HN's natural strength (e.g., healthcare, hardware), reduce community-signal impact on scoring rather than penalizing the idea. The scoring engine must use the category-source affinity map (DEC-011).
23. **Category classification uses LLM inline.** Do not add HuggingFace, ML model loading, or Python dependencies for classification unless explicitly approved (DEC-016).
24. **Enforce fixed category taxonomy.** The LLM must classify into the defined 10-class enum only. Never allow freeform categories.
25. **Category must be stable across reruns.** Persist the selected category in `analysis_runs.input_snapshot`. On rerun of an unchanged idea, reuse the previous category. Only reclassify if the user materially edits the idea (title, raw_input, or problem_statement).
26. **Category weighting is secondary.** Category-based weight adjustments (±3% per dimension) must never override direct signal evidence. They are a modifier, not a driver.

## Code Quality

27. **Keep files focused.** One component per file. One concern per module.
28. **Validate all external input.** API routes must validate request bodies with Zod schemas.
29. **Use explicit types.** No `any` types. No implicit type coercion.
30. **Prefer existing abstractions.** Check `src/components/ui/` and `src/lib/` before creating new utilities.
31. **No hardcoded fake data in components.** Use proper data fetching, loading states, and empty states.
