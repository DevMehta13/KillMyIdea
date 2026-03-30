/**
 * Pipeline types — input/output shapes for each of the 7 pipeline steps.
 * See ARCHITECTURE.md Pipeline Execution Model.
 */

import type {
  AnalysisScores,
  Assumption,
  ClarificationQA,
  ClarificationQuestion,
  GreenFlag,
  IdeaCategory,
  InputSnapshot,
  RedFlag,
  ReportContent,
  SignalCategory,
  StructuredSummary,
  Verdict,
} from './database';

// ─── Step 1: Interpret ───────────────────────────────────────────────────────

export interface InterpretInput {
  run_id: string;
  raw_input: string;
  target_user: string | null;
  problem_statement: string | null;
  preserve_category?: IdeaCategory | null; // DEC-025: skip classification if provided
}

export interface InterpretOutput {
  interpretation: StructuredSummary;
  category: IdeaCategory;
}

// ─── Step 2: Clarify ─────────────────────────────────────────────────────────

export interface ClarifyInput {
  run_id: string;
  interpretation: StructuredSummary;
}

export interface ClarifyOutput {
  questions: ClarificationQuestion[];
  version_id: string;
}

// ─── Step 3: Collect Signals ─────────────────────────────────────────────────

export interface CollectSignalsInput {
  run_id: string;
  interpretation: StructuredSummary;
  category: IdeaCategory;
  clarification_answers: { question_id: string; answer: string }[] | null;
}

export interface SignalResult {
  source_type: string;
  signal_category: SignalCategory | null;
  raw_data: Record<string, unknown>;
  normalized_summary: string | null;
  source_url: string | null;
}

export interface CollectSignalsOutput {
  signals_collected: number;
  sources_used: string[];
  sources_failed: string[];
  signals: SignalResult[];
}

// ─── Step 4: Interpret Signals ───────────────────────────────────────────────

export interface InterpretSignalsInput {
  run_id: string;
  interpretation: StructuredSummary;
  category: IdeaCategory;
  signals: SignalResult[];
}

export interface DimensionInsight {
  dimension: SignalCategory;
  signal_strength: number;
  baseline_strength: number;  // Pre-computed from countable evidence (DEC-020)
  confidence: number;
  summary: string;
  evidence_count: number;
  evidence_urls: string[];    // Real URLs backing this dimension (DEC-022)
}

export interface InterpretSignalsOutput {
  dimension_insights: DimensionInsight[];
}

// ─── Step 5: Score ───────────────────────────────────────────────────────────

export interface ScoreInput {
  run_id: string;
  dimension_insights: DimensionInsight[];
  category: IdeaCategory;
}

export interface ScoreOutput {
  scores: AnalysisScores;
  overall_score: number;
}

// ─── Step 6: Verdict ─────────────────────────────────────────────────────────

export interface VerdictInput {
  run_id: string;
  scores: AnalysisScores;
  overall_score: number;
  /** Total number of external signals collected in Step 3. Used by guardrails. */
  total_signal_count?: number;
}

export interface VerdictOutput {
  verdict: Verdict;
  raw_verdict: Verdict;
  override_applied: string | null;
  override_reason: string | null;
}

// ─── Step 7: Report ──────────────────────────────────────────────────────────

export interface ReportInput {
  run_id: string;
  input_snapshot: InputSnapshot;
  interpretation: StructuredSummary;
  scores: AnalysisScores;
  overall_score: number;
  verdict: Verdict;
  assumptions: Assumption[];
  red_flags: RedFlag[];
  green_flags: GreenFlag[];
  signals: SignalResult[];
  clarification_qa?: ClarificationQA[]; // DEC-026
}

export interface ReportOutput {
  report_id: string;
  report: ReportContent;
}

// ─── Pipeline Status ─────────────────────────────────────────────────────────

export interface PipelineStepStatus {
  step: number;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  error?: string;
}

// ─── Evidence Quantification (DEC-020) ──────────────────────────────────────

export interface EvidenceBaseline {
  dimension: SignalCategory;
  baseline_strength: number;
  contributing_signals: number;
  has_real_urls: boolean;
  signal_sources: string[];
}

// ─── Vagueness Gate (DEC-021) ───────────────────────────────────────────────

export interface VaguenessGateResult {
  blocked: boolean;
  vagueness_score: number;
  threshold: number;
  vagueness_flags: string[];
}
