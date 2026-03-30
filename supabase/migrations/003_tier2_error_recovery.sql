-- Tier 2 Phase 20: Error recovery — track completed pipeline steps for retry
-- Allows users to retry from the failed step instead of restarting from step 1

ALTER TABLE public.analysis_runs
  ADD COLUMN IF NOT EXISTS completed_steps integer[] DEFAULT '{}';
