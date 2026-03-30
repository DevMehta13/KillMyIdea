-- Tier 2 Phase 26: Email notification opt-out
-- Users can disable email notifications (defaults to enabled)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;
