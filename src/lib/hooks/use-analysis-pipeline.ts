'use client';

/**
 * Client-side pipeline orchestrator hook (DEC-009).
 * Drives the 7-step analysis by calling each API route sequentially.
 * Takes an existing runId (created by /analyze endpoint) — does NOT create new runs.
 */

import { useState, useCallback, useRef } from 'react';
import { PIPELINE_STEPS, TOTAL_PIPELINE_STEPS } from '@/lib/constants';
import type { PipelineStepStatus } from '@/types/pipeline';

const STEP_ROUTES: Record<number, string> = {
  1: 'interpret',
  2: 'clarify',
  3: 'signals',
  4: 'interpret-signals',
  5: 'score',
  6: 'verdict',
  7: 'report',
};

type PipelinePhase =
  | 'idle'
  | 'running'
  | 'waiting_for_clarification'
  | 'completed'
  | 'failed';

interface PipelineState {
  phase: PipelinePhase;
  steps: PipelineStepStatus[];
  currentStep: number;
  error: string | null;
  clarificationQuestions: unknown[] | null;
  versionId: string | null;
  vaguenessBlocked: boolean;
  vaguenessScore: number | null;
}

const initialSteps: PipelineStepStatus[] = PIPELINE_STEPS.map((s) => ({
  step: s.step,
  name: s.name,
  status: 'pending',
}));

