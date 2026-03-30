-- Tier 1: Expand signal_evidence source_type to support new providers
-- Fixes bug: llm_knowledge was being inserted but not in CHECK constraint
-- Adds: serper (web search), google_trends (trend data)

ALTER TABLE public.signal_evidence
  DROP CONSTRAINT IF EXISTS signal_evidence_source_type_check;

ALTER TABLE public.signal_evidence
  ADD CONSTRAINT signal_evidence_source_type_check
  CHECK (source_type IN ('hackernews', 'llm_knowledge', 'serper', 'google_trends'));
