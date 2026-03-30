-- Tier 4 Phase 38: User feedback on analysis quality

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  analysis_run_id uuid REFERENCES public.analysis_runs(id),
  type text NOT NULL CHECK (type IN ('inaccurate', 'unhelpful', 'other')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY feedback_insert ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only admins can read all feedback
CREATE POLICY feedback_read_admin ON public.feedback
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