async function callStep(route: string, runId: string) {
  const res = await fetch(`/api/pipeline/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id: runId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Pipeline step failed' }));
    throw new Error(err.message || `Step ${route} failed with ${res.status}`);
  }
  return res.json();
}

export function useAnalysisPipeline() {
  const [state, setState] = useState<PipelineState>({
    phase: 'idle',
    steps: initialSteps,
    currentStep: 0,
    error: null,
    clarificationQuestions: null,
    versionId: null,
    vaguenessBlocked: false,
    vaguenessScore: null,
  });

  // Prevent double-execution from React Strict Mode
  const runningRef = useRef(false);
  const runSignalsToReportRef = useRef<(runId: string) => Promise<void>>(undefined);

  const updateStep = useCallback((step: number, status: PipelineStepStatus['status'], error?: string) => {
    setState((prev) => ({
      ...prev,
      currentStep: step,
      steps: prev.steps.map((s) =>
        s.step === step ? { ...s, status, error } : s
      ),
    }));
  }, []);

  /**
   * Run steps 3-7 (signals → report) for an existing run.
   * Called after clarification or when no questions needed.
   */
  const runSignalsToReport = useCallback(async (runId: string) => {
    if (runningRef.current && state.phase !== 'running') {
      // Reset running state for resume
      runningRef.current = true;
      setState((prev) => ({ ...prev, phase: 'running', clarificationQuestions: null }));
    }
    if (!runningRef.current) {
      runningRef.current = true;
      setState((prev) => ({ ...prev, phase: 'running', clarificationQuestions: null }));
    }

    try {
      // Step 3: Collect signals
      updateStep(3, 'active');
      await callStep('signals', runId);
      updateStep(3, 'completed');

      // Step 4: Interpret signals
      updateStep(4, 'active');
      await callStep('interpret-signals', runId);
      updateStep(4, 'completed');

      // Step 5: Score
      updateStep(5, 'active');
      await callStep('score', runId);
      updateStep(5, 'completed');

      // Step 6: Verdict
      updateStep(6, 'active');
      await callStep('verdict', runId);
      updateStep(6, 'completed');

      // Step 7: Report
      updateStep(7, 'active');
      await callStep('report', runId);
      updateStep(7, 'completed');

      setState((prev) => ({ ...prev, phase: 'completed' }));
    } catch (error) {
      const msg = (error as Error).message;
      setState((prev) => ({ ...prev, phase: 'failed', error: msg }));
    } finally {
      runningRef.current = false;
    }
  }, [updateStep, state.phase]);

  // Keep ref in sync so runInterpretAndClarify can call without circular dep
  runSignalsToReportRef.current = runSignalsToReport;

  /**
   * Run steps 1-2 (interpret + clarify) for an existing run.
   * Does NOT call /analyze — the run must already exist.
   */
  const runInterpretAndClarify = useCallback(async (runId: string) => {
    if (runningRef.current) return;
    runningRef.current = true;

    setState((prev) => ({
      ...prev,
      phase: 'running',
      steps: initialSteps,
      currentStep: 0,
      error: null,
      clarificationQuestions: null,
      versionId: null,
      vaguenessBlocked: false,
      vaguenessScore: null,
    }));

    try {
      // Step 1: Interpret
      updateStep(1, 'active');
      const interpretResult = await callStep('interpret', runId);
      updateStep(1, 'completed');

      // Capture vagueness gate result (DEC-021)
      const isVaguenessBlocked = interpretResult.vagueness_blocked === true;
      const vagScore = interpretResult.interpretation?.vagueness_score ?? null;
      if (isVaguenessBlocked) {
        setState((prev) => ({
          ...prev,
          vaguenessBlocked: true,
          vaguenessScore: vagScore,
        }));
      }

      // Step 2: Clarify
      updateStep(2, 'active');
      const clarifyResult = await callStep('clarify', runId);
      updateStep(2, 'completed');

      // Pause for user clarification if questions exist
      if (clarifyResult.questions && clarifyResult.questions.length > 0) {
        setState((prev) => ({
          ...prev,
          phase: 'waiting_for_clarification',
          clarificationQuestions: clarifyResult.questions,
          versionId: clarifyResult.version_id,
        }));
        runningRef.current = false;
        return;
      }

      // No questions — continue to steps 3-7
      await runSignalsToReportRef.current?.(runId);
    } catch (error) {
      const msg = (error as Error).message;
      setState((prev) => ({ ...prev, phase: 'failed', error: msg }));
      runningRef.current = false;
    }
  }, [updateStep]);

  /**
   * Retry from the failed step (DEC-024).
   * Fetches completed_steps from the server, marks them in UI,
   * and resumes from the first incomplete step.
   */
  const retryFromFailedStep = useCallback(async (runId: string) => {
    if (runningRef.current) return;
    runningRef.current = true;

    try {
      // Fetch current analysis status to get completed_steps
      const statusRes = await fetch(`/api/ideas/_/analysis/${runId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const statusData = statusRes.ok ? await statusRes.json() : null;
      const completedSteps: number[] = statusData?.completed_steps ?? [];

      // Build step UI state: mark completed steps, find first incomplete
      const stepsState: PipelineStepStatus[] = PIPELINE_STEPS.map((s) => ({
        step: s.step,
        name: s.name,
        status: completedSteps.includes(s.step) ? 'completed' as const : 'pending' as const,
      }));

      setState((prev) => ({
        ...prev,
        phase: 'running',
        steps: stepsState,
        error: null,
        clarificationQuestions: null,
      }));

      // Find first incomplete step
      let startStep = 1;
      for (let i = 1; i <= TOTAL_PIPELINE_STEPS; i++) {
        if (!completedSteps.includes(i)) {
          startStep = i;
          break;
        }
      }

      // If steps 1-2 need retrying, use the existing flow
      if (startStep <= 2) {
        runningRef.current = false;
        await runInterpretAndClarify(runId);
        return;
      }

      // Run from startStep through step 7
      for (let step = startStep; step <= TOTAL_PIPELINE_STEPS; step++) {
        const route = STEP_ROUTES[step];
        if (!route) continue;

        updateStep(step, 'active');
        await callStep(route, runId);
        updateStep(step, 'completed');
      }

      setState((prev) => ({ ...prev, phase: 'completed' }));
    } catch (error) {
      const msg = (error as Error).message;
      setState((prev) => ({ ...prev, phase: 'failed', error: msg }));
    } finally {
      runningRef.current = false;
    }
  }, [updateStep, runInterpretAndClarify]);

  const reset = useCallback(() => {
    runningRef.current = false;
    setState({
      phase: 'idle',
      steps: initialSteps,
      currentStep: 0,
      error: null,
      clarificationQuestions: null,
      versionId: null,
      vaguenessBlocked: false,
      vaguenessScore: null,
    });
  }, []);

  return {
    ...state,
    runInterpretAndClarify,
    runSignalsToReport,
    retryFromFailedStep,
    reset,
  };
}
