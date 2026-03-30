/**
 * API types — request/response shapes for all endpoints.
 * See API_CONTRACTS.md for full specifications.
 */

import type {
  AnalysisRunStatus,
  IdeaCategory,
  IdeaStatus,
  QuickRoastTeaser,
  ReportContent,
  Verdict,
} from './database';

// ─── Common ──────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Quick Roast ─────────────────────────────────────────────────────────────

export interface QuickRoastRequest {
  idea: string;
}

export interface QuickRoastResponse {
  id: string;
  roast: QuickRoastTeaser;
}

// ─── Ideas ───────────────────────────────────────────────────────────────────

export interface CreateIdeaRequest {
  title: string;
  raw_input: string;
  target_user?: string;
  problem_statement?: string;
  quickRoastId?: string;
}

export interface CreateIdeaResponse {
  id: string;
  title: string;
  status: IdeaStatus;
  created_at: string;
}

export interface IdeaListItem {
  id: string;
  title: string;
  status: IdeaStatus;
  category: IdeaCategory | null;
  is_quick_roast: boolean;
  latest_verdict: Verdict | null;
  latest_score: number | null;
  analysis_count: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateIdeaRequest {
  title?: string;
  raw_input?: string;
  target_user?: string;
  problem_statement?: string;
}

// ─── Analysis Pipeline ───────────────────────────────────────────────────────

export interface StartAnalysisRequest {
  version_id?: string;
}

export interface StartAnalysisResponse {
  run_id: string;
  status: AnalysisRunStatus;
  credits_remaining: number;
}

export interface PipelineStepRequest {
  run_id: string;
}

export interface AnalysisStatusResponse {
  run_id: string;
  status: AnalysisRunStatus;
  current_step: number | null;
  total_steps: number;
  completed_steps: number[]; // DEC-024
  started_at: string | null;
  error: string | null;
}

// ─── Clarification ───────────────────────────────────────────────────────────

export interface SubmitClarificationRequest {
  version_id: string;
  answers: { question_id: string; answer: string }[];
  skip: boolean;
}

// ─── Credits ─────────────────────────────────────────────────────────────────

export interface CreditBalanceResponse {
  balance: number;
  plan: string;
}

export interface PurchaseCreditsRequest {
  package_id: string;
}

export interface PurchaseCreditsResponse {
  url: string; // Stripe Checkout redirect URL
}

export interface VerifyPaymentRequest {
  session_id: string; // Stripe Checkout session ID
}

export interface VerifyPaymentResponse {
  credits_added: number;
  new_balance: number;
  transaction_id: string;
}

export interface TransactionListItem {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

// ─── Share ───────────────────────────────────────────────────────────────────

export interface CreateShareRequest {
  report_id: string;
  visibility?: string;
}

export interface CreateShareResponse {
  slug: string;
  url: string;
  visibility: string;
}

export interface SharedReportResponse {
  report: ReportContent;
  idea_title: string;
  verdict: Verdict;
  overall_score: number;
  created_at: string;
  is_quick_roast: boolean;
}

// ─── Compare ─────────────────────────────────────────────────────────────────

export interface CompareRequest {
  idea_ids: string[];
}

export interface CompareItem {
  idea_id: string;
  title: string;
  verdict: Verdict;
  overall_score: number;
  scores: Record<string, number>;
}

export interface CompareResponse {
  comparison: CompareItem[];
  takeaway: string;
}

// ─── User Profile ────────────────────────────────────────────────────────────

export interface UserProfileResponse {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  plan: string;
  credit_balance: number;
  created_at: string;
}

export interface UpdateProfileRequest {
  display_name?: string;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminMetricsResponse {
  total_users: number;
  total_ideas: number;
  total_analyses: number;
  completed_analyses: number;
  failed_analyses: number;
  verdict_distribution: Record<Verdict, number>;
  signal_providers: Record<string, string>;
}

export interface AdminCreditAdjustmentRequest {
  amount: number;
  description: string;
}

// ─── Rate Limit Error (DEC-029) ─────────────────────────────────────────────

export interface RateLimitError extends ApiError {
  retryAfter: number;
}

// ─── Report Preview (DEC-023) ───────────────────────────────────────────────

export interface ReportPreviewResponse {
  verdict: Verdict;
  overall_score: number;
  available_sections: string[];
  requires_credits: boolean;
}
