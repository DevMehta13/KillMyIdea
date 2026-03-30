-- Tier 3: Missing database indexes for query performance

-- credit_transactions: user transaction history (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS credit_transactions_user_id_created_at_idx
  ON public.credit_transactions(user_id, created_at DESC);

-- signal_evidence: lookup by analysis run (frequent join)
CREATE INDEX IF NOT EXISTS signal_evidence_analysis_run_id_idx
  ON public.signal_evidence(analysis_run_id);

-- idea_versions: lookup by idea (version history)
CREATE INDEX IF NOT EXISTS idea_versions_idea_id_idx
  ON public.idea_versions(idea_id);

-- profiles: lookup by email (auth, admin search)
CREATE INDEX IF NOT EXISTS profiles_email_idx
  ON public.profiles(email);

-- reports: lookup by idea_id (report listing)
CREATE INDEX IF NOT EXISTS reports_idea_id_idx
  ON public.reports(idea_id);

-- share_links: lookup by report_id (existing share check)
CREATE INDEX IF NOT EXISTS share_links_report_id_idx
  ON public.share_links(report_id);
