/**
 * Database types — mirrors DB_SCHEMA.md exactly.
 * All Supabase table row types and JSONB shapes.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = 'visitor' | 'registered' | 'paid' | 'admin';

export type UserPlan = 'free' | 'starter' | 'pro';

export type IdeaStatus = 'draft' | 'submitted' | 'analyzing' | 'completed' | 'failed';

export type AnalysisRunStatus =
  | 'queued'
  | 'interpreting'
  | 'clarifying'
  | 'waiting_for_clarification'
  | 'collecting_signals'
  | 'interpreting_signals'
  | 'scoring'
  | 'generating_verdict'
  | 'generating_report'
  | 'completed'
  | 'failed';

export type Verdict = 'pursue' | 'refine' | 'test_first' | 'drop' | 'insufficient_data';

export type SignalSourceType = 'hackernews' | 'llm_knowledge' | 'serper' | 'google_trends';

export type SignalCategory =
  | 'demand'
  | 'urgency'
  | 'distribution'
  | 'differentiation'
  | 'competition'
  | 'monetization'
  | 'execution';

export type IdeaCategory =
  | 'b2b_saas'
  | 'consumer_app'
  | 'devtool'
  | 'marketplace'
  | 'hardware'
  | 'fintech'
  | 'edtech'
  | 'healthtech'
  | 'creator_economy'
  | 'other';

export type CreditTransactionType =
  | 'purchase'
  | 'deduction'
  | 'refund'
  | 'adjustment'
  | 'signup_bonus';

export type ReportType = 'full' | 'quick_roast';

export type ShareVisibility = 'public' | 'unlisted';

export type ClarificationStatus = 'pending' | 'answered' | 'skipped';

// ─── JSONB Shapes ────────────────────────────────────────────────────────────

export interface StructuredSummary {
  problem: string;
  solution: string;
  target_user: string;
  business_model: string;
  key_assumptions: string[];
  vagueness_flags: string[];
  vagueness_score: number;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  dimension: SignalCategory;
  why_asked: string;
}

export interface ClarificationAnswer {
  question_id: string;
  answer: string;
}

export interface DimensionScore {
  score: number;
  weight: number;
  confidence: number;
  reasoning: string;
}

export interface AnalysisScores {
  demand: DimensionScore;
  urgency: DimensionScore;
  distribution: DimensionScore;
  differentiation: DimensionScore;
  competition: DimensionScore;
  monetization: DimensionScore;
  execution: DimensionScore;
}

export interface Assumption {
  text: string;
  type: 'user_stated' | 'inferred';
  source: string;
}

export interface RedFlag {
  text: string;
  severity: 'high' | 'medium' | 'low';
  evidence_ref: string;
}

export interface GreenFlag {
  text: string;
  strength: 'strong' | 'moderate';
  evidence_ref: string;
}

export interface NextStep {
  action: string;
  priority: number;
  type: 'test' | 'refine' | 'validate' | 'build';
}

export interface DimensionReasoning {
  dimension: SignalCategory;
  score: number;
  reasoning: string;
  evidence_refs: string[];
}

export interface ClarificationQA {
  question: string;
  answer: string;
  dimension: SignalCategory;
}

export interface ReportContent {
  executive_summary: string;
  idea_interpretation: {
    problem: string;
    solution: string;
    target_user: string;
  };
  verdict: {
    verdict: Verdict;
    score: number;
    confidence: number;
    one_liner: string;
  };
  dimension_reasoning: DimensionReasoning[];
  assumptions: Assumption[];
  red_flags: RedFlag[];
  green_flags: GreenFlag[];
  next_steps: NextStep[];
  clarification_qa?: ClarificationQA[]; // DEC-026
  weaknesses: string;
  strengthening_suggestions: string;
}

export interface QuickRoastTeaser {
  first_impression: string;
  biggest_flaw: string;
  what_to_clarify: string;
}

export interface InputSnapshot {
  title: string;
  raw_input: string;
  target_user: string | null;
  problem_statement: string | null;
  category: IdeaCategory | null;
  clarification_answers: ClarificationAnswer[] | null;
}

// ─── Table Row Types ─────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  plan: UserPlan;
  credit_balance: number;
  avatar_url: string | null;
  email_notifications: boolean; // DEC-030
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  user_id: string | null;
  title: string;
  raw_input: string;
  target_user: string | null;
  problem_statement: string | null;
  status: IdeaStatus;
  category: IdeaCategory | null;
  is_quick_roast: boolean;
  tags: string[] | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdeaVersion {
  id: string;
  idea_id: string;
  version_number: number;
  structured_summary: StructuredSummary | null;
  clarification_questions: ClarificationQuestion[] | null;
  clarification_answers: ClarificationAnswer[] | null;
  clarification_status: ClarificationStatus;
  created_at: string;
}

export interface AnalysisRun {
  id: string;
  idea_id: string;
  idea_version_id: string;
  status: AnalysisRunStatus;
  current_step: number | null;
  input_snapshot: InputSnapshot;
  scores: AnalysisScores | null;
  overall_score: number | null;
  verdict: Verdict | null;
  confidence: number | null;
  assumptions: Assumption[] | null;
  red_flags: RedFlag[] | null;
  green_flags: GreenFlag[] | null;
  override_applied: string | null;
  override_reason: string | null;
  model_used: string | null;
  credits_charged: number;
  completed_steps: number[]; // DEC-024: tracks which steps completed for retry
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignalEvidence {
  id: string;
  analysis_run_id: string;
  source_type: SignalSourceType;
  signal_category: SignalCategory | null;
  raw_data: Record<string, unknown>;
  normalized_summary: string | null;
  signal_strength: number | null;
  source_url: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  analysis_run_id: string;
  idea_id: string;
  report_type: ReportType;
  content: ReportContent;
  quick_roast_teaser: QuickRoastTeaser | null;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: CreditTransactionType;
  amount: number;
  balance_after: number;
  description: string | null;
  analysis_run_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
}

export interface ShareLink {
  id: string;
  report_id: string;
  slug: string;
  visibility: ShareVisibility;
  view_count: number;
  expires_at: string | null;
  created_at: string;
}

export interface AdminSetting {
  key: string;
  value: unknown;
  updated_at: string;
}

// ─── Insert Types (fields with DB defaults made optional) ────────────────────

export interface ProfileInsert {
  id: string;
  email: string;
  display_name?: string | null;
  role?: string;
  plan?: string;
  credit_balance?: number;
  avatar_url?: string | null;
}

export interface IdeaInsert {
  id?: string;
  user_id?: string | null;
  title: string;
  raw_input: string;
  target_user?: string | null;
  problem_statement?: string | null;
  status?: string;
  category?: string | null;
  is_quick_roast?: boolean;
  tags?: string[] | null;
}

export interface IdeaVersionInsert {
  id?: string;
  idea_id: string;
  version_number: number;
  structured_summary?: StructuredSummary | null;
  clarification_questions?: ClarificationQuestion[] | null;
  clarification_answers?: ClarificationAnswer[] | null;
  clarification_status?: string;
}

export interface AnalysisRunInsert {
  id?: string;
  idea_id: string;
  idea_version_id: string;
  status?: string;
  current_step?: number | null;
  input_snapshot: InputSnapshot;
  scores?: AnalysisScores | null;
  overall_score?: number | null;
  verdict?: string | null;
  confidence?: number | null;
  assumptions?: Assumption[] | null;
  red_flags?: RedFlag[] | null;
  green_flags?: GreenFlag[] | null;
  override_applied?: string | null;
  override_reason?: string | null;
  model_used?: string | null;
  credits_charged?: number;
  error?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface SignalEvidenceInsert {
  id?: string;
  analysis_run_id: string;
  source_type: string;
  signal_category?: string | null;
  raw_data: Record<string, unknown>;
  normalized_summary?: string | null;
  signal_strength?: number | null;
  source_url?: string | null;
}

export interface ReportInsert {
  id?: string;
  analysis_run_id: string;
  idea_id: string;
  report_type?: string;
  content: Record<string, unknown> | ReportContent;
  quick_roast_teaser?: QuickRoastTeaser | null;
}

export interface CreditTransactionInsert {
  id?: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  description?: string | null;
  analysis_run_id?: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
}

export interface ShareLinkInsert {
  id?: string;
  report_id: string;
  slug: string;
  visibility?: string;
  view_count?: number;
  expires_at?: string | null;
}

export interface AdminSettingInsert {
  key: string;
  value: unknown;
}

// ─── Database type map (for Supabase generic client) ─────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: ProfileInsert; Update: Partial<ProfileInsert> };
      ideas: { Row: Idea; Insert: IdeaInsert; Update: Partial<IdeaInsert> };
      idea_versions: { Row: IdeaVersion; Insert: IdeaVersionInsert; Update: Partial<IdeaVersionInsert> };
      analysis_runs: { Row: AnalysisRun; Insert: AnalysisRunInsert; Update: Partial<AnalysisRunInsert> };
      signal_evidence: { Row: SignalEvidence; Insert: SignalEvidenceInsert; Update: Partial<SignalEvidenceInsert> };
      reports: { Row: Report; Insert: ReportInsert; Update: Partial<ReportInsert> };
      credit_transactions: { Row: CreditTransaction; Insert: CreditTransactionInsert; Update: Partial<CreditTransactionInsert> };
      share_links: { Row: ShareLink; Insert: ShareLinkInsert; Update: Partial<ShareLinkInsert> };
      admin_settings: { Row: AdminSetting; Insert: AdminSettingInsert; Update: Partial<AdminSettingInsert> };
    };
  };
}
